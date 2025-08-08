"""
Knowledge Management Models
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, Float, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from core.database import Base
from core.types import UUID as UUIDType


class CollectionType(str, PyEnum):
    """Collection type"""
    DOCUMENTATION = "documentation"
    FAQ = "faq"
    PRODUCT = "product"
    GENERAL = "general"
    CUSTOM = "custom"


class DocumentSourceType(str, PyEnum):
    """Document source type"""
    FILE = "file"
    URL = "url"
    TEXT = "text"
    API = "api"


class DocumentStatus(str, PyEnum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SearchType(str, PyEnum):
    """Search type"""
    SEMANTIC = "semantic"
    KEYWORD = "keyword"
    HYBRID = "hybrid"


class KnowledgeBase(Base):
    """Knowledge base (collection) model"""
    __tablename__ = "knowledge_bases"
    
    # Primary key
    id = Column(UUIDType(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic info
    creator_id = Column(UUIDType(as_uuid=True), ForeignKey('users.id'), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(CollectionType, values_callable=lambda x: [e.value for e in x]), default=CollectionType.GENERAL.value, nullable=False)
    
    # Access control
    is_public = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Embedding configuration
    embedding_model = Column(String(100), default='text-embedding-3-small', nullable=False)
    embedding_dimensions = Column(Integer, default=1536, nullable=False)
    
    # Statistics
    total_documents = Column(Integer, default=0, nullable=False)
    total_chunks = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    
    # Additional metadata
    kb_metadata = Column('metadata', JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    creator = relationship("User", backref="knowledge_bases")
    documents = relationship("KnowledgeDocument", back_populates="knowledge_base", cascade="all, delete-orphan")
    assistants = relationship(
        "Assistant",
        secondary="assistant_knowledge_bases",
        back_populates="knowledge_bases"
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "type": self.type.value if isinstance(self.type, CollectionType) else self.type,
            "is_public": self.is_public,
            "is_active": self.is_active,
            "total_documents": self.total_documents,
            "total_chunks": self.total_chunks,
            "total_tokens": self.total_tokens,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    def __repr__(self):
        return f"<KnowledgeBase(id={self.id}, name={self.name})>"


class KnowledgeDocument(Base):
    """Document within knowledge base"""
    __tablename__ = "knowledge_documents"
    
    # Primary key
    id = Column(UUIDType(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    knowledge_base_id = Column(UUIDType(as_uuid=True), ForeignKey('knowledge_bases.id'), nullable=False)
    uploader_id = Column(UUIDType(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Document info
    title = Column(String(500), nullable=False)
    source_type = Column(Enum(DocumentSourceType, values_callable=lambda x: [e.value for e in x]), default=DocumentSourceType.FILE.value, nullable=False)
    source_url = Column(String(1000), nullable=True)
    
    # File info
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True)
    
    # Content
    content = Column(Text, nullable=True)
    
    # Processing info
    chunk_count = Column(Integer, default=0, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    processing_status = Column(Enum(DocumentStatus, values_callable=lambda x: [e.value for e in x]), default=DocumentStatus.PENDING.value, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Additional metadata
    tags = Column(JSON, nullable=True)
    doc_metadata = Column('metadata', JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")
    uploader = relationship("User", backref="uploaded_documents")
    assistants = relationship(
        "Assistant",
        secondary="assistant_documents",
        back_populates="documents"
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            "id": str(self.id),
            "knowledge_base_id": str(self.knowledge_base_id),
            "title": self.title,
            "source_type": self.source_type.value if isinstance(self.source_type, DocumentSourceType) else self.source_type,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "chunk_count": self.chunk_count,
            "token_count": self.token_count,
            "processing_status": self.processing_status.value if isinstance(self.processing_status, DocumentStatus) else self.processing_status,
            "tags": self.tags,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    
    def __repr__(self):
        return f"<KnowledgeDocument(id={self.id}, title={self.title})>"