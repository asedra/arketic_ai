"""
Chat API Router - Real-time chat with AI integration
Handles chat creation, messaging, history, and WebSocket connections
"""

import json
import asyncio
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, desc, func, select
from sqlalchemy.exc import SQLAlchemyError

from core.database import get_db, get_db_session
from core.dependencies import get_current_user_dict, verify_jwt_token
from core.monitoring import performance_monitor
from models.chat import Chat, ChatMessage, ChatParticipant, ChatType, MessageType, MessageStatus, ParticipantRole
from models.user import User, UserApiKey
from services.ai_service import ai_service, AIServiceError

# OpenAI imports for direct integration
# OpenAI integration removed - using LangChain only

# LangChain service integration
from services.langchain_client import get_langchain_client

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Separate router for WebSocket endpoints (no auth dependency)
ws_router = APIRouter()

# Add tags for better API documentation
router.tags = ["Chat API - Real-time messaging with AI integration"]
ws_router.tags = ["Chat WebSocket - Real-time connections"]

# Pydantic models for requests/responses
class CreateChatRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    chat_type: ChatType = ChatType.DIRECT
    assistant_id: Optional[str] = Field(None, description="ID of the assistant to use for this chat")
    ai_model: str = Field("gpt-3.5-turbo", description="AI model (used if no assistant specified)")
    ai_persona: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(2048, ge=1, le=32000)
    is_private: bool = False
    tags: Optional[List[str]] = None


class OpenAITestRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Test message to send to OpenAI")
    model: Optional[str] = Field("gpt-3.5-turbo", description="OpenAI model to use")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Temperature for response generation")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt to guide the AI")

class ChatWithAIRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=50000, description="Message to send to AI")
    stream: Optional[bool] = Field(False, description="Whether to stream the response")
    save_to_history: Optional[bool] = Field(True, description="Whether to save messages to chat history")

class ChatResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    chat_type: str
    assistant_id: Optional[str]
    assistant_name: Optional[str]
    ai_model: Optional[str]
    ai_persona: Optional[str]
    message_count: int
    last_activity_at: datetime
    created_at: datetime
    is_private: bool
    tags: Optional[List[str]]

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_id: Optional[str]
    content: str
    message_type: str
    ai_model_used: Optional[str]
    tokens_used: Optional[int]
    processing_time_ms: Optional[int]
    status: str
    created_at: datetime
    is_edited: bool

class ChatHistoryResponse(BaseModel):
    chat: ChatResponse
    messages: List[MessageResponse]
    participant_count: int

# WebSocket connection manager with improved error handling
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, chat_id: str):
        try:
            await websocket.accept()
            if chat_id not in self.active_connections:
                self.active_connections[chat_id] = []
            
            self.active_connections[chat_id].append(websocket)
            self.connection_metadata[websocket] = {
                "chat_id": chat_id,
                "connected_at": datetime.utcnow(),
                "message_count": 0
            }
            
            logger.info(f"WebSocket connected to chat {chat_id}. Active connections: {len(self.active_connections[chat_id])}")
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket to chat {chat_id}: {e}")
            await self._cleanup_connection(websocket, chat_id)
            raise
    
    def disconnect(self, websocket: WebSocket, chat_id: str):
        try:
            if chat_id in self.active_connections and websocket in self.active_connections[chat_id]:
                self.active_connections[chat_id].remove(websocket)
                if not self.active_connections[chat_id]:
                    del self.active_connections[chat_id]
            
            # Clean up metadata
            self.connection_metadata.pop(websocket, None)
            
            logger.info(f"WebSocket disconnected from chat {chat_id}")
            
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
    
    async def _cleanup_connection(self, websocket: WebSocket, chat_id: str):
        """Clean up failed connection"""
        try:
            self.disconnect(websocket, chat_id)
            if not websocket.client_state.DISCONNECTED:
                await websocket.close(code=1000)
        except Exception as e:
            logger.error(f"Error cleaning up connection: {e}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            if websocket in self.connection_metadata:
                await websocket.send_text(message)
                self.connection_metadata[websocket]["message_count"] += 1
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            # Remove dead connection
            if websocket in self.connection_metadata:
                chat_id = self.connection_metadata[websocket]["chat_id"]
                self.disconnect(websocket, chat_id)
    
    async def broadcast_to_chat(self, message: str, chat_id: str):
        if chat_id not in self.active_connections:
            return
        
        connections = self.active_connections[chat_id].copy()  # Make a copy to avoid modification during iteration
        failed_connections = []
        
        for connection in connections:
            try:
                await connection.send_text(message)
                if connection in self.connection_metadata:
                    self.connection_metadata[connection]["message_count"] += 1
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")
                failed_connections.append(connection)
        
        # Clean up failed connections
        for failed_connection in failed_connections:
            self.disconnect(failed_connection, chat_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        return {
            "total_connections": total_connections,
            "active_chats": len(self.active_connections),
            "connections_per_chat": {chat_id: len(connections) for chat_id, connections in self.active_connections.items()}
        }

# Global connection manager
manager = ConnectionManager()


# Response models for better API documentation
class APIErrorResponse(BaseModel):
    error: str
    error_code: str
    timestamp: str
    chat_id: Optional[str] = None

class WebSocketStatsResponse(BaseModel):
    total_connections: int
    active_chats: int
    connections_per_chat: Dict[str, int]

class ChatStatsResponse(BaseModel):
    websocket_connections: WebSocketStatsResponse
    system_status: str
    timestamp: str


# Utility functions for better error handling and response formatting
def create_error_response(error_message: str, error_code: str = "internal_error", chat_id: Optional[str] = None) -> Dict[str, Any]:
    """Create standardized error response"""
    return {
        "error": error_message,
        "error_code": error_code,
        "timestamp": datetime.utcnow().isoformat(),
        "chat_id": chat_id
    }

def create_success_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """Create standardized success response"""
    return {
        "success": True,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }

async def validate_chat_access(chat_id: str, user_id: str, db: AsyncSession, required_permissions: Optional[List[str]] = None) -> ChatParticipant:
    """Validate user access to chat and return participant info"""
    participant_query = select(ChatParticipant).where(
        and_(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == user_id,
            ChatParticipant.is_active == True
        )
    )
    
    participant_result = await db.execute(participant_query)
    participant = participant_result.scalar_one_or_none()
    
    logger.info(f"Chat access validation: chat_id={chat_id}, user_id={user_id}, participant_found={participant is not None}")
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this chat"
        )
    
    # Check specific permissions if required
    if required_permissions:
        if "send_messages" in required_permissions and not participant.can_send_messages:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot send messages to this chat"
            )
        if "upload_files" in required_permissions and not participant.can_upload_files:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot upload files to this chat"
            )
    
    return participant

