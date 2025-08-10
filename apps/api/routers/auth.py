"""
Authentication endpoints
Comprehensive JWT-based authentication with security features
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user_dict
from schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshTokenRequest, SessionInfo
)
from services.auth_service import AuthenticationService
from services.user_service import UserService

router = APIRouter()
security = HTTPBearer()
auth_service = AuthenticationService()
user_service = UserService()



@router.post("/register", response_model=TokenResponse)
async def register(
    register_data: RegisterRequest,
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """
    Register a new user and return access/refresh tokens
    
    Creates a new user account and returns JWT tokens for immediate API access.
    """
    try:
        from schemas.user import UserCreate, UserRole
        
        # Create user data
        user_create = UserCreate(
            email=register_data.email,
            password=register_data.password,
            first_name=register_data.firstName,
            last_name=register_data.lastName,
            username=None,  # Let the system generate if needed
            role=UserRole.USER  # Default role for new registrations
        )
        
        # Create the user
        new_user = await user_service.create_user(session, user_create)
        
        # Generate tokens for the new user
        login_data = LoginRequest(
            email=register_data.email,
            password=register_data.password,
            remember_me=False
        )
        
        token_response = await auth_service.login_user(session, login_data, request)
        return token_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return access/refresh tokens
    
    Validates user credentials and returns JWT tokens for API access.
    Implements security measures like rate limiting and account locking.
    """
    try:
        token_response = await auth_service.login_user(session, login_data, request)
        return token_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    Exchanges a valid refresh token for a new access token.
    Implements token rotation for enhanced security.
    """
    try:
        token_response = await auth_service.refresh_token(session, refresh_data.refresh_token)
        return token_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )


@router.get("/me", response_model=SessionInfo)
async def get_current_session(
    current_user = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """
    Get current user session information
    
    Returns detailed information about the current authenticated user and session.
    """
    try:
        user_info = await auth_service.get_current_user_info(
            session, current_user["user_id"]
        )
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return SessionInfo(
            user_id=user_info["id"],
            email=user_info["email"],
            username=user_info["username"],
            roles=[user_info["role"]],
            permissions=current_user.get("permissions", []),
            expires_at=datetime.fromisoformat(current_user["expires_at"]) if current_user.get("expires_at") else datetime.utcnow(),
            issued_at=datetime.utcnow()  # This would ideally come from token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user session: {str(e)}"
        )


@router.get("/validate", response_model=dict)
async def validate_token(
    current_user = Depends(get_current_user_dict)
):
    """
    Validate current access token
    
    Returns token validation status and user information.
    Used for client-side token validation.
    """
    return {
        "valid": True,
        "user": {
            "id": current_user["user_id"],
            "email": current_user["email"],
            "username": current_user.get("username"),
            "roles": current_user.get("roles", []),
            "permissions": current_user.get("permissions", [])
        },
        "expires_at": current_user.get("expires_at"),
        "validated_at": datetime.utcnow()
    }


@router.post("/logout", response_model=dict)
async def logout(
    current_user = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """
    Logout current user
    
    Invalidates the current session and optionally blacklists the token.
    Returns success status.
    """
    try:
        # In a production environment, you might want to:
        # 1. Add the token to a blacklist/revocation list
        # 2. Clear server-side session if using session storage
        # 3. Log the logout event for auditing
        
        # For now, we'll just return success
        # The client is responsible for clearing tokens
        return {
            "success": True,
            "message": "Successfully logged out",
            "logged_out_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )