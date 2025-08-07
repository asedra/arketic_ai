"""
Chat models for real-time messaging and AI conversations
"""

from datetime import datetime
from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, Index, Numeric
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class ChatType(str, PyEnum):
    """Types of chat conversations"""
    DIRECT = "direct"  # 1-on-1 with AI
    GROUP = "group"   # Multiple users + AI
    CHANNEL = "channel"  # Organization-wide channel


class MessageType(str, PyEnum):
    """Types of messages"""
    USER = "user"
    AI = "ai"
    SYSTEM = "system"
    FILE = "file"
    IMAGE = "image"
    AUDIO = "audio"


class MessageStatus(str, PyEnum):
    """Message delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class ParticipantRole(str, PyEnum):
    """Participant roles in chat"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Chat(Base):
    """Chat conversation model"""
    __tablename__ = "chats"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    creator_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Chat details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    chat_type = Column(Enum(ChatType), default=ChatType.DIRECT, nullable=False)
    
    # AI Configuration
    ai_model = Column(String(50), nullable=True)  # Which AI model to use
    ai_persona = Column(String(100), nullable=True)  # AI personality/role
    system_prompt = Column(Text, nullable=True)  # Custom system prompt
    temperature = Column(Numeric(3, 2), default=0.7, nullable=False)  # AI creativity (0.0-1.0)
    max_tokens = Column(Integer, default=2048, nullable=False)
    
    # Chat settings
    is_private = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    allow_file_uploads = Column(Boolean, default=True, nullable=False)
    enable_ai_responses = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # List of tags for organization
    chat_metadata = Column(JSON, nullable=True)  # Additional metadata
    
    # Usage tracking
    message_count = Column(Integer, default=0, nullable=False)
    total_tokens_used = Column(Integer, default=0, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    archived_at = Column(DateTime, nullable=True)
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    participants = relationship("ChatParticipant", back_populates="chat", cascade="all, delete-orphan")
    
    # Indexes for better query performance
    __table_args__ = (
        Index('idx_chat_creator_type', 'creator_id', 'chat_type'),
        Index('idx_chat_creator', 'creator_id'),
        Index('idx_chat_activity', 'last_activity_at', 'is_archived'),  # Composite for common queries
        Index('idx_chat_archived', 'is_archived'),
        Index('idx_chat_private', 'is_private'),
        Index('idx_chat_ai_model', 'ai_model'),  # For filtering by AI model
        Index('idx_chat_created_at', 'created_at'),  # For chronological queries
    )
    
    @validates('temperature')
    def validate_temperature(self, key, temperature):
        """Validate AI temperature parameter"""
        if not 0.0 <= float(temperature) <= 1.0:
            raise ValueError("Temperature must be between 0.0 and 1.0")
        return temperature
    
    @validates('max_tokens')
    def validate_max_tokens(self, key, max_tokens):
        """Validate max tokens parameter"""
        if max_tokens < 1 or max_tokens > 32000:
            raise ValueError("Max tokens must be between 1 and 32000")
        return max_tokens
    
    @property
    def is_active(self) -> bool:
        """Check if chat is active (not archived)"""
        return not self.is_archived
    
    @property
    def participant_count(self) -> int:
        """Get number of participants"""
        return len(self.participants)
    
    def get_latest_message(self) -> Optional['ChatMessage']:
        """Get the latest message in the chat"""
        if self.messages:
            return self.messages[-1]
        return None
    
    def __repr__(self):
        return f"<Chat(id={self.id}, title={self.title}, type={self.chat_type})>"


class ChatMessage(Base):
    """Individual chat message model"""
    __tablename__ = "chat_messages"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    chat_id = Column(UUID(as_uuid=True), ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reply_to_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id'), nullable=True)
    
    # Message content
    message_type = Column(Enum(MessageType), default=MessageType.USER, nullable=False)
    content = Column(Text, nullable=False)
    
    # File attachments
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(50), nullable=True)
    
    # AI specific fields
    ai_model_used = Column(String(50), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    ai_confidence_score = Column(Numeric(5, 4), nullable=True)  # 0.0000-1.0000
    
    # Message status and metadata
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    message_metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    edited_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    reply_to = relationship("ChatMessage", remote_side=[id])
    
    # Indexes optimized for chat queries
    __table_args__ = (
        Index('idx_message_chat_created', 'chat_id', 'created_at', 'is_deleted'),  # Main query index
        Index('idx_message_chat_type', 'chat_id', 'message_type'),  # Filter by type in chat
        Index('idx_message_sender', 'sender_id', 'created_at'),  # User's messages chronologically
        Index('idx_message_type', 'message_type'),
        Index('idx_message_status', 'status'),
        Index('idx_message_deleted', 'is_deleted'),  # Filter deleted messages
        Index('idx_message_reply', 'reply_to_id'),  # For reply chains
        Index('idx_message_ai_model', 'ai_model_used'),  # For AI analytics
    )
    
    @validates('content')
    def validate_content(self, key, content):
        """Validate message content"""
        # Allow empty content for AI messages during streaming (they start empty and get filled)
        if not content or len(content.strip()) == 0:
            # Allow empty content for AI messages (needed for streaming functionality)
            if self.message_type == MessageType.AI:
                return content  # Allow empty content for AI messages during streaming
            raise ValueError("Message content cannot be empty")
        if len(content) > 50000:  # 50k character limit
            raise ValueError("Message content too long")
        return content
    
    @validates('ai_confidence_score')
    def validate_confidence_score(self, key, score):
        """Validate AI confidence score"""
        if score is not None and not 0.0 <= float(score) <= 1.0:
            raise ValueError("AI confidence score must be between 0.0 and 1.0")
        return score
    
    @property
    def is_from_ai(self) -> bool:
        """Check if message is from AI"""
        return self.message_type == MessageType.AI
    
    @property
    def is_from_user(self) -> bool:
        """Check if message is from user"""
        return self.message_type == MessageType.USER
    
    @property
    def has_file(self) -> bool:
        """Check if message has file attachment"""
        return self.file_url is not None
    
    @property
    def is_reply(self) -> bool:
        """Check if message is a reply to another message"""
        return self.reply_to_id is not None
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, chat={self.chat_id}, type={self.message_type})>"


class ChatParticipant(Base):
    """Chat participant model for managing who can access chats"""
    __tablename__ = "chat_participants"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    chat_id = Column(UUID(as_uuid=True), ForeignKey('chats.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Participant details
    role = Column(Enum(ParticipantRole), default=ParticipantRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_muted = Column(Boolean, default=False, nullable=False)
    
    # Access control
    can_send_messages = Column(Boolean, default=True, nullable=False)
    can_upload_files = Column(Boolean, default=True, nullable=False)
    can_invite_others = Column(Boolean, default=False, nullable=False)
    
    # Activity tracking
    last_read_message_id = Column(UUID(as_uuid=True), ForeignKey('chat_messages.id'), nullable=True)
    last_read_at = Column(DateTime, nullable=True)
    message_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    chat = relationship("Chat", back_populates="participants")
    last_read_message = relationship("ChatMessage", foreign_keys=[last_read_message_id])
    
    # Constraints and indexes for participant management
    __table_args__ = (
        Index('idx_participant_chat_user', 'chat_id', 'user_id', unique=True),
        Index('idx_participant_chat_active', 'chat_id', 'is_active'),  # Active participants per chat
        Index('idx_participant_user_active', 'user_id', 'is_active'),  # User's active chats
        Index('idx_participant_role', 'role'),
        Index('idx_participant_permissions', 'can_send_messages', 'can_upload_files'),  # Permission checks
        Index('idx_participant_joined', 'joined_at'),  # For analytics
    )
    
    @property
    def is_owner(self) -> bool:
        """Check if participant is chat owner"""
        return self.role == ParticipantRole.OWNER
    
    @property
    def is_admin(self) -> bool:
        """Check if participant has admin privileges"""
        return self.role in [ParticipantRole.OWNER, ParticipantRole.ADMIN]
    
    @property
    def has_left(self) -> bool:
        """Check if participant has left the chat"""
        return self.left_at is not None
    
    def can_manage_participants(self) -> bool:
        """Check if participant can manage other participants"""
        return self.role in [ParticipantRole.OWNER, ParticipantRole.ADMIN]
    
    def __repr__(self):
        return f"<ChatParticipant(id={self.id}, chat={self.chat_id}, user={self.user_id})>"