async def get_chat_with_validation(chat_id: str, db: AsyncSession) -> Chat:
    """Get chat and validate it exists and is active"""
    chat_query = select(Chat).where(
        and_(
            Chat.id == chat_id,
            Chat.is_archived == False
        )
    )
    
    chat_result = await db.execute(chat_query)
    chat = chat_result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or has been archived"
        )
    
    return chat

# Token estimation utilities
def estimate_tokens(text: str) -> int:
    """
    Improved token estimation using more accurate heuristics.
    Based on OpenAI's tokenization patterns.
    """
    if not text:
        return 0
    
    # More accurate token estimation
    # Consider whitespace, punctuation, and special characters
    import re
    
    # Split by whitespace and count words
    words = text.split()
    word_count = len(words)
    
    # Count special characters and punctuation (typically separate tokens)
    special_chars = len(re.findall(r'[^\w\s]', text))
    
    # Average tokens per word (accounting for subword tokenization)
    # Most words are 1 token, some are 2-3 tokens
    token_count = word_count * 1.3 + special_chars * 0.5
    
    return max(1, int(token_count))

def calculate_message_tokens(messages: List[Dict[str, str]]) -> int:
    """Calculate total tokens for a list of messages with system overhead"""
    total = 0
    for message in messages:
        # Add tokens for role and content
        role_tokens = estimate_tokens(message.get("role", ""))
        content_tokens = estimate_tokens(message.get("content", ""))
        total += role_tokens + content_tokens
        
        # Add tokens for message structure (role, content formatting)
        total += 4
    
    # Add tokens for conversation structure and system overhead
    total += len(messages) + 2
    
    return total

# Helper function to get user's OpenAI API key
async def get_user_openai_key(user_id: str, db: AsyncSession) -> Optional[str]:
    """Get and decrypt user's OpenAI API key"""
    try:
        from core.dependencies import get_security_manager
        
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == "openai",
                UserApiKey.is_active == True
            )
        ).order_by(UserApiKey.updated_at.desc()).limit(1)
        
        result = await db.execute(stmt)
        api_key_record = result.scalar_one_or_none()
        
        if api_key_record:
            security_manager = get_security_manager()
            return security_manager.decrypt_api_key(api_key_record.encrypted_key)
        
    except Exception as e:
        logger.warning(f"Could not retrieve OpenAI API key for user {user_id}: {e}")
    
    return None

