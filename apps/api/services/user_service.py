"""
User management service
Handles user CRUD operations, profile management, and related business logic
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, select
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

from models.user import User, UserProfile, UserPreferences, UserRole, UserStatus
from schemas.user import UserCreate, UserUpdate, UserProfileUpdate, UserPreferencesUpdate
from core.security import get_security_manager
from .system_settings_service import get_system_settings_service


class UserService:
    """Service for user management operations"""
    
    def __init__(self):
        self._security_manager = None
        self.system_settings_service = get_system_settings_service()
    
    @property
    def security_manager(self):
        """Lazy initialization of security manager"""
        if self._security_manager is None:
            self._security_manager = get_security_manager()
        return self._security_manager
    
    # User CRUD Operations
    async def create_user(self, session: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = await self.get_user_by_email(session, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )
        
        if user_data.username:
            existing_username = await self.get_user_by_username(session, user_data.username)
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this username already exists"
                )
        
        # Hash password
        password_hash = self.security_manager.hash_password(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=password_hash,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role
        )
        
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        # Create default profile and preferences
        await self._create_default_profile(session, user.id)
        await self._create_default_preferences(session, user.id)
        
        return user
    
    async def get_user_by_id(self, session: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID"""
        import uuid
        # Convert string UUID to UUID object for proper database comparison
        try:
            uuid_obj = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            result = await session.execute(select(User).filter(User.id == uuid_obj))
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None
    
    async def get_user_by_email(self, session: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await session.execute(select(User).filter(User.email == email.lower()))
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, session: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        result = await session.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()
    
    async def update_user(self, session: AsyncSession, user_id: str, user_data: UserUpdate, current_user: User) -> User:
        """Update user information"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check permissions for role/status changes
        if (user_data.role or user_data.status or user_data.is_active is not None):
            if not current_user.is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only administrators can change user role or status"
                )
        
        # Check username uniqueness
        if user_data.username and user_data.username != user.username:
            existing_user = await self.get_user_by_username(session, user_data.username)
            if existing_user and existing_user.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this username already exists"
                )
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
        
        return user
    
    async def delete_user(self, session: AsyncSession, user_id: str) -> bool:
        """Soft delete a user (deactivate)"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        user.is_active = False
        user.status = UserStatus.INACTIVE
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        return True
    
    async def list_users(
        self, 
        session: AsyncSession, 
        page: int = 1, 
        per_page: int = 10,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[User], int]:
        """List users with pagination and filtering"""
        from sqlalchemy import func as sql_func
        
        # Build query
        query = select(User)
        
        # Apply filters
        if search:
            search_filter = or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        if role:
            query = query.filter(User.role == role)
        
        if status:
            query = query.filter(User.status == status)
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Get total count
        count_result = await session.execute(select(sql_func.count()).select_from(query.subquery()))
        total = count_result.scalar()
        
        # Apply pagination and execute
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await session.execute(query)
        users = result.scalars().all()
        
        return users, total
    
    # Authentication Operations
    async def authenticate_user(self, session: AsyncSession, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(session, email)
        if not user:
            return None
        
        if not self.security_manager.verify_password(password, user.password_hash):
            return None
        
        if not user.can_login():
            return None
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        user.failed_login_attempts = 0  # Reset failed attempts
        await session.commit()
        
        return user
    
    async def change_password(self, session: AsyncSession, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        # Verify current password
        if not self.security_manager.verify_password(current_password, user.password_hash):
            return False
        
        # Hash new password
        new_password_hash = self.security_manager.hash_password(new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.password_changed_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        return True
    
    async def reset_password(self, session: AsyncSession, user_id: str, new_password: str) -> bool:
        """Reset user password (admin or token-based)"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        # Hash new password
        new_password_hash = self.security_manager.hash_password(new_password)
        
        # Update password
        user.password_hash = new_password_hash
        user.password_changed_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        user.failed_login_attempts = 0  # Reset failed attempts
        
        await session.commit()
        return True
    
    async def verify_email(self, session: AsyncSession, user_id: str) -> bool:
        """Mark user email as verified"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        user.is_verified = True
        user.email_verified_at = datetime.utcnow()
        user.status = UserStatus.ACTIVE  # Activate account on email verification
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        return True
    
    async def lock_user_account(self, session: AsyncSession, user_id: str, lock_duration_minutes: int = 30) -> bool:
        """Lock user account temporarily"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        user.locked_until = datetime.utcnow() + timedelta(minutes=lock_duration_minutes)
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        return True
    
    async def unlock_user_account(self, session: AsyncSession, user_id: str) -> bool:
        """Unlock user account"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return False
        
        user.locked_until = None
        user.failed_login_attempts = 0
        user.updated_at = datetime.utcnow()
        
        await session.commit()
        return True
    
    async def increment_failed_login_attempts(self, session: AsyncSession, user_id: str) -> int:
        """Increment failed login attempts for user"""
        user = await self.get_user_by_id(session, user_id)
        if not user:
            return 0
        
        user.failed_login_attempts += 1
        
        # Check if lockout is enabled and if threshold is reached
        lockout_settings = await self.system_settings_service.get_lockout_settings(session)
        if lockout_settings["enabled"] and user.failed_login_attempts >= lockout_settings["max_attempts"]:
            await self.lock_user_account(session, user_id, lockout_settings["lockout_duration_minutes"])
        
        await session.commit()
        return user.failed_login_attempts
    
    # Profile Management
    async def update_user_profile(self, session: AsyncSession, user_id: str, profile_data: UserProfileUpdate) -> Optional[UserProfile]:
        """Update user profile"""
        result = await session.execute(select(UserProfile).filter(UserProfile.user_id == user_id))
        profile = result.scalar_one_or_none()
        
        if not profile:
            # Create profile if it doesn't exist
            profile = UserProfile(user_id=user_id)
            session.add(profile)
        
        # Update fields
        update_data = profile_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        profile.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(profile)
        
        return profile
    
    async def get_user_profile(self, session: AsyncSession, user_id: str) -> Optional[UserProfile]:
        """Get user profile"""
        import uuid
        # Convert string UUID to UUID object for proper database comparison
        try:
            uuid_obj = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            result = await session.execute(select(UserProfile).filter(UserProfile.user_id == uuid_obj))
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None
    
    # Preferences Management
    async def update_user_preferences(self, session: AsyncSession, user_id: str, preferences_data: UserPreferencesUpdate) -> Optional[UserPreferences]:
        """Update user preferences"""
        result = await session.execute(select(UserPreferences).filter(UserPreferences.user_id == user_id))
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create preferences if they don't exist
            preferences = UserPreferences(user_id=user_id)
            session.add(preferences)
        
        # Update fields
        update_data = preferences_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)
        
        preferences.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(preferences)
        
        return preferences
    
    async def get_user_preferences(self, session: AsyncSession, user_id: str) -> Optional[UserPreferences]:
        """Get user preferences"""
        import uuid
        # Convert string UUID to UUID object for proper database comparison
        try:
            uuid_obj = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            result = await session.execute(select(UserPreferences).filter(UserPreferences.user_id == uuid_obj))
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None
    
    # User Statistics
    async def get_user_statistics(self, session: AsyncSession) -> Dict[str, Any]:
        """Get user statistics"""
        # Total users
        total_result = await session.execute(select(func.count(User.id)))
        total_users = total_result.scalar()
        
        # Active users
        active_result = await session.execute(select(func.count(User.id)).filter(User.is_active == True))
        active_users = active_result.scalar()
        
        # Verified users
        verified_result = await session.execute(select(func.count(User.id)).filter(User.is_verified == True))
        verified_users = verified_result.scalar()
        
        # Users by role
        role_result = await session.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        role_stats = role_result.all()
        
        # Users by status
        status_result = await session.execute(
            select(User.status, func.count(User.id)).group_by(User.status)
        )
        status_stats = status_result.all()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "verified_users": verified_users,
            "role_distribution": {role: count for role, count in role_stats},
            "status_distribution": {status: count for status, count in status_stats}
        }
    
    # Helper Methods
    async def _create_default_profile(self, session: AsyncSession, user_id: str) -> UserProfile:
        """Create default profile for new user"""
        profile = UserProfile(user_id=user_id)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        return profile
    
    async def _create_default_preferences(self, session: AsyncSession, user_id: str) -> UserPreferences:
        """Create default preferences for new user"""
        preferences = UserPreferences(user_id=user_id)
        session.add(preferences)
        await session.commit()
        await session.refresh(preferences)
        return preferences