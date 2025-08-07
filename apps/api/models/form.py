"""
Form models for Adaptive Cards Designer
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, UniqueConstraint, Index, Table
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class FormStatus(str, PyEnum):
    """Form status enumeration"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class FormVisibility(str, PyEnum):
    """Form visibility levels"""
    PRIVATE = "private"
    ORGANIZATION = "organization"
    PUBLIC = "public"


class FormSharePermission(str, PyEnum):
    """Form sharing permission levels"""
    VIEW = "view"
    EDIT = "edit"
    ADMIN = "admin"


# Association table for form collaborators
form_collaborators = Table(
    'form_collaborators',
    Base.metadata,
    Column('form_id', UUID(as_uuid=True), ForeignKey('forms.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('permission', Enum(FormSharePermission), default=FormSharePermission.VIEW, nullable=False),
    Column('created_at', DateTime, default=datetime.utcnow, nullable=False),
    Column('created_by', UUID(as_uuid=True), ForeignKey('users.id'), nullable=False),
    Index('idx_form_collaborators_form', 'form_id'),
    Index('idx_form_collaborators_user', 'user_id'),
)


class Form(Base):
    """Main form model for storing Adaptive Cards forms"""
    __tablename__ = "forms"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Form metadata
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Form definition (Adaptive Card JSON)
    schema_version = Column(String(10), default='1.5', nullable=False)
    adaptive_card_json = Column(JSON, nullable=False)
    
    # Form elements for designer (internal structure)
    elements_json = Column(JSON, nullable=True)
    
    # Form configuration
    status = Column(Enum(FormStatus), default=FormStatus.DRAFT, nullable=False, index=True)
    visibility = Column(Enum(FormVisibility), default=FormVisibility.PRIVATE, nullable=False)
    is_template = Column(Boolean, default=False, nullable=False, index=True)
    allow_anonymous = Column(Boolean, default=False, nullable=False)
    
    # Form settings
    submit_message = Column(Text, nullable=True)
    redirect_url = Column(String(500), nullable=True)
    email_notifications = Column(JSON, nullable=True)  # List of email addresses
    webhook_url = Column(String(500), nullable=True)
    
    # Form limits
    max_submissions = Column(Integer, nullable=True)
    submission_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    # Ownership and permissions
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    
    # Versioning
    version = Column(Integer, default=1, nullable=False)
    parent_form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id'), nullable=True)
    
    # Tags and categorization
    tags = Column(JSON, nullable=True)  # List of strings
    category = Column(String(50), nullable=True, index=True)
    
    # Analytics and metadata
    view_count = Column(Integer, default=0, nullable=False)
    last_submitted_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="created_forms")
    parent_form = relationship("Form", remote_side=[id], backref="form_versions")
    collaborators = relationship(
        "User", 
        secondary=form_collaborators,
        primaryjoin="Form.id == form_collaborators.c.form_id",
        secondaryjoin="User.id == form_collaborators.c.user_id"
    )
    submissions = relationship("FormSubmission", back_populates="form", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_form_creator_status', 'created_by', 'status'),
        Index('idx_form_template_status', 'is_template', 'status'),
        Index('idx_form_visibility_status', 'visibility', 'status'),
        Index('idx_form_created_at_desc', 'created_at'),
        Index('idx_form_updated_at_desc', 'updated_at'),
    )
    
    @validates('title')
    def validate_title(self, key, title):
        """Validate form title"""
        if not title or len(title.strip()) < 1:
            raise ValueError("Form title cannot be empty")
        if len(title) > 255:
            raise ValueError("Form title cannot exceed 255 characters")
        return title.strip()
    
    @validates('adaptive_card_json')
    def validate_adaptive_card_json(self, key, card_json):
        """Validate Adaptive Card JSON structure"""
        if not isinstance(card_json, dict):
            raise ValueError("Adaptive card JSON must be a dictionary")
        
        required_fields = ['type', 'version']
        for field in required_fields:
            if field not in card_json:
                raise ValueError(f"Adaptive card JSON must include '{field}' field")
        
        if card_json['type'] != 'AdaptiveCard':
            raise ValueError("Adaptive card type must be 'AdaptiveCard'")
        
        return card_json
    
    @property
    def is_expired(self) -> bool:
        """Check if form has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_submission_allowed(self) -> bool:
        """Check if form accepts new submissions"""
        if self.status != FormStatus.PUBLISHED:
            return False
        if self.is_expired:
            return False
        if self.max_submissions and self.submission_count >= self.max_submissions:
            return False
        return True
    
    @property
    def is_editable_by_user(self) -> bool:
        """Check if form can be edited (not yet implemented - needs user context)"""
        # This would need user context to implement properly
        return True
    
    def increment_view_count(self):
        """Increment the view count"""
        self.view_count += 1
    
    def increment_submission_count(self):
        """Increment the submission count"""
        self.submission_count += 1
        self.last_submitted_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<Form(id={self.id}, title='{self.title}', status={self.status})>"


class FormTemplate(Base):
    """Pre-defined form templates for quick form creation"""
    __tablename__ = "form_templates"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Template metadata
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Template content
    adaptive_card_json = Column(JSON, nullable=False)
    elements_json = Column(JSON, nullable=True)
    
    # Template categorization
    category = Column(String(50), nullable=False, index=True)
    tags = Column(JSON, nullable=True)  # List of strings
    
    # Template settings
    is_public = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    
    # Usage statistics
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Ownership
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    creator = relationship("User", backref="form_templates")
    
    # Indexes
    __table_args__ = (
        Index('idx_template_category_public', 'category', 'is_public'),
        Index('idx_template_featured_public', 'is_featured', 'is_public'),
        Index('idx_template_usage_count', 'usage_count'),
    )
    
    def increment_usage_count(self):
        """Increment template usage count"""
        self.usage_count += 1
    
    def __repr__(self):
        return f"<FormTemplate(id={self.id}, name='{self.name}', category={self.category})>"


class FormSubmission(Base):
    """Form submission data storage"""
    __tablename__ = "form_submissions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Form reference
    form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Submission data
    data = Column(JSON, nullable=False)  # Form field values
    
    # Submission metadata
    submitter_ip = Column(String(45), nullable=True)  # IPv4 or IPv6
    submitter_user_agent = Column(String(500), nullable=True)
    submitter_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Processing status
    is_processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    # Relationships
    form = relationship("Form", back_populates="submissions")
    submitter = relationship("User", backref="form_submissions")
    
    # Indexes
    __table_args__ = (
        Index('idx_submission_form_submitted', 'form_id', 'submitted_at'),
        Index('idx_submission_user_submitted', 'submitter_user_id', 'submitted_at'),
        Index('idx_submission_processed', 'is_processed'),
    )
    
    @validates('data')
    def validate_data(self, key, data):
        """Validate submission data"""
        if not isinstance(data, dict):
            raise ValueError("Submission data must be a dictionary")
        return data
    
    def mark_as_processed(self, error: Optional[str] = None):
        """Mark submission as processed"""
        self.is_processed = True
        self.processed_at = datetime.utcnow()
        if error:
            self.processing_error = error
    
    def __repr__(self):
        return f"<FormSubmission(id={self.id}, form_id={self.form_id}, submitted_at={self.submitted_at})>"


class FormVersion(Base):
    """Form version history for tracking changes"""
    __tablename__ = "form_versions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Form reference
    form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Version information
    version_number = Column(Integer, nullable=False)
    change_description = Column(Text, nullable=True)
    
    # Snapshot of form data at this version
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    adaptive_card_json = Column(JSON, nullable=False)
    elements_json = Column(JSON, nullable=True)
    
    # Version metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    form = relationship("Form", backref="versions")
    creator = relationship("User", backref="form_version_changes")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint('form_id', 'version_number', name='unique_form_version'),
        Index('idx_version_form_number', 'form_id', 'version_number'),
        Index('idx_version_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<FormVersion(id={self.id}, form_id={self.form_id}, version={self.version_number})>"


class FormShare(Base):
    """Form sharing and collaboration settings"""
    __tablename__ = "form_shares"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Form and user references
    form_id = Column(UUID(as_uuid=True), ForeignKey('forms.id', ondelete='CASCADE'), nullable=False, index=True)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    shared_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Sharing settings
    permission = Column(Enum(FormSharePermission), default=FormSharePermission.VIEW, nullable=False)
    can_reshare = Column(Boolean, default=False, nullable=False)
    
    # Share metadata
    message = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Timestamps
    shared_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    form = relationship("Form", backref="shares")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id], backref="received_form_shares")
    shared_by = relationship("User", foreign_keys=[shared_by_user_id], backref="sent_form_shares")
    
    # Indexes
    __table_args__ = (
        UniqueConstraint('form_id', 'shared_with_user_id', name='unique_form_user_share'),
        Index('idx_share_form_permission', 'form_id', 'permission'),
        Index('idx_share_user_permission', 'shared_with_user_id', 'permission'),
        Index('idx_share_expires', 'expires_at'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if share has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_active(self) -> bool:
        """Check if share is currently active"""
        return not self.is_expired
    
    def mark_as_accessed(self):
        """Mark share as recently accessed"""
        self.last_accessed_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<FormShare(id={self.id}, form_id={self.form_id}, permission={self.permission})>"