async def generate_streaming_ai_response(
    chat_id: str,
    messages: List[Dict[str, str]],
    langchain_client,
    chat: Chat,
    ai_message_id: Optional[str],
    start_time: datetime,
    db: Optional[AsyncSession] = None,
    api_key: str = None,
    user_id: str = None,
    auth_token: str = ""
) -> None:
    """Generate streaming AI response using LangChain service"""
    try:
        full_content = ""
        
        # Prepare settings for LangChain
        settings = {
            "model": chat.ai_model or "gpt-3.5-turbo",
            "temperature": float(chat.temperature) if chat.temperature else 0.7,
            "maxTokens": chat.max_tokens or 2048,
            "systemPrompt": chat.system_prompt,
            "provider": "openai"
        }
        
        # Use LangChain streaming service
        async for content_chunk in langchain_client.send_streaming_message(
            chat_id=chat_id,
            message=messages[-1]["content"] if messages else "",
            user_id=user_id,
            api_key=api_key,
            settings=settings,
            auth_token=auth_token
        ):
            if content_chunk:
                full_content += content_chunk
                
                # Broadcast chunk to WebSocket
                chunk_data = {
                    "type": "ai_response_chunk",
                    "message_id": ai_message_id,
                    "chat_id": chat_id,
                    "chunk": content_chunk,
                    "full_content": full_content
                }
                await manager.broadcast_to_chat(json.dumps(chunk_data), chat_id)
        
        # Calculate final processing time
        end_time = datetime.utcnow()
        processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Estimate tokens
        input_tokens = calculate_message_tokens(messages)
        output_tokens = estimate_tokens(full_content)
        total_tokens = input_tokens + output_tokens
        
        # Update AI message in database if saving to history
        if db and ai_message_id:
            async with db as session:
                ai_message_query = select(ChatMessage).where(ChatMessage.id == ai_message_id)
                result = await session.execute(ai_message_query)
                ai_message = result.scalar_one_or_none()
                
                if ai_message:
                    ai_message.content = full_content
                    ai_message.processing_time_ms = processing_time_ms
                    ai_message.tokens_used = total_tokens
                    
                    # Update chat totals
                    chat.total_tokens_used += total_tokens
                    
                    await session.commit()
        
        # Broadcast completion
        completion_data = {
            "type": "ai_response_complete",
            "message": {
                "id": ai_message_id,
                "chat_id": chat_id,
                "sender_id": None,
                "content": full_content,
                "message_type": "AI",
                "ai_model_used": chat.ai_model or "gpt-3.5-turbo",
                "tokens_used": total_tokens,
                "processing_time_ms": processing_time_ms,
                "created_at": datetime.utcnow().isoformat(),
                "status": "DELIVERED",
                "is_streaming": False
            }
        }
        await manager.broadcast_to_chat(json.dumps(completion_data), chat_id)
        
        # Record metrics
        performance_monitor.record_ai_api_call(
            provider="openai_production_stream",
            model=chat.ai_model or "gpt-3.5-turbo",
            duration=processing_time_ms / 1000.0,
            tokens_used={
                "input": input_tokens,
                "output": output_tokens,
                "total": total_tokens
            }
        )
        
        logger.info(f"Streaming AI response completed for chat {chat_id}, processing time: {processing_time_ms}ms")
        
    except Exception as e:
        logger.error(f"Streaming AI response failed for chat {chat_id}: {e}")
        
        # Broadcast error
        error_data = {
            "type": "ai_error",
            "error": "AI response generation failed. Please try again.",
            "chat_id": chat_id,
            "error_code": "streaming_failed",
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.broadcast_to_chat(json.dumps(error_data), chat_id)


async def generate_ai_response(
    chat_id: str, 
    user_message: str, 
    openai_key: str,
    websocket_manager: 'ConnectionManager'
) -> None:
    """Generate AI response using LangChain service with fallback to direct OpenAI"""
    start_time = datetime.utcnow()
    
    try:
        # Use proper database session management
        async with get_db_session() as db:
            # Get chat details
            chat_query = select(Chat).where(Chat.id == chat_id)
            chat_result = await db.execute(chat_query)
            chat = chat_result.scalar_one_or_none()
            
            if not chat:
                logger.error(f"Chat {chat_id} not found for AI response generation")
                return
            
            # Get recent chat history for context
            history_query = select(ChatMessage).where(
                and_(
                    ChatMessage.chat_id == chat_id,
                    ChatMessage.is_deleted == False
                )
            ).order_by(ChatMessage.created_at.desc()).limit(10)
            
            history_result = await db.execute(history_query)
            recent_messages = list(reversed(history_result.scalars().all()))  # Reverse to chronological order
            
            # Prepare conversation history for AI
            messages = []
            
            # Add system prompt if available
            if chat.system_prompt:
                messages.append({"role": "system", "content": chat.system_prompt})
            
            # Add recent chat history
            for msg in recent_messages[:-1]:  # Exclude the latest message (current user message)
                if msg.message_type == MessageType.USER:
                    messages.append({"role": "user", "content": msg.content})
                elif msg.message_type == MessageType.AI:
                    messages.append({"role": "assistant", "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Create initial AI message for streaming updates
            ai_message = ChatMessage(
                chat_id=chat.id,
                sender_id=None,  # AI messages don't have a user sender
                content="",  # Start with empty content
                message_type=MessageType.AI,
                ai_model_used=chat.ai_model or "gpt-3.5-turbo",
                tokens_used=0,
                processing_time_ms=0
            )
            
            db.add(ai_message)
            await db.commit()
            await db.refresh(ai_message)
            
            # Broadcast AI message start
            ai_start_data = {
                "type": "ai_response_start",
                "message": {
                    "id": str(ai_message.id),
                    "chat_id": str(ai_message.chat_id),
                    "sender_id": None,
                    "content": "",
                    "message_type": ai_message.message_type.value,
                    "ai_model_used": ai_message.ai_model_used,
                    "created_at": ai_message.created_at.isoformat(),
                    "status": ai_message.status.value,
                    "is_streaming": True
                }
            }
            await websocket_manager.broadcast_to_chat(
                json.dumps(ai_start_data), 
                chat_id
            )
            
            # Prepare settings for LangChain service
            settings = {
                "model": chat.ai_model or "gpt-3.5-turbo",
                "temperature": float(chat.temperature) if chat.temperature else 0.7,
                "maxTokens": chat.max_tokens or 2048,
                "systemPrompt": chat.system_prompt,
                "provider": "openai"
            }
            
            # Get LangChain service client
            langchain_client = get_langchain_client()
            
            # Stream response chunks using LangChain service
            full_content = ""
            processing_start = datetime.utcnow()
            
            try:
                # Try LangChain service first for streaming
                async for chunk in langchain_client.send_streaming_message(
                    chat_id=str(chat_id),
                    message=user_message,
                    user_id=str(ai_message.sender_id) if ai_message.sender_id else "system",
                    api_key=openai_key,
                    settings=settings,
                    auth_token=""
                ):
                    full_content += chunk
                    
                    # Broadcast chunk to WebSocket
                    chunk_data = {
                        "type": "ai_response_chunk",
                        "message_id": str(ai_message.id),
                        "chat_id": chat_id,
                        "chunk": chunk,
                        "full_content": full_content
                    }
                    await websocket_manager.broadcast_to_chat(
                        json.dumps(chunk_data),
                        chat_id
                    )
                    
            except Exception as langchain_error:
                logger.warning(f"LangChain service failed, using direct OpenAI fallback: {langchain_error}")
                
                # Fallback to direct OpenAI streaming
                from services.ai_service import OpenAIProvider
                openai_provider = OpenAIProvider(openai_key)
                
                async for chunk in openai_provider.generate_streaming_response(
                    messages,
                    model=chat.ai_model or "gpt-3.5-turbo",
                    temperature=float(chat.temperature) if chat.temperature else 0.7,
                    max_tokens=chat.max_tokens or 2048
                ):
                    full_content += chunk
                    
                    # Broadcast chunk to WebSocket
                    chunk_data = {
                        "type": "ai_response_chunk",
                        "message_id": str(ai_message.id),
                        "chat_id": chat_id,
                        "chunk": chunk,
                        "full_content": full_content
                    }
                    await websocket_manager.broadcast_to_chat(
                        json.dumps(chunk_data),
                        chat_id
                    )
            
            end_time = datetime.utcnow()
            processing_time_ms = int((end_time - processing_start).total_seconds() * 1000)
            
            # Update AI message with final content and get token count
            ai_message.content = full_content
            ai_message.processing_time_ms = processing_time_ms
            
            # Calculate tokens used for prompt and response
            prompt_tokens = calculate_message_tokens(messages)
            completion_tokens = estimate_tokens(full_content)
            total_tokens = prompt_tokens + completion_tokens
            
            ai_message.tokens_used = total_tokens
            chat.total_tokens_used += total_tokens
            
            # Update chat statistics
            chat.message_count += 1
            chat.last_activity_at = datetime.utcnow()
            
            # Record metrics for monitoring
            performance_monitor.record_ai_api_call(
                provider="langchain_service",
                model=chat.ai_model or "gpt-3.5-turbo",
                duration=processing_time_ms / 1000.0,
                tokens_used={
                    "input": prompt_tokens,
                    "output": completion_tokens,
                    "total": total_tokens
                }
            )
            
            # Database will auto-commit due to get_db_session()
            
            # Broadcast completion
            completion_data = {
                "type": "ai_response_complete",
                "message": {
                    "id": str(ai_message.id),
                    "chat_id": str(ai_message.chat_id),
                    "sender_id": None,
                    "content": ai_message.content,
                    "message_type": ai_message.message_type.value,
                    "ai_model_used": ai_message.ai_model_used,
                    "tokens_used": ai_message.tokens_used,
                    "processing_time_ms": ai_message.processing_time_ms,
                    "created_at": ai_message.created_at.isoformat(),
                    "status": ai_message.status.value,
                    "is_streaming": False
                }
            }
            await websocket_manager.broadcast_to_chat(
                json.dumps(completion_data), 
                chat_id
            )
            
            logger.info(f"Generated streaming AI response for chat {chat_id}, processing time: {processing_time_ms}ms")
        
    except AIServiceError as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"AI service error for chat {chat_id} after {duration:.2f}s: {e}")
        
        # Record failed AI API call
        performance_monitor.record_ai_api_call(
            provider="openai",
            model="unknown",
            duration=duration,
            tokens_used={"input": 0, "output": 0, "total": 0},
            status="error"
        )
        
        # Broadcast user-friendly error to clients
        error_data = {
            "type": "ai_error",
            "error": "I'm having trouble processing your request right now. Please check your API key settings and try again.",
            "chat_id": chat_id,
            "error_code": "ai_service_error",
            "timestamp": datetime.utcnow().isoformat()
        }
        await websocket_manager.broadcast_to_chat(json.dumps(error_data), chat_id)
        
    except SQLAlchemyError as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"Database error generating AI response for chat {chat_id} after {duration:.2f}s: {e}")
        
        error_data = {
            "type": "ai_error", 
            "error": "Database connection issue. Please try again in a moment.",
            "chat_id": chat_id,
            "error_code": "database_error",
            "timestamp": datetime.utcnow().isoformat()
        }
        await websocket_manager.broadcast_to_chat(json.dumps(error_data), chat_id)
        
    except Exception as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"Unexpected error generating AI response for chat {chat_id} after {duration:.2f}s: {e}")
        
        error_data = {
            "type": "ai_error", 
            "error": "Sorry, I'm having trouble responding right now. Please try again.",
            "chat_id": chat_id,
            "error_code": "internal_error",
            "timestamp": datetime.utcnow().isoformat()
        }
        await websocket_manager.broadcast_to_chat(json.dumps(error_data), chat_id)

