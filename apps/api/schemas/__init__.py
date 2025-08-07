"""Pydantic schemas for request/response validation"""

from .auth import *
from .user import *
from .people import *

__all__ = [
    # Auth schemas
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "ChangePasswordRequest",
    "ResetPasswordRequest",
    "VerifyEmailRequest",
    
    # User schemas
    "UserResponse",
    "UserCreate",
    "UserUpdate",
    "UserProfileUpdate",
    "UserPreferencesUpdate",
    
    # People schemas
    "PersonBase",
    "PersonCreate",
    "PersonUpdate",
    "PersonResponse",
    "PersonListResponse",
    "PersonSearchRequest",
    "PersonBulkCreateRequest",
    "PersonBulkUpdateRequest",
    "PersonStatsResponse",
]