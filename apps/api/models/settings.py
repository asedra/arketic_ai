"""
Settings models for storing user configuration and API keys
"""

from datetime import datetime
from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, 
    JSON, Float, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, validates
import uuid

from core.database import Base
from core.types import UUID


class SettingsCategory(str, PyEnum):
    """Settings categories"""
    OPENAI = "openai"
    PLATFORM = "platform"
    AI_MODELS = "ai_models"
    NOTIFICATIONS = "notifications"


class UserSettings(Base):
    """User-specific settings and configuration"""
    __tablename__ = "user_settings"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Settings metadata
    category = Column(String(50), nullable=False)
    setting_key = Column(String(100), nullable=False)
    setting_value = Column(Text, nullable=True)
    is_encrypted = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'category', 'setting_key', name='uk_user_settings_key'),
        Index('idx_user_settings_user_category', 'user_id', 'category'),
        Index('idx_user_settings_updated', 'updated_at'),
    )
    
    def __repr__(self):
        return f"<UserSettings(id={self.id}, user_id={self.user_id}, category={self.category}, key={self.setting_key})>"


class OpenAISettings(Base):
    """OpenAI API configuration for users"""
    __tablename__ = "openai_settings"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # OpenAI Configuration
    api_key_encrypted = Column(Text, nullable=True)  # Encrypted API key
    model = Column(String(50), default='gpt-3.5-turbo', nullable=False)
    max_tokens = Column(Integer, default=1000, nullable=False)
    temperature = Column(Float, default=0.7, nullable=False)
    
    # API Usage Tracking
    total_requests = Column(Integer, default=0, nullable=False)
    total_tokens_used = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Connection Status
    is_connection_verified = Column(Boolean, default=False, nullable=False)
    last_connection_test_at = Column(DateTime, nullable=True)
    connection_test_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_openai_settings_user', 'user_id'),
        Index('idx_openai_settings_updated', 'updated_at'),
        Index('idx_openai_settings_last_used', 'last_used_at'),
    )
    
    @validates('model')
    def validate_model(self, key, model):
        """Validate OpenAI model"""
        allowed_models = [
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4-turbo',
            'gpt-4o',
            'gpt-4o-mini'
        ]
        if model not in allowed_models:
            raise ValueError(f"Model must be one of: {allowed_models}")
        return model
    
    @validates('max_tokens')
    def validate_max_tokens(self, key, max_tokens):
        """Validate max tokens range"""
        if not 1 <= max_tokens <= 8192:
            raise ValueError("Max tokens must be between 1 and 8192")
        return max_tokens
    
    @validates('temperature')
    def validate_temperature(self, key, temperature):
        """Validate temperature range"""
        if not 0.0 <= temperature <= 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")
        return temperature
    
    def __repr__(self):
        return f"<OpenAISettings(id={self.id}, user_id={self.user_id}, model={self.model})>"


class PlatformSettings(Base):
    """Platform-wide settings and configuration"""
    __tablename__ = "platform_settings"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # UI Settings
    theme = Column(String(20), default='light', nullable=False)
    language = Column(String(10), default='en', nullable=False)
    timezone = Column(String(50), default='UTC', nullable=False)
    date_format = Column(String(20), default='YYYY-MM-DD', nullable=False)
    
    # Notification Settings
    email_notifications = Column(Boolean, default=True, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    marketing_emails = Column(Boolean, default=False, nullable=False)
    
    # Privacy Settings
    data_collection_consent = Column(Boolean, default=True, nullable=False)
    analytics_consent = Column(Boolean, default=True, nullable=False)
    
    # Feature Flags
    beta_features_enabled = Column(Boolean, default=False, nullable=False)
    advanced_mode = Column(Boolean, default=False, nullable=False)
    
    # Custom Settings (JSON for extensibility)
    custom_settings = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_platform_settings_user', 'user_id'),
        Index('idx_platform_settings_updated', 'updated_at'),
    )
    
    @validates('theme')
    def validate_theme(self, key, theme):
        """Validate theme value"""
        allowed_themes = ['light', 'dark', 'auto']
        if theme not in allowed_themes:
            raise ValueError(f"Theme must be one of: {allowed_themes}")
        return theme
    
    @validates('language')
    def validate_language(self, key, language):
        """Validate language code"""
        allowed_languages = ['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
        if language not in allowed_languages:
            raise ValueError(f"Language must be one of: {allowed_languages}")
        return language
    
    def __repr__(self):
        return f"<PlatformSettings(id={self.id}, user_id={self.user_id}, theme={self.theme})>"