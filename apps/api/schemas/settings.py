"""
Settings schemas for API requests and responses
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
import uuid


class SystemSettingsBase(BaseModel):
    """Base schema for system settings"""
    # Security Settings
    enable_account_lockout: Optional[bool] = Field(default=False, description="Enable account lockout after failed login attempts")
    max_failed_login_attempts: Optional[int] = Field(default=5, ge=1, le=10, description="Maximum failed login attempts before lockout")
    lockout_duration_minutes: Optional[int] = Field(default=30, ge=5, le=1440, description="Account lockout duration in minutes")
    
    # Password Policy
    min_password_length: Optional[int] = Field(default=8, ge=6, le=128, description="Minimum password length")
    require_uppercase: Optional[bool] = Field(default=True, description="Require uppercase letters in password")
    require_lowercase: Optional[bool] = Field(default=True, description="Require lowercase letters in password")
    require_numbers: Optional[bool] = Field(default=True, description="Require numbers in password")
    require_special_chars: Optional[bool] = Field(default=False, description="Require special characters in password")
    password_expiry_days: Optional[int] = Field(default=None, ge=1, le=365, description="Password expiry in days (null for no expiry)")
    
    # Session Settings
    session_timeout_minutes: Optional[int] = Field(default=60, ge=5, le=1440, description="Session timeout in minutes")
    max_sessions_per_user: Optional[int] = Field(default=5, ge=1, le=20, description="Maximum concurrent sessions per user")
    
    # Rate Limiting
    enable_rate_limiting: Optional[bool] = Field(default=True, description="Enable rate limiting")
    rate_limit_requests_per_minute: Optional[int] = Field(default=60, ge=10, le=1000, description="Maximum requests per minute")
    
    # Two-Factor Authentication
    require_2fa_for_admins: Optional[bool] = Field(default=False, description="Require 2FA for admin users")
    allow_2fa_for_users: Optional[bool] = Field(default=True, description="Allow 2FA for regular users")
    
    # Email Verification
    require_email_verification: Optional[bool] = Field(default=True, description="Require email verification for new users")
    email_verification_expiry_hours: Optional[int] = Field(default=24, ge=1, le=168, description="Email verification link expiry in hours")
    
    # IP Security
    enable_ip_whitelist: Optional[bool] = Field(default=False, description="Enable IP whitelist")
    ip_whitelist: Optional[List[str]] = Field(default=None, description="List of allowed IP addresses")
    enable_ip_blacklist: Optional[bool] = Field(default=False, description="Enable IP blacklist")
    ip_blacklist: Optional[List[str]] = Field(default=None, description="List of blocked IP addresses")
    
    # Audit Settings
    enable_audit_logging: Optional[bool] = Field(default=True, description="Enable audit logging")
    audit_retention_days: Optional[int] = Field(default=90, ge=7, le=365, description="Audit log retention in days")


class SystemSettingsCreate(SystemSettingsBase):
    """Schema for creating system settings"""
    pass


class SystemSettingsUpdate(BaseModel):
    """Schema for updating system settings (all fields optional)"""
    # Security Settings
    enable_account_lockout: Optional[bool] = None
    max_failed_login_attempts: Optional[int] = Field(None, ge=1, le=10)
    lockout_duration_minutes: Optional[int] = Field(None, ge=5, le=1440)
    
    # Password Policy
    min_password_length: Optional[int] = Field(None, ge=6, le=128)
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_numbers: Optional[bool] = None
    require_special_chars: Optional[bool] = None
    password_expiry_days: Optional[int] = Field(None, ge=1, le=365)
    
    # Session Settings
    session_timeout_minutes: Optional[int] = Field(None, ge=5, le=1440)
    max_sessions_per_user: Optional[int] = Field(None, ge=1, le=20)
    
    # Rate Limiting
    enable_rate_limiting: Optional[bool] = None
    rate_limit_requests_per_minute: Optional[int] = Field(None, ge=10, le=1000)
    
    # Two-Factor Authentication
    require_2fa_for_admins: Optional[bool] = None
    allow_2fa_for_users: Optional[bool] = None
    
    # Email Verification
    require_email_verification: Optional[bool] = None
    email_verification_expiry_hours: Optional[int] = Field(None, ge=1, le=168)
    
    # IP Security
    enable_ip_whitelist: Optional[bool] = None
    ip_whitelist: Optional[List[str]] = None
    enable_ip_blacklist: Optional[bool] = None
    ip_blacklist: Optional[List[str]] = None
    
    # Audit Settings
    enable_audit_logging: Optional[bool] = None
    audit_retention_days: Optional[int] = Field(None, ge=7, le=365)


class SystemSettingsResponse(SystemSettingsBase):
    """Schema for system settings response"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[uuid.UUID]
    
    class Config:
        orm_mode = True


class SecuritySettingsResponse(BaseModel):
    """Response schema for security settings summary"""
    account_lockout: Dict[str, Any] = Field(description="Account lockout configuration")
    password_policy: Dict[str, Any] = Field(description="Password policy configuration")
    session: Dict[str, Any] = Field(description="Session configuration")
    rate_limiting: Dict[str, Any] = Field(description="Rate limiting configuration")
    two_factor: Dict[str, Any] = Field(description="Two-factor authentication configuration")
    email_verification: Dict[str, Any] = Field(description="Email verification configuration")
    ip_security: Dict[str, Any] = Field(description="IP security configuration")
    audit: Dict[str, Any] = Field(description="Audit configuration")