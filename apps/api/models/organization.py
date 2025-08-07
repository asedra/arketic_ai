"""
Organization models for multi-tenancy and team management
"""

from datetime import datetime
from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, UniqueConstraint, Index, Numeric
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class OrganizationRole(str, PyEnum):
    """User roles within an organization"""
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    GUEST = "guest"


class PersonRole(str, PyEnum):
    """Person roles within an organization"""
    ADMIN = "Admin"
    USER = "User"
    MANAGER = "Manager"
    VIEWER = "Viewer"


class PersonStatus(str, PyEnum):
    """Person status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class OrganizationStatus(str, PyEnum):
    """Organization status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class SubscriptionTier(str, PyEnum):
    """Subscription tiers"""
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Organization(Base):
    """Organization model for multi-tenancy"""
    __tablename__ = "organizations"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic information
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Contact information
    website = Column(String(200), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Address
    address_line1 = Column(String(200), nullable=True)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Organization settings
    logo_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default='UTC', nullable=False)
    default_language = Column(String(10), default='en', nullable=False)
    
    # Status and subscription
    status = Column(Enum(OrganizationStatus), default=OrganizationStatus.TRIAL, nullable=False)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    
    # Limits and quotas
    max_members = Column(Integer, default=5, nullable=False)
    max_storage_gb = Column(Integer, default=1, nullable=False)
    max_ai_requests_per_month = Column(Integer, default=1000, nullable=False)
    
    # Usage tracking
    current_members = Column(Integer, default=0, nullable=False)
    current_storage_mb = Column(Integer, default=0, nullable=False)
    ai_requests_this_month = Column(Integer, default=0, nullable=False)
    
    # Billing
    billing_email = Column(String(255), nullable=True)
    tax_id = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    subscription_ends_at = Column(DateTime, nullable=True)
    
    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_org_status', 'status'),
        Index('idx_org_subscription', 'subscription_tier'),
        Index('idx_org_created', 'created_at'),
    )
    
    @validates('slug')
    def validate_slug(self, key, slug):
        """Validate organization slug"""
        import re
        if not re.match(r'^[a-z0-9-]+$', slug):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        if len(slug) < 3 or len(slug) > 50:
            raise ValueError("Slug must be between 3 and 50 characters")
        return slug
    
    @property
    def is_active(self) -> bool:
        """Check if organization is active"""
        return self.status == OrganizationStatus.ACTIVE
    
    @property
    def is_trial(self) -> bool:
        """Check if organization is on trial"""
        return self.status == OrganizationStatus.TRIAL
    
    @property
    def members_limit_reached(self) -> bool:
        """Check if member limit is reached"""
        return self.current_members >= self.max_members
    
    def __repr__(self):
        return f"<Organization(id={self.id}, name={self.name}, slug={self.slug})>"


class OrganizationMember(Base):
    """Organization membership model"""
    __tablename__ = "organization_members"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Membership details
    role = Column(Enum(OrganizationRole), default=OrganizationRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Invitation details
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    invitation_token = Column(String(100), unique=True, nullable=True)
    invitation_expires_at = Column(DateTime, nullable=True)
    invitation_accepted_at = Column(DateTime, nullable=True)
    
    # Activity tracking
    last_activity_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    
    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint('organization_id', 'user_id', name='uq_org_member'),
        Index('idx_member_org', 'organization_id'),
        Index('idx_member_user', 'user_id'),
        Index('idx_member_role', 'role'),
        Index('idx_member_active', 'is_active'),
    )
    
    @property
    def is_owner(self) -> bool:
        """Check if member is organization owner"""
        return self.role == OrganizationRole.OWNER
    
    @property
    def is_admin(self) -> bool:
        """Check if member has admin privileges"""
        return self.role in [OrganizationRole.OWNER, OrganizationRole.ADMIN]
    
    @property
    def can_manage_members(self) -> bool:
        """Check if member can manage other members"""
        return self.role in [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MANAGER]
    
    @property
    def has_left(self) -> bool:
        """Check if member has left the organization"""
        return self.left_at is not None
    
    def __repr__(self):
        return f"<OrganizationMember(id={self.id}, org={self.organization_id}, user={self.user_id}, role={self.role})>"


class Person(Base):
    """Person model for organization members"""
    __tablename__ = "people"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to organization (optional)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(20), nullable=True)
    
    # Professional information
    job_title = Column(String(200), nullable=True)
    department = Column(String(100), nullable=True)
    site = Column(String(200), nullable=True)
    location = Column(String(200), nullable=True)
    
    # System information
    role = Column(Enum(PersonRole), default=PersonRole.USER, nullable=False)
    status = Column(Enum(PersonStatus), default=PersonStatus.ACTIVE, nullable=False)
    
    # Dates
    hire_date = Column(DateTime, nullable=True)
    
    # Manager relationship (self-referential)
    manager_id = Column(UUID(as_uuid=True), ForeignKey('people.id', ondelete='SET NULL'), nullable=True)
    
    # Additional metadata
    notes = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    organization = relationship("Organization")
    manager = relationship("Person", remote_side=[id], back_populates="direct_reports")
    direct_reports = relationship("Person", back_populates="manager")
    
    # Constraints and indexes
    __table_args__ = (
        Index('idx_person_org', 'organization_id'),
        Index('idx_person_email', 'email'),
        Index('idx_person_department', 'department'),
        Index('idx_person_status', 'status'),
        Index('idx_person_manager', 'manager_id'),
    )
    
    @validates('email')
    def validate_email(self, key, email):
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        return email.lower()
    
    @property
    def full_name(self) -> str:
        """Get person's full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_active(self) -> bool:
        """Check if person is active"""
        return self.status == PersonStatus.ACTIVE
    
    @property
    def is_manager(self) -> bool:
        """Check if person has direct reports"""
        return len(self.direct_reports) > 0
    
    def __repr__(self):
        return f"<Person(id={self.id}, name={self.full_name}, email={self.email})>"