"""
Shared dependencies for API endpoints
Contains common dependency functions used across routers
"""

import logging
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .security import SecurityManager
from .database import get_db
from models.user import User

logger = logging.getLogger(__name__)

# Security instances - these will be initialized in main.py
security_manager: SecurityManager = None

# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Validate JWT token and return user model"""
    global security_manager
    
    if not security_manager:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Security manager not initialized"
        )
    
    try:
        token_data = security_manager.verify_token(credentials.credentials)
        
        # Get user from database with timeout protection
        import uuid
        import asyncio
        
        # Convert string UUID to UUID object for proper database comparison
        try:
            uuid_obj = uuid.UUID(token_data.user_id) if isinstance(token_data.user_id, str) else token_data.user_id
            stmt = select(User).where(User.id == uuid_obj)
            
            # Add timeout to database query to prevent hanging
            result = await asyncio.wait_for(db.execute(stmt), timeout=5.0)
            user = result.scalar_one_or_none()
            
        except asyncio.TimeoutError:
            logger.error(f"Database query timeout for user {token_data.user_id}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service temporarily unavailable"
            )
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid user ID format: {token_data.user_id}, error: {e}")
            user = None
        
        if not user:
            logger.warning(f"User not found in database: {token_data.user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            logger.warning(f"Inactive user attempted access: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Authentication failed"
        )


async def get_current_user_dict(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Validate JWT token and return user info as dict (for backward compatibility)"""
    global security_manager
    
    if not security_manager:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Security manager not initialized"
        )
    
    try:
        token_data = security_manager.verify_token(credentials.credentials)
        return {
            "username": token_data.username,
            "user_id": token_data.user_id,
            "email": token_data.email,
            "roles": token_data.roles,
            "permissions": token_data.permissions,
            "expires_at": token_data.exp.isoformat() if token_data.exp else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid token"
        )




def initialize_dependencies(security_mgr: SecurityManager):
    """Initialize global dependencies - called from main.py"""
    global security_manager
    security_manager = security_mgr


def get_security_manager() -> SecurityManager:
    """Get the security manager instance"""
    global security_manager
    if not security_manager:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Security manager not initialized"
        )
    return security_manager


async def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return user info (for WebSocket authentication)"""
    global security_manager
    
    if not security_manager:
        raise ValueError("Security manager not initialized")
    
    try:
        token_data = security_manager.verify_token(token)
        return {
            "username": token_data.username,
            "user_id": token_data.user_id,
            "email": token_data.email,
            "roles": token_data.roles,
            "permissions": token_data.permissions,
            "expires_at": token_data.exp.isoformat() if token_data.exp else None
        }
    except Exception as e:
        logger.error(f"JWT token verification failed: {e}")
        return None


# Export dependencies
__all__ = [
    "get_current_user",
    "get_current_user_dict",
    "get_security_manager",
    "initialize_dependencies",
    "verify_jwt_token",
    "security_manager"
]