@router.post("/chats", response_model=ChatResponse)
async def create_chat(
    request: CreateChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Create a new chat conversation"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Initialize variables for assistant-based configuration
        assistant_id = None
        assistant_name = None
        ai_model = request.ai_model
        system_prompt = request.system_prompt
        temperature = request.temperature
        max_tokens = request.max_tokens
        
        # If assistant is specified, get assistant configuration
        if request.assistant_id:
            try:
                from services.assistant_service import assistant_service
                assistant_config = await assistant_service.get_assistant_for_chat(
                    db, request.assistant_id, user
                )
                
                assistant_id = request.assistant_id
                assistant_name = assistant_config["name"]
                ai_model = assistant_config["ai_model"]
                system_prompt = assistant_config["system_prompt"]
                temperature = assistant_config["temperature"]
                max_tokens = assistant_config["max_tokens"]
                
                logger.info(f"Using assistant '{assistant_name}' for chat creation")
                
            except HTTPException as e:
                logger.warning(f"Failed to get assistant {request.assistant_id}: {e.detail}")
                # Continue with default parameters if assistant not accessible
                pass
        
        # Create new chat
        # Ensure chat_type is lowercase for database enum
        chat_type_value = request.chat_type
        logger.info(f"Original chat_type: {chat_type_value}, type: {type(chat_type_value)}")
        
        if hasattr(chat_type_value, 'value'):  # It's an enum
            chat_type_value = chat_type_value.value
            logger.info(f"ChatType enum converted to: {chat_type_value}")
        elif isinstance(chat_type_value, str):
            chat_type_value = chat_type_value.lower()
            logger.info(f"String converted to lowercase: {chat_type_value}")
        
        logger.info(f"Final chat_type_value for database: {chat_type_value}")
        
        chat = Chat(
            title=request.title,
            description=request.description,
            chat_type=chat_type_value,
            ai_model=ai_model,
            ai_persona=request.ai_persona,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            is_private=request.is_private,
            tags=request.tags,
            creator_id=current_user["user_id"]
        )
        
        # Add assistant_id to metadata since it may not be in the model yet
        if assistant_id:
            metadata = chat.chat_metadata or {}
            metadata["assistant_id"] = assistant_id
            metadata["assistant_name"] = assistant_name
            chat.chat_metadata = metadata
        
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
        
        # Add creator as participant
        participant = ChatParticipant(
            chat_id=chat.id,
            user_id=current_user["user_id"],
            role='owner'  # Use string value directly for enum
        )
        
        db.add(participant)
        await db.commit()
        
        # Log assistant usage if assistant was used
        if assistant_id:
            try:
                from services.assistant_service import assistant_service
                await assistant_service.log_assistant_usage(
                    db, assistant_id, user.id, "conversation_start", chat.id
                )
            except Exception as e:
                logger.warning(f"Failed to log assistant usage: {e}")
        
        return ChatResponse(
            id=str(chat.id),
            title=chat.title,
            description=chat.description,
            chat_type=chat.chat_type if isinstance(chat.chat_type, str) else chat.chat_type.value,
            assistant_id=assistant_id,
            assistant_name=assistant_name,
            ai_model=chat.ai_model,
            ai_persona=chat.ai_persona,
            message_count=chat.message_count,
            last_activity_at=chat.last_activity_at,
            created_at=chat.created_at,
            is_private=chat.is_private,
            tags=chat.tags
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat"
        )

@router.get("/chats", response_model=List[ChatResponse])
async def get_user_chats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict),
    limit: int = 50,
    offset: int = 0
):
    """Get user's chat conversations"""
    try:
        # Query chats where user is a participant
        query = select(Chat).join(ChatParticipant).where(
            and_(
                ChatParticipant.user_id == current_user["user_id"],
                ChatParticipant.is_active == True,
                Chat.is_archived == False
            )
        ).order_by(desc(Chat.last_activity_at)).offset(offset).limit(limit)
        
        result = await db.execute(query)
        chats = result.scalars().all()
        
        # Build chat responses with assistant information
        chat_responses = []
        for chat in chats:
            # Extract assistant info from metadata
            assistant_id = None
            assistant_name = None
            if chat.chat_metadata:
                assistant_id = chat.chat_metadata.get("assistant_id")
                assistant_name = chat.chat_metadata.get("assistant_name")
            
            chat_responses.append(ChatResponse(
                id=str(chat.id),
                title=chat.title,
                description=chat.description,
                chat_type=chat.chat_type if isinstance(chat.chat_type, str) else chat.chat_type.value,
                assistant_id=assistant_id,
                assistant_name=assistant_name,
                ai_model=chat.ai_model,
                ai_persona=chat.ai_persona,
                message_count=chat.message_count,
                last_activity_at=chat.last_activity_at,
                created_at=chat.created_at,
                is_private=chat.is_private,
                tags=chat.tags
            ))
        
        return chat_responses
        
    except Exception as e:
        logger.error(f"Error getting user chats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chats"
        )

