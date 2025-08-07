"""
User models for authentication and profile management
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Enum, ForeignKey, UniqueConstraint, Index, LargeBinary
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class UserRole(str, PyEnum):
    """User roles within the system"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class UserStatus(str, PyEnum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class User(Base):
    """Core user model for authentication and basic info"""
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Basic info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    
    
    # Account status
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    
    # Security fields
    password_changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(32), nullable=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_email_status', 'email', 'status'),
        Index('idx_user_created_at', 'created_at'),
        Index('idx_user_role_status', 'role', 'status'),
    )
    
    @validates('email')
    def validate_email(self, key, email):
        """Validate email format"""
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Invalid email format")
        return email.lower()
    
    @validates('username')
    def validate_username(self, key, username):
        """Validate username format"""
        if username:
            import re
            if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', username):
                raise ValueError("Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores")
        return username
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges"""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    
    @property
    def is_locked(self) -> bool:
        """Check if account is locked"""
        if not self.locked_until:
            return False
        return datetime.utcnow() < self.locked_until
    
    def can_login(self) -> bool:
        """Check if user can login"""
        return (
            self.is_active and 
            self.status == UserStatus.ACTIVE and
            not self.is_locked
        )
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class UserProfile(Base):
    """Extended user profile information"""
    __tablename__ = "user_profiles"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Profile information
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    job_title = Column(String(100), nullable=True)
    company = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    timezone = Column(String(50), default='UTC', nullable=False)
    language = Column(String(10), default='en', nullable=False)
    
    # Contact information
    phone = Column(String(20), nullable=True)
    website = Column(String(200), nullable=True)
    linkedin_url = Column(String(200), nullable=True)
    github_url = Column(String(200), nullable=True)
    
    # Professional information
    skills = Column(JSON, nullable=True)  # List of skills
    certifications = Column(JSON, nullable=True)  # List of certifications
    experience_years = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    
    def __repr__(self):
        return f"<UserProfile(id={self.id}, user_id={self.user_id})>"


class UserPreferences(Base):
    """User application preferences and settings"""
    __tablename__ = "user_preferences"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # UI Preferences
    theme = Column(String(20), default='light', nullable=False)  # light, dark, auto
    sidebar_collapsed = Column(Boolean, default=False, nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    email_notifications = Column(Boolean, default=True, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    
    # AI Preferences
    default_ai_model = Column(String(50), default='gpt-4o', nullable=False)
    ai_response_style = Column(String(20), default='balanced', nullable=False)  # concise, balanced, detailed
    ai_creativity_level = Column(Integer, default=5, nullable=False)  # 1-10 scale
    enable_ai_suggestions = Column(Boolean, default=True, nullable=False)
    
    # Privacy Settings
    profile_visibility = Column(String(20), default='organization', nullable=False)  # public, organization, private
    show_online_status = Column(Boolean, default=True, nullable=False)
    allow_data_collection = Column(Boolean, default=True, nullable=False)
    
    # Workflow Preferences
    default_workflow_timeout = Column(Integer, default=3600, nullable=False)  # seconds
    auto_save_interval = Column(Integer, default=300, nullable=False)  # seconds
    enable_keyboard_shortcuts = Column(Boolean, default=True, nullable=False)
    
    # Custom settings (JSON for extensibility)
    custom_settings = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="preferences")
    
    @validates('ai_creativity_level')
    def validate_creativity_level(self, key, level):
        """Validate AI creativity level is within range"""
        if not 1 <= level <= 10:
            raise ValueError("AI creativity level must be between 1 and 10")
        return level
    
    @validates('theme')
    def validate_theme(self, key, theme):
        """Validate theme value"""
        allowed_themes = ['light', 'dark', 'auto']
        if theme not in allowed_themes:
            raise ValueError(f"Theme must be one of: {allowed_themes}")
        return theme
    
    @validates('ai_response_style')
    def validate_response_style(self, key, style):
        """Validate AI response style"""
        allowed_styles = ['concise', 'balanced', 'detailed']
        if style not in allowed_styles:
            raise ValueError(f"AI response style must be one of: {allowed_styles}")
        return style
    
    @validates('profile_visibility')
    def validate_profile_visibility(self, key, visibility):
        """Validate profile visibility setting"""
        allowed_visibility = ['public', 'organization', 'private']
        if visibility not in allowed_visibility:
            raise ValueError(f"Profile visibility must be one of: {allowed_visibility}")
        return visibility
    
    def __repr__(self):
        return f"<UserPreferences(id={self.id}, user_id={self.user_id})>"


class UserApiKey(Base):
    """Encrypted storage for user API keys"""
    __tablename__ = "user_api_keys"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # API key information
    provider = Column(String(50), nullable=False)  # openai, anthropic, groq, etc.
    key_name = Column(String(100), nullable=False)  # user-friendly name for the key
    encrypted_key = Column(LargeBinary, nullable=False)  # AES encrypted API key
    key_hash = Column(String(64), nullable=False)  # SHA256 hash for verification
    
    # Metadata
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", backref="api_keys")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'provider', 'key_name', name='unique_user_provider_key'),
        Index('idx_user_api_key_provider', 'user_id', 'provider'),
        Index('idx_api_key_active', 'is_active'),
    )
    
    @validates('provider')
    def validate_provider(self, key, provider):
        """Validate API key provider"""
        allowed_providers = ['openai', 'anthropic', 'groq', 'huggingface', 'local']
        if provider.lower() not in allowed_providers:
            raise ValueError(f"Provider must be one of: {allowed_providers}")
        return provider.lower()
    
    @validates('key_name')
    def validate_key_name(self, key, key_name):
        """Validate key name format"""
        if not key_name or len(key_name.strip()) < 1:
            raise ValueError("Key name cannot be empty")
        if len(key_name) > 100:
            raise ValueError("Key name cannot exceed 100 characters")
        return key_name.strip()
    
    def mark_as_used(self):
        """Mark API key as recently used"""
        self.last_used_at = datetime.utcnow()
        self.usage_count += 1
    
    def __repr__(self):
        return f"<UserApiKey(id={self.id}, user_id={self.user_id}, provider={self.provider})>"


class RefreshToken(Base):
    """Refresh token storage for authentication"""
    __tablename__ = "refresh_tokens"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Token information
    token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256 hash
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    
    # Device/session information
    device_info = Column(String(200), nullable=True)  # User agent or device identifier
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="refresh_tokens")
    
    # Indexes
    __table_args__ = (
        Index('idx_refresh_token_user_active', 'user_id', 'is_revoked'),
        Index('idx_refresh_token_expires', 'expires_at'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if token is valid (not revoked and not expired)"""
        return not self.is_revoked and not self.is_expired
    
    def revoke(self):
        """Revoke the refresh token"""
        self.is_revoked = True
    
    def mark_as_used(self):
        """Mark token as recently used"""
        self.last_used_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class PasswordResetToken(Base):
    """Password reset token storage"""
    __tablename__ = "password_reset_tokens"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Token information
    token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256 hash
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    
    # Request information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="password_reset_tokens")
    
    # Indexes
    __table_args__ = (
        Index('idx_password_reset_user', 'user_id'),
        Index('idx_password_reset_expires', 'expires_at'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class EmailVerificationToken(Base):
    """Email verification token storage"""
    __tablename__ = "email_verification_tokens"
    
    # Primary key and foreign key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Token information
    token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256 hash
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    
    # Email information
    email = Column(String(255), nullable=False)  # Email being verified
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="email_verification_tokens")
    
    # Indexes
    __table_args__ = (
        Index('idx_email_verification_user', 'user_id'),
        Index('idx_email_verification_expires', 'expires_at'),
        Index('idx_email_verification_email', 'email'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if token is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = datetime.utcnow()
    
    def __repr__(self):
        return f"<EmailVerificationToken(id={self.id}, user_id={self.user_id}, email={self.email})>"