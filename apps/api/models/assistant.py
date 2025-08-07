"""
Assistant models for AI assistant management
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, UniqueConstraint, Index, Float, Table
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class AIModel(str, PyEnum):
    """Supported AI Models"""
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4_TURBO = "gpt-4-turbo"
    GPT_4 = "gpt-4"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    GPT_3_5_TURBO_16K = "gpt-3.5-turbo-16k"
    CLAUDE_3_5_SONNET = "claude-3-5-sonnet"
    CLAUDE_3_OPUS = "claude-3-opus"
    CLAUDE_3_HAIKU = "claude-3-haiku"


class AssistantStatus(str, PyEnum):
    """Assistant status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"
    ARCHIVED = "archived"


# TODO: Uncomment when KnowledgeBase and KnowledgeDocument models are created
# Association table for many-to-many relationship between assistants and knowledge bases
# assistant_knowledge_bases = Table(
#     'assistant_knowledge_bases',
#     Base.metadata,
#     Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
#     Column('assistant_id', UUID(as_uuid=True), ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
#     Column('knowledge_base_id', UUID(as_uuid=True), ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
#     Column('created_at', DateTime, default=datetime.utcnow, nullable=False),
#     UniqueConstraint('assistant_id', 'knowledge_base_id', name='unique_assistant_knowledge_base')
# )


# Association table for many-to-many relationship between assistants and documents
# assistant_documents = Table(
#     'assistant_documents',
#     Base.metadata,
#     Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
#     Column('assistant_id', UUID(as_uuid=True), ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
#     Column('document_id', UUID(as_uuid=True), ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
#     Column('created_at', DateTime, default=datetime.utcnow, nullable=False),
#     UniqueConstraint('assistant_id', 'document_id', name='unique_assistant_document')
# )