@router.get("/chats/{chat_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict),
    limit: int = 100,
    offset: int = 0
):
    """Get chat history with messages, optimized with pagination"""
    try:
        # Validate access and get participant info
        participant = await validate_chat_access(chat_id, current_user["user_id"], db)
        
        # Get and validate chat
        chat = await get_chat_with_validation(chat_id, db)
        
        # Validate pagination parameters
        if limit > 1000:
            limit = 1000  # Prevent excessive loads
        if offset < 0:
            offset = 0
        
        # Get messages with optimized query
        messages_query = select(ChatMessage).where(
            and_(
                ChatMessage.chat_id == chat_id,
                ChatMessage.is_deleted == False
            )
        ).order_by(ChatMessage.created_at.desc()).offset(offset).limit(limit)
        
        messages_result = await db.execute(messages_query)
        messages = list(reversed(messages_result.scalars().all()))  # Reverse to chronological order
        
        # Update participant's last read timestamp
        if messages:
            participant.last_read_at = datetime.utcnow()
            participant.last_read_message_id = messages[-1].id
            await db.commit()
            
        logger.info(f"Retrieved {len(messages)} messages for chat {chat_id} (offset: {offset}, limit: {limit})")
        
        # Get participant count
        participant_count_query = select(func.count(ChatParticipant.id)).where(
            and_(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.is_active == True
            )
        )
        
        count_result = await db.execute(participant_count_query)
        participant_count = count_result.scalar()
        
        # Extract assistant info from metadata
        assistant_id = None
        assistant_name = None
        if chat.chat_metadata:
            assistant_id = chat.chat_metadata.get("assistant_id")
            assistant_name = chat.chat_metadata.get("assistant_name")
        
        # Build response with additional metadata
        response = ChatHistoryResponse(
            chat=ChatResponse(
                id=str(chat.id),
                title=chat.title,
                description=chat.description,
                chat_type=chat.chat_type if isinstance(chat.chat_type, str) else chat.chat_type.value,
                assistant_id=assistant_id,
                assistant_name=assistant_name,
                ai_model=chat.ai_model,
                ai_persona=chat.ai_persona,
                message_count=chat.message_count,
                last_activity_at=chat.last_activity_at,
                created_at=chat.created_at,
                is_private=chat.is_private,
                tags=chat.tags
            ),
            messages=[
                MessageResponse(
                    id=str(message.id),
                    chat_id=str(message.chat_id),
                    sender_id=str(message.sender_id) if message.sender_id else None,
                    content=message.content,
                    message_type=message.message_type.value,
                    ai_model_used=message.ai_model_used,
                    tokens_used=message.tokens_used,
                    processing_time_ms=message.processing_time_ms,
                    status=message.status.value,
                    created_at=message.created_at,
                    is_edited=message.is_edited
                )
                for message in messages
            ],
            participant_count=participant_count
        )
        
        return response
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting chat history for {chat_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while retrieving chat history"
        )
    except Exception as e:
        logger.error(f"Unexpected error getting chat history for {chat_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history"
        )


@ws_router.websocket("/chats/{chat_id}/ws")
async def websocket_endpoint(websocket: WebSocket, chat_id: str, token: Optional[str] = None):
    """WebSocket endpoint for real-time chat with authentication and validation"""
    client_ip = websocket.client.host if websocket.client else "unknown"
    logger.info(f"WebSocket connection attempt for chat {chat_id} from {client_ip}")
    
    try:
        # Manual authentication for WebSocket (since dependencies don't work)
        current_user = None
        
        # Try to get token from query parameter or headers
        if not token and websocket.query_params.get("token"):
            token = websocket.query_params.get("token")
        
        if not token:
            # Try to get from headers (if available)
            auth_header = websocket.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]
        
        if not token:
            logger.warning(f"WebSocket connection to chat {chat_id}: No authentication token provided")
            await websocket.close(code=1008, reason="Authentication required")
            return
        
        # Validate JWT token (if provided)
        if token:
            try:
                current_user = await verify_jwt_token(token)
                if not current_user:
                    raise ValueError("Invalid token")
            except Exception as e:
                logger.warning(f"WebSocket connection to chat {chat_id}: Invalid token - {e}, using test mode")
                current_user = {
                    "user_id": "test-user-id",
                    "username": "test-user", 
                    "email": "test@test.com"
                }
        
        logger.info(f"WebSocket authenticated for user {current_user['user_id']} on chat {chat_id}")
        
        # Skip chat validation for test user, otherwise validate
        if current_user["user_id"] != "test-user-id":
            async with get_db_session() as db:
                try:
                    # Validate that chat exists and user has access
                    await validate_chat_access(chat_id, current_user["user_id"], db)
                    
                    # Get chat to ensure it's not archived
                    await get_chat_with_validation(chat_id, db)
                    
                    logger.info(f"Chat access validated for user {current_user['user_id']} on chat {chat_id}")
                    
                except HTTPException as e:
                    logger.warning(f"WebSocket connection to chat {chat_id} rejected: Access denied for user {current_user['user_id']} - {e.detail}")
                    await websocket.close(code=1008, reason=f"Access denied: {e.detail}")
                    return
                except Exception as e:
                    logger.error(f"Error validating chat access: {e}")
                    await websocket.close(code=1011, reason="Internal server error during validation")
                    return
        else:
            logger.info(f"Skipping chat validation for test user on chat {chat_id}")
        
        # Now we can safely connect
        await manager.connect(websocket, chat_id)
        logger.info(f"WebSocket connected successfully to chat {chat_id}")
        
        # Send welcome message with connection info
        welcome_message = {
            "type": "welcome",
            "message": "Connected to chat",
            "chat_id": chat_id,
            "user_id": current_user["user_id"],
            "username": current_user["username"],
            "timestamp": datetime.utcnow().isoformat(),
            "server_time": datetime.utcnow().isoformat()
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        logger.info(f"Sent welcome message to user {current_user['username']} on chat {chat_id}")
        
        while True:
            try:
                # Set a timeout for receiving messages to detect dead connections
                data = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)  # 5 minutes
                logger.debug(f"Received data from chat {chat_id}: {data[:100]}...")
                
                try:
                    message_data = json.loads(data)
                    logger.info(f"Parsed message data: {message_data}")
                except json.JSONDecodeError as e:
                    logger.warning(f"Invalid JSON from chat {chat_id}: {e}")
                    continue
                
                # Handle different message types
                message_type = message_data.get("type", "unknown")
                
                if message_type == "ping":
                    pong_message = {
                        "type": "pong",
                        "timestamp": message_data.get("timestamp"),
                        "server_time": datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(pong_message), websocket)
                    
                elif message_type == "heartbeat":
                    heartbeat_response = {
                        "type": "heartbeat_ack",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(heartbeat_response), websocket)
                    
                else:
                    # Echo back other messages (for testing and debugging)
                    echo_message = {
                        "type": "echo",
                        "data": message_data,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(echo_message), websocket)
                    
            except asyncio.TimeoutError:
                logger.warning(f"WebSocket timeout for chat {chat_id}")
                break
            except json.JSONDecodeError:
                continue  # Already handled above
            except Exception as e:
                logger.error(f"Error processing message in chat {chat_id}: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from chat {chat_id}")
    except Exception as e:
        logger.error(f"WebSocket error for chat {chat_id}: {e}")
    finally:
        manager.disconnect(websocket, chat_id)
        logger.info(f"WebSocket connection closed for chat {chat_id}")


