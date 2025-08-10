"""
Authentication-related Pydantic schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, validator, Field


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")
    remember_me: bool = Field(default=False, description="Remember login session")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "remember_me": False
            }
        }



class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: dict = Field(..., description="User information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "user@example.com",
                    "username": "johndoe",
                    "first_name": "John",
                    "last_name": "Doe",
                    "role": "user"
                }
            }
        }


class RegisterRequest(BaseModel):
    """Registration request schema"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    firstName: str = Field(..., min_length=1, max_length=50, description="First name", alias="first_name")
    lastName: str = Field(..., min_length=1, max_length=50, description="Last name", alias="last_name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newuser@example.com",
                "password": "SecurePass123!",
                "firstName": "John",
                "lastName": "Doe"
            }
        }
        populate_by_name = True  # Allow both camelCase and snake_case


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str = Field(..., description="JWT refresh token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }







class AuthErrorResponse(BaseModel):
    """Authentication error response schema"""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    
    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Invalid credentials",
                "error_code": "INVALID_CREDENTIALS"
            }
        }


class SessionInfo(BaseModel):
    """Current session information schema"""
    user_id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    username: Optional[str] = Field(None, description="Username")
    roles: List[str] = Field(..., description="User roles")
    permissions: List[str] = Field(..., description="User permissions")
    expires_at: datetime = Field(..., description="Session expiration time")
    issued_at: datetime = Field(..., description="Session issued time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "username": "johndoe",
                "roles": ["user"],
                "permissions": ["read", "write"],
                "expires_at": "2024-01-01T13:00:00Z",
                "issued_at": "2024-01-01T12:00:00Z"
            }
        }