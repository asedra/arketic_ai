"""
Enhanced authentication service
Comprehensive authentication, session management, and security features
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, Request

from models.user import User, UserStatus
from schemas.auth import LoginRequest, TokenResponse
from core.security import get_security_manager
from .user_service import UserService
from .token_service import TokenService
from .system_settings_service import get_system_settings_service


class AuthenticationService:
    """Enhanced authentication service with comprehensive security features"""
    
    def __init__(self):
        self._security_manager = None
        self.user_service = UserService()
        self.token_service = TokenService()
        self.system_settings_service = get_system_settings_service()
    
    @property
    def security_manager(self):
        """Lazy initialization of security manager"""
        if self._security_manager is None:
            self._security_manager = get_security_manager()
        return self._security_manager
    
    async def login_user(
        self, 
        session: AsyncSession, 
        login_data: LoginRequest,
        request: Optional[Request] = None
    ) -> TokenResponse:
        """Authenticate user and return tokens"""
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
        
        # Check if IP is blocked
        if ip_address and self.security_manager.is_ip_blocked(ip_address):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="IP address temporarily blocked due to failed attempts"
            )
        
        # Get user first to distinguish credential vs verification issues
        user_for_auth = await self.user_service.get_user_by_email(session, login_data.email)
        
        if not user_for_auth:
            # User doesn't exist - invalid credentials
            if ip_address:
                self.security_manager.record_failed_attempt(login_data.email, ip_address)
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if account lockout is enabled
        lockout_settings = await self.system_settings_service.get_lockout_settings(session)
        
        # Check password
        if not self.security_manager.verify_password(login_data.password, user_for_auth.password_hash):
            # Invalid password
            if ip_address:
                self.security_manager.record_failed_attempt(login_data.email, ip_address)
            
            # Only increment failed attempts and potentially lock account if lockout is enabled
            if lockout_settings["enabled"]:
                await self.user_service.increment_failed_login_attempts(session, str(user_for_auth.id))
            
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Password is correct, check if user can login
        if not user_for_auth.can_login():
            detail = "Account is inactive"
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY  # Default for test compatibility
            
            # Only check for lockout if the feature is enabled
            if lockout_settings["enabled"] and user_for_auth.is_locked:
                detail = "Account is temporarily locked due to failed login attempts"
                status_code = status.HTTP_403_FORBIDDEN  # Keep 403 for security locks
            elif user_for_auth.status == UserStatus.SUSPENDED:
                detail = "Account is suspended"
                status_code = status.HTTP_403_FORBIDDEN  # Keep 403 for suspensions
            elif user_for_auth.status == UserStatus.PENDING_VERIFICATION:
                detail = "Account is pending email verification"
                status_code = status.HTTP_422_UNPROCESSABLE_ENTITY  # Use 422 for verification issues
            
            raise HTTPException(
                status_code=status_code,
                detail=detail
            )
        
        # Authentication successful - clear failed attempts and update login time
        user = user_for_auth  # Use the authenticated user
        if ip_address:
            self.security_manager.clear_failed_attempts(login_data.email, ip_address)
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.failed_login_attempts = 0
        await session.commit()
        
        # Create tokens
        access_token_data = {
            "sub": user.email,
            "user_id": str(user.id),
            "email": user.email,
            "username": user.username,
            "roles": [user.role.value],
            "permissions": self._get_user_permissions(user)
        }
        
        # Set token expiry based on remember_me
        access_expires = timedelta(minutes=self.security_manager.access_token_expire_minutes)
        refresh_expires = timedelta(days=7)  # Default refresh token expiry
        
        if login_data.remember_me:
            access_expires = timedelta(hours=24)  # Longer access token for remember me
            refresh_expires = timedelta(days=30)  # Longer refresh token
        
        # Create tokens
        access_token = self.security_manager.create_access_token(
            access_token_data, expires_delta=access_expires
        )
        
        refresh_token, _ = await self.token_service.create_refresh_token(
            session, str(user.id), user_agent, ip_address, refresh_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=int(access_expires.total_seconds()),
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "is_verified": user.is_verified
            }
        )
    
    async def refresh_token(self, session: AsyncSession, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token"""
        # Validate refresh token
        token_record = await self.token_service.validate_refresh_token(session, refresh_token)
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        # Get user
        user = await self.user_service.get_user_by_id(session, str(token_record.user_id))
        if not user or not user.can_login():
            # Revoke the refresh token if user can't login
            await self.token_service.revoke_refresh_token(session, refresh_token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is not active"
            )
        
        # Create new access token
        access_token_data = {
            "sub": user.email,
            "user_id": str(user.id),
            "email": user.email,
            "username": user.username,
            "roles": [user.role.value],
            "permissions": self._get_user_permissions(user)
        }
        
        access_token = self.security_manager.create_access_token(access_token_data)
        
        # Create new refresh token (rotate refresh tokens for security)
        new_refresh_token, _ = await self.token_service.create_refresh_token(
            session, str(user.id), token_record.device_info, token_record.ip_address
        )
        
        # Revoke old refresh token
        await self.token_service.revoke_refresh_token(session, refresh_token)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=self.security_manager.access_token_expire_minutes * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "is_verified": user.is_verified
            }
        )
    
    
    async def get_current_user_info(self, session: AsyncSession, user_id: str) -> Optional[Dict[str, Any]]:
        """Get current user information"""
        user = await self.user_service.get_user_by_id(session, user_id)
        if not user:
            return None
        
        # Get user profile, preferences and token stats
        profile = await self.user_service.get_user_profile(session, user_id)
        preferences = await self.user_service.get_user_preferences(session, user_id)  
        token_stats = await self.token_service.get_user_token_stats(session, user_id)
        
        return {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "status": user.status.value,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login_at": user.last_login_at,
            "two_factor_enabled": user.two_factor_enabled,
            "profile": profile.__dict__ if profile else None,
            "preferences": preferences.__dict__ if preferences else None,
            "session_info": token_stats
        }
    
    def _get_user_permissions(self, user: User) -> list[str]:
        """Get user permissions based on role"""
        permissions = ["read"]  # Basic read permission for all users
        
        if user.role.value in ["user"]:
            permissions.extend(["write", "profile:update", "preferences:update"])
        
        if user.role.value in ["admin", "super_admin"]:
            permissions.extend([
                "write", "admin", "users:manage", "roles:manage",
                "system:configure", "reports:view", "analytics:view"
            ])
        
        if user.role.value == "super_admin":
            permissions.extend(["system:admin", "users:delete", "system:reset"])
        
        return permissions