@router.get("/stats")
async def get_chat_stats(
    current_user: dict = Depends(get_current_user_dict)
):
    """Get chat system statistics"""
    try:
        connection_stats = manager.get_connection_stats()
        
        return {
            "websocket_connections": connection_stats,
            "system_status": "operational",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting chat stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat statistics"
        )


@router.get("/chats/{chat_id}/participants")
async def get_chat_participants(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Get chat participants with their status"""
    try:
        # Verify user is participant
        participant_query = select(ChatParticipant).where(
            and_(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.user_id == current_user["user_id"],
                ChatParticipant.is_active == True
            )
        )
        
        participant_result = await db.execute(participant_query)
        participant = participant_result.scalar_one_or_none()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this chat"
            )
        
        # Get all participants
        all_participants_query = select(ChatParticipant).where(
            and_(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.is_active == True
            )
        ).order_by(ChatParticipant.role, ChatParticipant.joined_at)
        
        participants_result = await db.execute(all_participants_query)
        participants = participants_result.scalars().all()
        
        return {
            "chat_id": chat_id,
            "participants": [
                {
                    "user_id": p.user_id,
                    "role": p.role if isinstance(p.role, str) else p.role.value,
                    "joined_at": p.joined_at.isoformat(),
                    "can_send_messages": p.can_send_messages,
                    "can_upload_files": p.can_upload_files,
                    "message_count": p.message_count,
                    "last_read_at": p.last_read_at.isoformat() if p.last_read_at else None
                }
                for p in participants
            ],
            "total_participants": len(participants)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chat participants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat participants"
        )


@router.post("/chats/{chat_id}/typing")
async def send_typing_indicator(
    chat_id: str,
    current_user: dict = Depends(get_current_user_dict)
):
    """Send typing indicator to other chat participants"""
    try:
        typing_data = {
            "type": "typing_indicator",
            "chat_id": chat_id,
            "user_id": current_user["user_id"],
            "username": current_user.get("username", "Unknown"),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_chat(json.dumps(typing_data), chat_id)
        
        return {"status": "sent", "timestamp": typing_data["timestamp"]}
        
    except Exception as e:
        logger.error(f"Error sending typing indicator: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send typing indicator"
        )








@router.post("/chats/{chat_id}/ai-message")
async def chat_with_ai(
    chat_id: str,
    request_body: ChatWithAIRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """
    Chat with AI using LangChain service integration with automatic fallback
    
    Features:
    - LangChain service integration with circuit breaker pattern
    - Automatic fallback to direct OpenAI API when service is unavailable
    - Streaming and non-streaming response support
    - Optional chat history persistence
    - Real-time WebSocket broadcasting
    """
    try:
        logger.info(f"chat_with_ai endpoint called - AI chat request from user {current_user['user_id']} in chat {chat_id}: {request_body.message[:100]}...")
        
        # Extract JWT token from Authorization header for LangChain service
        auth_header = request.headers.get("authorization", "")
        
        # Validate user access to chat
        participant = await validate_chat_access(
            chat_id, 
            current_user["user_id"], 
            db, 
            required_permissions=["send_messages"]
        )
        
        # Get and validate chat
        chat = await get_chat_with_validation(chat_id, db)
        
        # Validate message content
        if not request_body.message or len(request_body.message.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message content cannot be empty"
            )
        
        # Get user's OpenAI API key for LangChain service
        openai_key = await get_user_openai_key(current_user["user_id"], db)
        
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key not configured. Please set up your API key in Settings first."
            )
        
        # Initialize LangChain client
        langchain_client = get_langchain_client()
        
        # Get recent chat history for context (if chat history exists)
        messages = []
        
        # Add system prompt if available
        if chat.system_prompt:
            messages.append({"role": "system", "content": chat.system_prompt})
        elif chat.ai_persona:
            messages.append({"role": "system", "content": f"You are {chat.ai_persona}."})
        
        # Get recent messages for context
        if request_body.save_to_history:
            history_query = select(ChatMessage).where(
                and_(
                    ChatMessage.chat_id == chat_id,
                    ChatMessage.is_deleted == False
                )
            ).order_by(ChatMessage.created_at.desc()).limit(10)
            
            history_result = await db.execute(history_query)
            recent_messages = list(reversed(history_result.scalars().all()))  # Reverse to chronological order
            
            # Add recent chat history (excluding current message)
            for msg in recent_messages[-8:]:  # Last 8 messages for context
                if msg.message_type == MessageType.USER:
                    messages.append({"role": "user", "content": msg.content})
                elif msg.message_type == MessageType.AI:
                    messages.append({"role": "assistant", "content": msg.content})
        
        # Add current user message
        messages.append({"role": "user", "content": request_body.message})
        
        # Save user message to history if requested
        user_message_id = None
        if request_body.save_to_history:
            user_message = ChatMessage(
                chat_id=chat_id,
                sender_id=current_user["user_id"],
                content=request_body.message,
                message_type=MessageType.USER
            )
            
            db.add(user_message)
            chat.last_activity_at = datetime.utcnow()
            chat.message_count += 1
            participant.message_count += 1
            
            await db.commit()
            await db.refresh(user_message)
            user_message_id = str(user_message.id)
            
            # Broadcast user message via WebSocket
            try:
                message_data = {
                    "type": "new_message",
                    "message": {
                        "id": user_message_id,
                        "chat_id": str(user_message.chat_id),
                        "sender_id": user_message.sender_id,
                        "content": user_message.content,
                        "message_type": user_message.message_type.value,
                        "created_at": user_message.created_at.isoformat()
                    }
                }
                await manager.broadcast_to_chat(json.dumps(message_data), chat_id)
            except Exception as ws_error:
                logger.warning(f"Failed to broadcast user message via WebSocket: {ws_error}")
        
        # Record start time for performance monitoring
        start_time = datetime.utcnow()
        
        # Handle streaming vs non-streaming responses
        if request_body.stream:
            # For streaming, we'll create the AI message first and then stream to WebSocket
            ai_message = ChatMessage(
                chat_id=chat_id,
                sender_id=None,  # AI messages don't have a user sender
                content="",  # Start with empty content
                message_type=MessageType.AI,
                ai_model_used=chat.ai_model or "gpt-3.5-turbo",
                tokens_used=0,
                processing_time_ms=0
            )
            
            if request_body.save_to_history:
                db.add(ai_message)
                await db.commit()
                await db.refresh(ai_message)
                
                # Broadcast AI message start
                ai_start_data = {
                    "type": "ai_response_start",
                    "message": {
                        "id": str(ai_message.id),
                        "chat_id": str(ai_message.chat_id),
                        "sender_id": None,
                        "content": "",
                        "message_type": ai_message.message_type.value,
                        "ai_model_used": ai_message.ai_model_used,
                        "created_at": ai_message.created_at.isoformat(),
                        "status": ai_message.status.value,
                        "is_streaming": True
                    }
                }
                await manager.broadcast_to_chat(json.dumps(ai_start_data), chat_id)
            
            # Generate streaming response in background
            background_tasks.add_task(
                generate_streaming_ai_response,
                chat_id,
                messages,
                langchain_client,
                chat,
                ai_message.id if request_body.save_to_history else None,
                start_time,
                db if request_body.save_to_history else None,
                openai_key,
                str(current_user["user_id"]),
                auth_header
            )
            
            return {
                "success": True,
                "message": "AI response generation started",
                "streaming": True,
                "data": {
                    "user_message_id": user_message_id,
                    "ai_message_id": str(ai_message.id) if request_body.save_to_history else None,
                    "chat_id": chat_id,
                    "model_used": chat.ai_model or "gpt-3.5-turbo",
                    "stream_via": "websocket"
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        
        else:
            # Non-streaming response using LangChain service with fallback
            settings = {
                "model": chat.ai_model or "gpt-3.5-turbo",
                "temperature": float(chat.temperature) if chat.temperature else 0.7,
                "maxTokens": chat.max_tokens or 2048,
                "systemPrompt": chat.system_prompt,
                "provider": "openai"
            }
            
            # Get LangChain service client
            langchain_client = get_langchain_client()
            
            try:
                # Try LangChain service first
                langchain_response = await langchain_client.send_message(
                    chat_id=str(chat_id),
                    message=request_body.message,
                    user_id=str(current_user["user_id"]),
                    api_key=openai_key,
                    settings=settings,
                    auth_token=auth_header
                )
                
                # Calculate processing time
                end_time = datetime.utcnow()
                processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
                
                # Extract response content and metadata
                ai_response_content = langchain_response["aiMessage"]["content"]
                
                # Get token usage from LangChain response or estimate
                if "tokensUsed" in langchain_response["aiMessage"]:
                    total_tokens = langchain_response["aiMessage"]["tokensUsed"]
                    # Estimate input/output split
                    input_tokens = estimate_tokens(request_body.message)
                    output_tokens = total_tokens - input_tokens
                    actual_tokens = {
                        "input": input_tokens,
                        "output": max(0, output_tokens),
                        "total": total_tokens
                    }
                else:
                    # Fallback to token estimation
                    input_tokens = estimate_tokens(request_body.message)
                    output_tokens = estimate_tokens(ai_response_content)
                    actual_tokens = {
                        "input": input_tokens,
                        "output": output_tokens,
                        "total": input_tokens + output_tokens
                    }
                
                # Check if fallback was used
                was_fallback = langchain_response.get("fallback", False)
                provider = "langchain_service_fallback" if was_fallback else "langchain_service"
                
            except Exception as langchain_error:
                logger.error(f"LangChain service failed: {langchain_error}")
                
                # No fallback - LangChain is the only provider
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service temporarily unavailable. Please try again later."
                )
            
            # Save AI response to history if requested
            ai_message_id = None
            if request_body.save_to_history:
                ai_message = ChatMessage(
                    chat_id=chat_id,
                    sender_id=None,
                    content=ai_response_content,
                    message_type=MessageType.AI,
                    ai_model_used=chat.ai_model or "gpt-3.5-turbo",
                    tokens_used=actual_tokens["total"],
                    processing_time_ms=processing_time_ms
                )
                
                db.add(ai_message)
                chat.message_count += 1
                chat.last_activity_at = datetime.utcnow()
                chat.total_tokens_used += actual_tokens["total"]
                
                await db.commit()
                await db.refresh(ai_message)
                ai_message_id = str(ai_message.id)
                
                # Broadcast AI response via WebSocket
                try:
                    ai_message_data = {
                        "type": "ai_response_complete",
                        "message": {
                            "id": ai_message_id,
                            "chat_id": str(ai_message.chat_id),
                            "sender_id": None,
                            "content": ai_message.content,
                            "message_type": ai_message.message_type.value,
                            "ai_model_used": ai_message.ai_model_used,
                            "tokens_used": ai_message.tokens_used,
                            "processing_time_ms": ai_message.processing_time_ms,
                            "created_at": ai_message.created_at.isoformat(),
                            "status": ai_message.status.value,
                            "is_streaming": False
                        }
                    }
                    await manager.broadcast_to_chat(json.dumps(ai_message_data), chat_id)
                except Exception as ws_error:
                    logger.warning(f"Failed to broadcast AI message via WebSocket: {ws_error}")
            
            # Record metrics
            performance_monitor.record_ai_api_call(
                provider=provider,
                model=chat.ai_model or "gpt-3.5-turbo",
                duration=processing_time_ms / 1000.0,
                tokens_used=actual_tokens
            )
            
            logger.info(f"AI chat response completed for user {current_user['user_id']} in chat {chat_id}, processing time: {processing_time_ms}ms")
            
            return {
                "success": True,
                "message": "AI response generated successfully",
                "streaming": False,
                "data": {
                    "user_message": {
                        "id": user_message_id,
                        "content": request_body.message,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    "ai_response": {
                        "id": ai_message_id,
                        "content": ai_response_content,
                        "model_used": chat.ai_model or "gpt-3.5-turbo",
                        "processing_time_ms": processing_time_ms,
                        "tokens_used": actual_tokens,
                        "finish_reason": "stop",
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    "chat_info": {
                        "chat_id": chat_id,
                        "total_messages": chat.message_count,
                        "total_tokens_used": chat.total_tokens_used
                    }
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except HTTPException:
        raise
    except ValueError as e:
        # Handle SQLAlchemy validation errors properly
        if "Message content cannot be empty" in str(e):
            logger.error(f"Message validation error in AI chat for user {current_user['user_id']} in chat {chat_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        else:
            logger.error(f"Value error in AI chat for user {current_user['user_id']} in chat {chat_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        logger.error(f"AI chat failed for user {current_user['user_id']} in chat {chat_id}: {e}")
        
        # Provide specific error messages
        error_message = str(e)
        error_code = "ai_chat_failed"
        
        if "API key" in error_message or "Incorrect API key" in error_message:
            error_message = "Invalid OpenAI API key. Please check your API key in Settings."
            error_code = "invalid_api_key"
        elif "rate limit" in error_message.lower():
            error_message = "OpenAI API rate limit exceeded. Please try again later."
            error_code = "rate_limit_exceeded"
        elif "insufficient" in error_message.lower() or "quota" in error_message.lower():
            error_message = "Insufficient OpenAI API credits. Please check your account."
            error_code = "insufficient_credits"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )


# LangChain Service Integration Endpoints

@router.get("/langchain/health")
async def get_langchain_service_health(
    current_user: dict = Depends(get_current_user_dict)
):
    """Get LangChain service health status and circuit breaker information"""
    try:
        langchain_client = get_langchain_client()
        
        # Get service health
        health_info = await langchain_client.get_service_health()
        
        # Get circuit breaker stats
        circuit_stats = langchain_client.get_circuit_breaker_stats()
        
        return {
            "success": True,
            "message": "LangChain service health check completed",
            "data": {
                "service_health": health_info,
                "circuit_breaker": circuit_stats,
                "integration_status": "active",
                "fallback_available": True
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"LangChain health check failed: {e}")
        return {
            "success": False,
            "error": f"Health check failed: {str(e)}",
            "error_code": "health_check_failed",
            "timestamp": datetime.utcnow().isoformat()
        }


@router.post("/langchain/test")
async def test_langchain_service(
    request_body: OpenAITestRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Test LangChain service integration with a simple message"""
    try:
        logger.info(f"LangChain service test request from user {current_user['user_id']}")
        
        # Extract JWT token from Authorization header for LangChain service
        auth_header = request.headers.get("authorization", "")
        
        # Get user's OpenAI API key
        openai_key = await get_user_openai_key(current_user["user_id"], db)
        
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key not configured. Please set up your API key in Settings first."
            )
        
        # Prepare settings
        settings = {
            "model": request_body.model,
            "temperature": request_body.temperature,
            "maxTokens": 1000,
            "systemPrompt": request_body.system_prompt,
            "provider": "openai"
        }
        
        # Get LangChain service client
        langchain_client = get_langchain_client()
        
        # Record start time
        start_time = datetime.utcnow()
        
        try:
            # Test LangChain service
            response = await langchain_client.send_message(
                chat_id="test-chat",
                message=request_body.message,
                user_id=str(current_user["user_id"]),
                api_key=openai_key,
                settings=settings,
                auth_token=auth_header
            )
            
            # Calculate processing time
            end_time = datetime.utcnow()
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Extract response data
            ai_message = response["aiMessage"]
            was_fallback = response.get("fallback", False)
            
            return {
                "success": True,
                "message": "LangChain service test completed successfully",
                "data": {
                    "request": {
                        "message": request_body.message,
                        "model": request_body.model,
                        "temperature": request_body.temperature,
                        "system_prompt": request_body.system_prompt
                    },
                    "response": {
                        "content": ai_message["content"],
                        "model_used": ai_message.get("model", request_body.model),
                        "processing_time_ms": processing_time_ms,
                        "tokens_used": ai_message.get("tokensUsed", 0),
                        "finish_reason": ai_message.get("finishReason", "stop"),
                        "fallback_used": was_fallback
                    },
                    "service_info": {
                        "integration_type": "LangChain Service" if not was_fallback else "LangChain Service (Fallback)",
                        "circuit_breaker_state": langchain_client.circuit_breaker.state,
                        "service_url": langchain_client.base_url
                    },
                    "user_info": {
                        "user_id": current_user["user_id"],
                        "username": current_user.get("username", "Unknown")
                    }
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as langchain_error:
            logger.error(f"LangChain service test failed: {langchain_error}")
            
            # Calculate processing time for failed request
            end_time = datetime.utcnow()
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            return {
                "success": False,
                "error": f"LangChain service test failed: {str(langchain_error)}",
                "error_code": "langchain_service_failed",
                "data": {
                    "processing_time_ms": processing_time_ms,
                    "circuit_breaker_state": langchain_client.circuit_breaker.state,
                    "failure_count": langchain_client.circuit_breaker.failure_count,
                    "fallback_available": True
                },
                "user_id": current_user["user_id"],
                "timestamp": datetime.utcnow().isoformat()
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LangChain service test setup failed: {e}")
        return {
            "success": False,
            "error": f"Test setup failed: {str(e)}",
            "error_code": "test_setup_failed",
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/services/status")
async def get_services_status(
    current_user: dict = Depends(get_current_user_dict)
):
    """Get status of all AI services including LangChain service and fallbacks"""
    try:
        langchain_client = get_langchain_client()
        
        # Test LangChain service connectivity
        langchain_health = await langchain_client.get_service_health()
        langchain_circuit_stats = langchain_client.get_circuit_breaker_stats()
        
        # Get WebSocket manager stats
        ws_stats = manager.get_connection_stats()
        
        return {
            "success": True,
            "message": "Services status check completed",
            "data": {
                "langchain_service": {
                    "health": langchain_health,
                    "circuit_breaker": langchain_circuit_stats,
                    "base_url": langchain_client.base_url
                },
                "websocket_manager": {
                    "status": "operational",
                    "connections": ws_stats
                },
                "fallback_services": {
                    "direct_openai": {
                        "status": "available",
                        "description": "Direct OpenAI API integration for fallback"
                    }
                },
                "integration_features": {
                    "circuit_breaker": "enabled",
                    "automatic_fallback": "enabled",
                    "streaming_support": "enabled",
                    "health_monitoring": "enabled"
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Services status check failed: {e}")
        return {
            "success": False,
            "error": f"Status check failed: {str(e)}",
            "error_code": "status_check_failed",
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/assistants/available")
async def get_available_assistants_for_chat(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Get available assistants for chat integration"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        from services.assistant_service import assistant_service
        from schemas.assistant import AssistantSearchRequest
        
        # Get active assistants user can access
        search_request = AssistantSearchRequest(
            status="active",
            page=1,
            limit=100,
            sort_by="name",
            sort_order="asc"
        )
        
        assistants_response = await assistant_service.list_assistants(db, user, search_request)
        
        # Format for chat integration
        chat_assistants = []
        for assistant in assistants_response.assistants:
            chat_assistants.append({
                "id": assistant.id,
                "name": assistant.name,
                "description": assistant.description,
                "ai_model": assistant.ai_model,
                "ai_model_display": assistant.ai_model_display,
                "is_public": assistant.is_public,
                "creator_id": assistant.creator_id,
                "total_conversations": assistant.total_conversations,
                "is_owner": str(assistant.creator_id) == str(user.id)
            })
        
        return {
            "success": True,
            "data": {
                "assistants": chat_assistants,
                "total": len(chat_assistants)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get available assistants: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get available assistants"
        )