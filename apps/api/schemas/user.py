"""
User-related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator, Field
from enum import Enum

from models.user import UserRole, UserStatus


class UserResponse(BaseModel):
    """User response schema"""
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="Email address")
    username: Optional[str] = Field(None, description="Username")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="Account status")
    is_verified: bool = Field(..., description="Email verification status")
    is_active: bool = Field(..., description="Account active status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    email_verified_at: Optional[datetime] = Field(None, description="Email verification timestamp")
    two_factor_enabled: bool = Field(..., description="2FA enabled status")
    
    # Profile information (if loaded)
    profile: Optional[Dict[str, Any]] = Field(None, description="User profile data")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "username": "johndoe",
                "first_name": "John",
                "last_name": "Doe",
                "role": "user",
                "status": "active",
                "is_verified": True,
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z",
                "last_login_at": "2024-01-01T12:00:00Z",
                "email_verified_at": "2024-01-01T01:00:00Z",
                "two_factor_enabled": False
            }
        }


class UserCreate(BaseModel):
    """User creation schema (admin only)"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    username: Optional[str] = Field(None, min_length=3, max_length=30, description="Username")
    role: UserRole = Field(default=UserRole.USER, description="User role")
    send_welcome_email: bool = Field(default=True, description="Send welcome email")
    
    @validator('username')
    def validate_username(cls, v):
        if v:
            import re
            if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', v):
                raise ValueError('Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newuser@example.com",
                "password": "SecurePassword123!",
                "first_name": "Jane",
                "last_name": "Smith",
                "username": "janesmith",
                "role": "user",
                "send_welcome_email": True
            }
        }


class UserUpdate(BaseModel):
    """User update schema"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Last name")
    username: Optional[str] = Field(None, min_length=3, max_length=30, description="Username")
    role: Optional[UserRole] = Field(None, description="User role (admin only)")
    status: Optional[UserStatus] = Field(None, description="Account status (admin only)")
    is_active: Optional[bool] = Field(None, description="Account active status (admin only)")
    
    @validator('username')
    def validate_username(cls, v):
        if v:
            import re
            if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', v):
                raise ValueError('Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Jane",
                "last_name": "Smith",
                "username": "janesmith_updated"
            }
        }


class UserProfileUpdate(BaseModel):
    """User profile update schema"""
    bio: Optional[str] = Field(None, max_length=500, description="Biography")
    job_title: Optional[str] = Field(None, max_length=100, description="Job title")
    company: Optional[str] = Field(None, max_length=100, description="Company")
    location: Optional[str] = Field(None, max_length=100, description="Location")
    timezone: Optional[str] = Field(None, max_length=50, description="Timezone")
    language: Optional[str] = Field(None, max_length=10, description="Language code")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    website: Optional[str] = Field(None, max_length=200, description="Website URL")
    linkedin_url: Optional[str] = Field(None, max_length=200, description="LinkedIn URL")
    github_url: Optional[str] = Field(None, max_length=200, description="GitHub URL")
    skills: Optional[List[str]] = Field(None, description="List of skills")
    certifications: Optional[List[str]] = Field(None, description="List of certifications")
    experience_years: Optional[int] = Field(None, ge=0, le=50, description="Years of experience")
    
    class Config:
        json_schema_extra = {
            "example": {
                "bio": "Software engineer passionate about AI and machine learning",
                "job_title": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "San Francisco, CA",
                "timezone": "America/Los_Angeles",
                "language": "en",
                "phone": "+1-555-123-4567",
                "website": "https://johndoe.com",
                "linkedin_url": "https://linkedin.com/in/johndoe",
                "github_url": "https://github.com/johndoe",
                "skills": ["Python", "JavaScript", "Machine Learning"],
                "certifications": ["AWS Certified Developer"],
                "experience_years": 5
            }
        }


class UserPreferencesUpdate(BaseModel):
    """User preferences update schema"""
    theme: Optional[str] = Field(None, pattern="^(light|dark|auto)$", description="UI theme")
    sidebar_collapsed: Optional[bool] = Field(None, description="Sidebar collapsed state")
    notifications_enabled: Optional[bool] = Field(None, description="Notifications enabled")
    email_notifications: Optional[bool] = Field(None, description="Email notifications")
    push_notifications: Optional[bool] = Field(None, description="Push notifications")
    default_ai_model: Optional[str] = Field(None, max_length=50, description="Default AI model")
    ai_response_style: Optional[str] = Field(None, pattern="^(concise|balanced|detailed)$", description="AI response style")
    ai_creativity_level: Optional[int] = Field(None, ge=1, le=10, description="AI creativity level (1-10)")
    enable_ai_suggestions: Optional[bool] = Field(None, description="Enable AI suggestions")
    profile_visibility: Optional[str] = Field(None, pattern="^(public|organization|private)$", description="Profile visibility")
    show_online_status: Optional[bool] = Field(None, description="Show online status")
    allow_data_collection: Optional[bool] = Field(None, description="Allow data collection")
    default_workflow_timeout: Optional[int] = Field(None, ge=60, le=86400, description="Default workflow timeout (seconds)")
    auto_save_interval: Optional[int] = Field(None, ge=30, le=3600, description="Auto-save interval (seconds)")
    enable_keyboard_shortcuts: Optional[bool] = Field(None, description="Enable keyboard shortcuts")
    custom_settings: Optional[Dict[str, Any]] = Field(None, description="Custom settings")
    
    class Config:
        json_schema_extra = {
            "example": {
                "theme": "dark",
                "sidebar_collapsed": False,
                "notifications_enabled": True,
                "email_notifications": True,
                "push_notifications": False,
                "default_ai_model": "gpt-4o",
                "ai_response_style": "balanced",
                "ai_creativity_level": 7,
                "enable_ai_suggestions": True,
                "profile_visibility": "organization",
                "show_online_status": True,
                "allow_data_collection": True,
                "default_workflow_timeout": 3600,
                "auto_save_interval": 300,
                "enable_keyboard_shortcuts": True
            }
        }


class UserListResponse(BaseModel):
    """User list response schema"""
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total number of pages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "user@example.com",
                        "username": "johndoe",
                        "first_name": "John",
                        "last_name": "Doe",
                        "role": "user",
                        "status": "active",
                        "is_verified": True,
                        "is_active": True,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T12:00:00Z",
                        "last_login_at": "2024-01-01T12:00:00Z",
                        "email_verified_at": "2024-01-01T01:00:00Z",
                        "two_factor_enabled": False
                    }
                ],
                "total": 1,
                "page": 1,
                "per_page": 10,
                "pages": 1
            }
        }


class EnableTwoFactorResponse(BaseModel):
    """Enable 2FA response schema"""
    qr_code: str = Field(..., description="QR code for authenticator app")
    secret: str = Field(..., description="Secret key for manual entry")
    backup_codes: List[str] = Field(..., description="Backup codes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhE...",
                "secret": "JBSWY3DPEHPK3PXP",
                "backup_codes": ["12345678", "87654321", "11223344"]
            }
        }


class VerifyTwoFactorRequest(BaseModel):
    """Verify 2FA request schema"""
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "123456"
            }
        }