class Assistant(Base):
    """AI Assistant model"""
    __tablename__ = "assistants"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic info
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # AI Configuration
    system_prompt = Column(Text, nullable=True)
    ai_model = Column(Enum(AIModel), default=AIModel.GPT_4O, nullable=False)
    temperature = Column(Float, default=0.7, nullable=False)
    max_tokens = Column(Integer, default=2048, nullable=False)
    
    # Status and ownership
    status = Column(Enum(AssistantStatus), default=AssistantStatus.ACTIVE, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    creator_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Usage statistics
    total_conversations = Column(Integer, default=0, nullable=False)
    total_messages = Column(Integer, default=0, nullable=False)
    total_tokens_used = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Configuration options (JSON)
    configuration = Column(JSON, nullable=True)  # Additional configuration options
    
    # Relationships
    creator = relationship("User", backref="assistants")
    
    # Knowledge relationships - simplified without actual models for now
    def get_knowledge_bases(self):
        """Get associated knowledge bases (placeholder)"""
        return []
    
    def get_documents(self):
        """Get associated documents (placeholder)"""
        return []
    
    # Indexes
    __table_args__ = (
        Index('idx_assistant_creator_status', 'creator_id', 'status'),
        Index('idx_assistant_model', 'ai_model'),
        Index('idx_assistant_created_at', 'created_at'),
        Index('idx_assistant_name', 'name'),
        Index('idx_assistant_public_status', 'is_public', 'status'),
    )
    
    @validates('name')
    def validate_name(self, key, name):
        """Validate assistant name"""
        if not name or len(name.strip()) < 1:
            raise ValueError("Assistant name cannot be empty")
        if len(name) > 200:
            raise ValueError("Assistant name cannot exceed 200 characters")
        return name.strip()
    
    @validates('temperature')
    def validate_temperature(self, key, temperature):
        """Validate temperature range"""
        if not 0.0 <= temperature <= 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")
        return temperature
    
    @validates('max_tokens')
    def validate_max_tokens(self, key, max_tokens):
        """Validate max tokens"""
        if max_tokens < 1 or max_tokens > 32000:
            raise ValueError("Max tokens must be between 1 and 32000")
        return max_tokens
    
    @property
    def is_active(self) -> bool:
        """Check if assistant is active"""
        return self.status == "active"
    
    @property
    def knowledge_count(self) -> int:
        """Get total knowledge base count"""
        return len(self.get_knowledge_bases())
    
    @property
    def document_count(self) -> int:
        """Get total document count"""
        return len(self.get_documents())
    
    def mark_as_used(self):
        """Mark assistant as recently used"""
        self.last_used_at = datetime.utcnow()
        self.total_messages += 1
    
    def add_token_usage(self, token_count: int):
        """Add to token usage statistics"""
        self.total_tokens_used += token_count
    
    def increment_conversations(self):
        """Increment conversation count"""
        self.total_conversations += 1
    
    def get_model_display_name(self) -> str:
        """Get user-friendly model name"""
        model_names = {
            "gpt-4o": "GPT-4o",
            "gpt-4o-mini": "GPT-4o Mini",
            "gpt-4-turbo": "GPT-4 Turbo",
            "gpt-4": "GPT-4",
            "gpt-3.5-turbo": "GPT-3.5 Turbo",
            "gpt-3.5-turbo-16k": "GPT-3.5 Turbo 16K",
            "claude-3-5-sonnet": "Claude 3.5 Sonnet",
            "claude-3-opus": "Claude 3 Opus",
            "claude-3-haiku": "Claude 3 Haiku"
        }
        return model_names.get(self.ai_model, self.ai_model)
    
    @property
    def ai_model_display(self) -> str:
        """Property to get user-friendly model name for ORM mapping"""
        return self.get_model_display_name()
    
    def can_be_edited_by(self, user_id: str) -> bool:
        """Check if user can edit this assistant"""
        return str(self.creator_id) == str(user_id)
    
    def can_be_used_by(self, user_id: str) -> bool:
        """Check if user can use this assistant"""
        return (
            self.status == "active" and 
            (self.is_public or str(self.creator_id) == str(user_id))
        )
    
    def to_dict(self, include_config: bool = True) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "ai_model": self.ai_model,
            "ai_model_display": self.get_model_display_name(),
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "status": self.status.value if isinstance(self.status, AssistantStatus) else self.status,
            "is_public": self.is_public,
            "creator_id": str(self.creator_id),
            "total_conversations": self.total_conversations,
            "total_messages": self.total_messages,
            "total_tokens_used": self.total_tokens_used,
            "knowledge_count": self.knowledge_count,
            "document_count": self.document_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_used_at": self.last_used_at
        }
        
        if include_config:
            result["system_prompt"] = self.system_prompt
            result["configuration"] = self.configuration
        
        return result
    
    def __repr__(self):
        return f"<Assistant(id={self.id}, name={self.name}, model={self.ai_model})>"


class AssistantUsageLog(Base):
    """Log assistant usage for analytics"""
    __tablename__ = "assistant_usage_logs"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    assistant_id = Column(UUID(as_uuid=True), ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    chat_id = Column(UUID(as_uuid=True), ForeignKey('chats.id', ondelete='SET NULL'), nullable=True)
    
    # Usage data
    action = Column(String(50), nullable=False)  # 'message', 'conversation_start', etc.
    tokens_used = Column(Integer, default=0, nullable=False)
    processing_time_ms = Column(Integer, nullable=True)
    
    # Metadata
    usage_metadata = Column(JSON, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    assistant = relationship("Assistant", backref="usage_logs")
    user = relationship("User", backref="assistant_usage_logs")
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_assistant_date', 'assistant_id', 'created_at'),
        Index('idx_usage_user_date', 'user_id', 'created_at'),
        Index('idx_usage_action', 'action'),
    )
    
    def __repr__(self):
        return f"<AssistantUsageLog(assistant_id={self.assistant_id}, action={self.action})>"