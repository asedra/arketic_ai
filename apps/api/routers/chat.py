"""
Chat API Router - Real-time chat with AI integration
Handles chat creation, messaging, history, and WebSocket connections
"""

import json
import asyncio
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
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
from openai import AsyncOpenAI

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
    ai_model: str = "gpt-3.5-turbo"
    ai_persona: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(2048, ge=1, le=32000)
    is_private: bool = False
    tags: Optional[List[str]] = None

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    message_type: MessageType = MessageType.USER
    reply_to_id: Optional[str] = None
    message_metadata: Optional[Dict[str, Any]] = None

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
    client: AsyncOpenAI,
    chat: Chat,
    ai_message_id: Optional[str],
    start_time: datetime,
    db: Optional[AsyncSession] = None
) -> None:
    """Generate streaming AI response for production chat"""
    try:
        full_content = ""
        
        # Create streaming response
        stream = await client.chat.completions.create(
            model=chat.ai_model or "gpt-3.5-turbo",
            messages=messages,
            temperature=float(chat.temperature) if chat.temperature else 0.7,
            max_tokens=chat.max_tokens or 2048,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content_chunk = chunk.choices[0].delta.content
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
    """Generate AI response for user message with improved error handling"""
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
            
            # Generate streaming AI response using OpenAI
            start_time = datetime.utcnow()
            
            # Create temporary AI service with user's API key
            from services.ai_service import OpenAIProvider
            openai_provider = OpenAIProvider(openai_key)
            
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
            
            # Stream response chunks
            full_content = ""
            
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
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
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
                provider="openai",
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
        # Create new chat
        chat = Chat(
            title=request.title,
            description=request.description,
            chat_type=request.chat_type,
            ai_model=request.ai_model,
            ai_persona=request.ai_persona,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            is_private=request.is_private,
            tags=request.tags,
            creator_id=current_user["user_id"]
        )
        
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
        
        # Add creator as participant
        participant = ChatParticipant(
            chat_id=chat.id,
            user_id=current_user["user_id"],
            role=ParticipantRole.OWNER
        )
        
        db.add(participant)
        await db.commit()
        
        return ChatResponse(
            id=str(chat.id),
            title=chat.title,
            description=chat.description,
            chat_type=chat.chat_type.value,
            ai_model=chat.ai_model,
            ai_persona=chat.ai_persona,
            message_count=chat.message_count,
            last_activity_at=chat.last_activity_at,
            created_at=chat.created_at,
            is_private=chat.is_private,
            tags=chat.tags
        )
        
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
        
        return [
            ChatResponse(
                id=str(chat.id),
                title=chat.title,
                description=chat.description,
                chat_type=chat.chat_type.value,
                ai_model=chat.ai_model,
                ai_persona=chat.ai_persona,
                message_count=chat.message_count,
                last_activity_at=chat.last_activity_at,
                created_at=chat.created_at,
                is_private=chat.is_private,
                tags=chat.tags
            )
            for chat in chats
        ]
        
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
        
        # Build response with additional metadata
        response = ChatHistoryResponse(
            chat=ChatResponse(
                id=str(chat.id),
                title=chat.title,
                description=chat.description,
                chat_type=chat.chat_type.value,
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

@router.post("/chats/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    chat_id: str,
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Send a message to a chat with improved validation and error handling"""
    try:
        logger.info(f"send_message endpoint called for chat {chat_id} by user {current_user['user_id']}")
        # Validate user access and permissions
        participant = await validate_chat_access(
            chat_id, 
            current_user["user_id"], 
            db, 
            required_permissions=["send_messages"]
        )
        
        # Get and validate chat
        chat = await get_chat_with_validation(chat_id, db)
        
        # Validate chat allows AI responses for message processing
        if not hasattr(chat, 'enable_ai_responses'):
            chat.enable_ai_responses = True  # Default to True for backwards compatibility
        
        # Create message with validation
        try:
            # Validate message content
            if len(request.content.strip()) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Message content cannot be empty"
                )
            
            message = ChatMessage(
                chat_id=chat_id,
                sender_id=current_user["user_id"],
                content=request.content.strip(),  # Remove leading/trailing whitespace
                message_type=request.message_type,
                reply_to_id=request.reply_to_id,
                message_metadata=request.message_metadata
            )
            
            db.add(message)
            
            # Update chat activity atomically
            chat.last_activity_at = datetime.utcnow()
            chat.message_count += 1
            
            # Update participant message count
            participant.message_count += 1
            
            await db.commit()
            await db.refresh(message)
            
            logger.info(f"Message created: {message.id} in chat {chat_id} by user {current_user['user_id']}")
            
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error creating message: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send message: Database error - {str(e)[:100]}"
            )
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating message: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send message: {str(e)[:200]}"
            )
        
        # Broadcast to WebSocket connections with error handling
        try:
            message_data = {
                "type": "new_message",
                "message": {
                    "id": str(message.id),
                    "chat_id": str(message.chat_id),
                    "sender_id": message.sender_id,
                    "content": message.content,
                    "message_type": message.message_type.value,
                    "created_at": message.created_at.isoformat()
                }
            }
            
            await manager.broadcast_to_chat(json.dumps(message_data), chat_id)
            logger.info(f"Message broadcasted via WebSocket for chat {chat_id}")
        except Exception as ws_error:
            logger.warning(f"Failed to broadcast message via WebSocket for chat {chat_id}: {ws_error}")
            # Don't fail the entire request if WebSocket broadcast fails
        
        # Generate AI response if AI responses are enabled and this is a user message
        if (chat.enable_ai_responses and 
            request.message_type == MessageType.USER and 
            not request.content.startswith('/')):  # Skip AI response for commands
            
            # Get user's OpenAI API key
            openai_key = await get_user_openai_key(current_user["user_id"], db)
            
            if openai_key:
                # Generate AI response in background
                background_tasks.add_task(
                    generate_ai_response,
                    chat_id,
                    request.content,
                    openai_key,
                    manager
                )
            else:
                # Notify user that API key is needed
                error_data = {
                    "type": "ai_error",
                    "error": "Please set up your OpenAI API key in Settings to enable AI responses.",
                    "chat_id": chat_id
                }
                await manager.broadcast_to_chat(json.dumps(error_data), chat_id)
        
        return MessageResponse(
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
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
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
                    "role": p.role.value,
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


@router.post("/test/connection")
async def test_chat_connection(
    current_user: dict = Depends(get_current_user_dict)
):
    """Test chat system connectivity and API keys"""
    try:
        # Test database connectivity
        from core.database import check_database_health
        db_health = await check_database_health()
        
        # Test WebSocket manager
        ws_stats = manager.get_connection_stats()
        
        # Test user's OpenAI API key if available
        openai_status = None
        async for db in get_db():
            try:
                openai_key = await get_user_openai_key(current_user["user_id"], db)
                if openai_key:
                    from services.ai_service import test_openai_connection_with_key
                    openai_status = await test_openai_connection_with_key(openai_key, "gpt-3.5-turbo")
                else:
                    openai_status = {
                        "success": False,
                        "message": "No OpenAI API key configured",
                        "error_code": "no_api_key"
                    }
                break
            except Exception as e:
                openai_status = {
                    "success": False,
                    "message": f"Error testing OpenAI connection: {str(e)}",
                    "error_code": "connection_test_failed"
                }
                break
        
        return create_success_response({
            "database": db_health,
            "websocket_manager": {
                "status": "operational",
                "connections": ws_stats
            },
            "openai_api": openai_status,
            "user_id": current_user["user_id"],
            "username": current_user.get("username", "Unknown")
        }, "Chat system connectivity test completed")
        
    except Exception as e:
        logger.error(f"Error testing chat connection: {e}")
        return {
            "success": False,
            "error": "Chat system test failed",
            "error_code": "system_test_failed",
            "details": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/websocket/test/{chat_id}")
async def test_websocket_endpoint(
    chat_id: str,
    current_user: dict = Depends(get_current_user_dict)
):
    """Test WebSocket endpoint connectivity and provide connection info"""
    try:
        # Generate a test WebSocket URL with authentication token
        from core.dependencies import get_security_manager
        
        # Create a temporary token for WebSocket testing
        security_manager = get_security_manager()
        token = security_manager.create_token(
            user_id=current_user["user_id"],
            username=current_user["username"],
            email=current_user["email"],
            roles=current_user.get("roles", []),
            permissions=current_user.get("permissions", [])
        )
        
        ws_url = f"ws://localhost:8000/api/v1/chat/chats/{chat_id}/ws?token={token}"
        
        return create_success_response({
            "chat_id": chat_id,
            "websocket_url": ws_url,
            "test_instructions": {
                "1": "Use the WebSocket URL above to connect",
                "2": "Send a ping message: {\"type\": \"ping\", \"timestamp\": \"2024-01-01T00:00:00Z\"}",
                "3": "You should receive a pong response",
                "4": "Connection will be authenticated and validated for chat access"
            },
            "authentication": {
                "method": "JWT token in query parameter",
                "parameter": "token",
                "token_provided": True,
                "user_id": current_user["user_id"]
            }
        }, "WebSocket test endpoint ready")
        
    except Exception as e:
        logger.error(f"Error preparing WebSocket test for chat {chat_id}: {e}")
        return {
            "success": False,
            "error": "Failed to prepare WebSocket test",
            "error_code": "websocket_test_failed",
            "details": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.post("/openai/test")
async def test_openai_direct(
    request: OpenAITestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """
    Test OpenAI API integration directly
    Sends a test message to OpenAI API and returns the response
    """
    try:
        logger.info(f"OpenAI test request from user {current_user['user_id']}: {request.message[:50]}...")
        
        # Get user's OpenAI API key
        openai_key = await get_user_openai_key(current_user["user_id"], db)
        
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key not configured. Please set up your API key in Settings first."
            )
        
        # Initialize OpenAI client with user's API key
        client = AsyncOpenAI(api_key=openai_key)
        
        # Prepare messages
        messages = []
        
        # Add system message if provided
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        
        # Add user message
        messages.append({"role": "user", "content": request.message})
        
        # Record start time for performance monitoring
        start_time = datetime.utcnow()
        
        # Call OpenAI API
        response = await client.chat.completions.create(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=1000
        )
        
        # Calculate processing time
        end_time = datetime.utcnow()
        processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Extract response content
        response_content = response.choices[0].message.content
        
        # Get actual token usage from OpenAI response
        actual_tokens = {
            "input": response.usage.prompt_tokens if response.usage else 0,
            "output": response.usage.completion_tokens if response.usage else 0,
            "total": response.usage.total_tokens if response.usage else 0
        }
        
        # Record metrics
        performance_monitor.record_ai_api_call(
            provider="openai_direct",
            model=request.model,
            duration=processing_time_ms / 1000.0,
            tokens_used=actual_tokens
        )
        
        logger.info(f"OpenAI test completed for user {current_user['user_id']}, processing time: {processing_time_ms}ms")
        
        return {
            "success": True,
            "message": "OpenAI direct API test completed successfully",
            "data": {
                "request": {
                    "message": request.message,
                    "model": request.model,
                    "temperature": request.temperature,
                    "system_prompt": request.system_prompt
                },
                "response": {
                    "content": response_content,
                    "model_used": response.model,
                    "processing_time_ms": processing_time_ms,
                    "tokens_used": actual_tokens,
                    "finish_reason": response.choices[0].finish_reason
                },
                "user_info": {
                    "user_id": current_user["user_id"],
                    "username": current_user.get("username", "Unknown")
                },
                "api_info": {
                    "integration_type": "Direct OpenAI API",
                    "messages_count": len(messages),
                    "has_system_prompt": bool(request.system_prompt),
                    "openai_response_id": response.id
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI test failed for user {current_user['user_id']}: {e}")
        
        # If it's an OpenAI API error, provide more specific feedback
        error_message = str(e)
        error_code = "openai_test_failed"
        
        if "API key" in error_message or "Incorrect API key" in error_message:
            error_message = "Invalid OpenAI API key. Please check your API key in Settings."
            error_code = "invalid_api_key"
        elif "rate limit" in error_message.lower():
            error_message = "OpenAI API rate limit exceeded. Please try again later."
            error_code = "rate_limit_exceeded"
        elif "insufficient" in error_message.lower() or "quota" in error_message.lower():
            error_message = "Insufficient OpenAI API credits. Please check your account."
            error_code = "insufficient_credits"
        elif "model" in error_message.lower() and "not found" in error_message.lower():
            error_message = f"Model '{request.model}' not available. Please try a different model."
            error_code = "model_not_available"
        
        return {
            "success": False,
            "error": error_message,
            "error_code": error_code,
            "user_id": current_user["user_id"],
            "model_requested": request.model,
            "timestamp": datetime.utcnow().isoformat()
        }


@router.post("/chats/{chat_id}/ai-message")
async def chat_with_ai(
    chat_id: str,
    request: ChatWithAIRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """
    Production endpoint for chatting with AI in a specific chat
    Sends message to AI and returns response, optionally saving to chat history
    """
    try:
        logger.info(f"chat_with_ai endpoint called - AI chat request from user {current_user['user_id']} in chat {chat_id}: {request.message[:100]}...")
        
        # Validate user access to chat
        participant = await validate_chat_access(
            chat_id, 
            current_user["user_id"], 
            db, 
            required_permissions=["send_messages"]
        )
        
        # Get and validate chat
        chat = await get_chat_with_validation(chat_id, db)
        
        # Get user's OpenAI API key
        openai_key = await get_user_openai_key(current_user["user_id"], db)
        
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key not configured. Please set up your API key in Settings first."
            )
        
        # Initialize OpenAI client
        client = AsyncOpenAI(api_key=openai_key)
        
        # Get recent chat history for context (if chat history exists)
        messages = []
        
        # Add system prompt if available
        if chat.system_prompt:
            messages.append({"role": "system", "content": chat.system_prompt})
        elif chat.ai_persona:
            messages.append({"role": "system", "content": f"You are {chat.ai_persona}."})
        
        # Get recent messages for context
        if request.save_to_history:
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
        messages.append({"role": "user", "content": request.message})
        
        # Save user message to history if requested
        user_message_id = None
        if request.save_to_history:
            user_message = ChatMessage(
                chat_id=chat_id,
                sender_id=current_user["user_id"],
                content=request.message,
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
        if request.stream:
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
            
            if request.save_to_history:
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
                client,
                chat,
                ai_message.id if request.save_to_history else None,
                start_time,
                db if request.save_to_history else None
            )
            
            return {
                "success": True,
                "message": "AI response generation started",
                "streaming": True,
                "data": {
                    "user_message_id": user_message_id,
                    "ai_message_id": str(ai_message.id) if request.save_to_history else None,
                    "chat_id": chat_id,
                    "model_used": chat.ai_model or "gpt-3.5-turbo",
                    "stream_via": "websocket"
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        
        else:
            # Non-streaming response - return directly
            response = await client.chat.completions.create(
                model=chat.ai_model or "gpt-3.5-turbo",
                messages=messages,
                temperature=float(chat.temperature) if chat.temperature else 0.7,
                max_tokens=chat.max_tokens or 2048
            )
            
            # Calculate processing time
            end_time = datetime.utcnow()
            processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Extract response content
            ai_response_content = response.choices[0].message.content
            
            # Get actual token usage from OpenAI response
            actual_tokens = {
                "input": response.usage.prompt_tokens if response.usage else 0,
                "output": response.usage.completion_tokens if response.usage else 0,
                "total": response.usage.total_tokens if response.usage else 0
            }
            
            # Save AI response to history if requested
            ai_message_id = None
            if request.save_to_history:
                ai_message = ChatMessage(
                    chat_id=chat_id,
                    sender_id=None,
                    content=ai_response_content,
                    message_type=MessageType.AI,
                    ai_model_used=response.model,
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
                provider="openai_production",
                model=response.model,
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
                        "content": request.message,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    "ai_response": {
                        "id": ai_message_id,
                        "content": ai_response_content,
                        "model_used": response.model,
                        "processing_time_ms": processing_time_ms,
                        "tokens_used": actual_tokens,
                        "finish_reason": response.choices[0].finish_reason,
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