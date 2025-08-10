"""WebSocket endpoints for real-time embedding task updates"""

import logging
import json
import asyncio
from typing import Dict, Set
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.embedding_task_service import embedding_task_service
from core.security import get_security_manager
from core.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"],
)

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.task_subscriptions: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        logger.info(f"Client {client_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        """Remove a WebSocket connection"""
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        
        # Remove from task subscriptions
        for task_id in list(self.task_subscriptions.keys()):
            self.task_subscriptions[task_id].discard(websocket)
            if not self.task_subscriptions[task_id]:
                del self.task_subscriptions[task_id]
        
        logger.info(f"Client {client_id} disconnected from WebSocket")
    
    async def subscribe_to_task(self, websocket: WebSocket, task_id: str):
        """Subscribe a WebSocket to task updates"""
        if task_id not in self.task_subscriptions:
            self.task_subscriptions[task_id] = set()
        self.task_subscriptions[task_id].add(websocket)
        logger.info(f"WebSocket subscribed to task {task_id}")
    
    async def unsubscribe_from_task(self, websocket: WebSocket, task_id: str):
        """Unsubscribe a WebSocket from task updates"""
        if task_id in self.task_subscriptions:
            self.task_subscriptions[task_id].discard(websocket)
            if not self.task_subscriptions[task_id]:
                del self.task_subscriptions[task_id]
        logger.info(f"WebSocket unsubscribed from task {task_id}")
    
    async def send_task_update(self, task_id: str, data: Dict):
        """Send update to all clients subscribed to a task"""
        if task_id in self.task_subscriptions:
            disconnected = []
            for websocket in self.task_subscriptions[task_id]:
                try:
                    await websocket.send_json({
                        "type": "task_update",
                        "task_id": task_id,
                        "data": data
                    })
                except Exception as e:
                    logger.error(f"Failed to send update to WebSocket: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected clients
            for ws in disconnected:
                self.task_subscriptions[task_id].discard(ws)
    
    async def broadcast_to_user(self, user_id: str, data: Dict):
        """Broadcast message to all connections for a user"""
        if user_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(data)
                except Exception as e:
                    logger.error(f"Failed to broadcast to WebSocket: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected clients
            for ws in disconnected:
                self.active_connections[user_id].discard(ws)

# Global connection manager
manager = ConnectionManager()


@router.websocket("/embedding-tasks")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="Authentication token")
):
    """
    WebSocket endpoint for real-time embedding task updates.
    
    Clients can:
    - Subscribe to specific task updates
    - Receive real-time progress notifications
    - Get completion/failure notifications
    
    Message format:
    - Subscribe: {"action": "subscribe", "task_id": "..."}
    - Unsubscribe: {"action": "unsubscribe", "task_id": "..."}
    - Ping: {"action": "ping"}
    """
    client_id = None
    
    try:
        # Verify token
        security_manager = get_security_manager()
        try:
            token_data = security_manager.verify_token(token)
            user_id = token_data.user_id
        except Exception:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        client_id = user_id
        await manager.connect(websocket, client_id)
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "WebSocket connection established"
        })
        
        # Start background task for sending updates
        update_task = asyncio.create_task(
            send_periodic_updates(websocket, client_id)
        )
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_json()
                action = data.get("action")
                
                if action == "subscribe":
                    task_id = data.get("task_id")
                    if task_id:
                        await manager.subscribe_to_task(websocket, task_id)
                        
                        # Send current task status
                        task_status = await embedding_task_service.get_task_progress(task_id)
                        await websocket.send_json({
                            "type": "subscription_confirmed",
                            "task_id": task_id,
                            "current_status": task_status
                        })
                
                elif action == "unsubscribe":
                    task_id = data.get("task_id")
                    if task_id:
                        await manager.unsubscribe_from_task(websocket, task_id)
                        await websocket.send_json({
                            "type": "unsubscribed",
                            "task_id": task_id
                        })
                
                elif action == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": asyncio.get_event_loop().time()
                    })
                
                elif action == "get_queue_status":
                    queue_status = await embedding_task_service.get_queue_status()
                    await websocket.send_json({
                        "type": "queue_status",
                        "data": queue_status
                    })
                
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown action: {action}"
                    })
            
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=4000, reason=str(e))
        except:
            pass
    finally:
        if client_id:
            manager.disconnect(websocket, client_id)
        if 'update_task' in locals():
            update_task.cancel()


async def send_periodic_updates(websocket: WebSocket, client_id: str):
    """Send periodic updates for subscribed tasks"""
    try:
        while True:
            # Get all subscribed tasks for this WebSocket
            subscribed_tasks = []
            for task_id, websockets in manager.task_subscriptions.items():
                if websocket in websockets:
                    subscribed_tasks.append(task_id)
            
            # Send updates for each subscribed task
            for task_id in subscribed_tasks:
                try:
                    progress = await embedding_task_service.get_task_progress(task_id)
                    if progress.get('status') != 'not_found':
                        await websocket.send_json({
                            "type": "progress_update",
                            "task_id": task_id,
                            "data": progress
                        })
                except Exception as e:
                    logger.error(f"Failed to send progress update for task {task_id}: {e}")
            
            # Wait before next update
            await asyncio.sleep(2)  # Send updates every 2 seconds
    
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error in periodic update task: {e}")


# Helper functions for sending notifications from the service
async def notify_task_progress(task_id: str, progress_data: Dict):
    """Send progress notification to subscribed clients"""
    await manager.send_task_update(task_id, {
        "type": "progress",
        **progress_data
    })


async def notify_task_completion(task_id: str, result_data: Dict):
    """Send completion notification to subscribed clients"""
    await manager.send_task_update(task_id, {
        "type": "completed",
        **result_data
    })


async def notify_task_failure(task_id: str, error_data: Dict):
    """Send failure notification to subscribed clients"""
    await manager.send_task_update(task_id, {
        "type": "failed",
        **error_data
    })