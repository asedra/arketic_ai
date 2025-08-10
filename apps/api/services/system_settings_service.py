"""
System settings service for managing system-wide configuration
"""

import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.settings import SystemSettings
from schemas.settings import SystemSettingsUpdate

logger = logging.getLogger(__name__)


class SystemSettingsService:
    """Service for managing system-wide settings"""
    
    async def get_system_settings(self, session: AsyncSession) -> SystemSettings:
        """Get system settings (creates default if not exists)"""
        result = await session.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()
        
        if not settings:
            # Create default settings
            settings = SystemSettings()
            session.add(settings)
            await session.commit()
            await session.refresh(settings)
        
        return settings
    
    async def update_system_settings(
        self, 
        session: AsyncSession, 
        settings_data: SystemSettingsUpdate,
        updated_by: Optional[str] = None
    ) -> SystemSettings:
        """Update system settings"""
        from datetime import datetime
        import uuid
        
        settings = await self.get_system_settings(session)
        
        # Update fields
        update_data = settings_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settings, field, value)
        
        # Update metadata
        settings.updated_at = datetime.utcnow()
        if updated_by:
            settings.updated_by = uuid.UUID(updated_by)
        
        # The settings object is already tracked by the session, no need to add
        # The router will handle the commit
        
        return settings
    
    async def check_account_lockout_enabled(self, session: AsyncSession) -> bool:
        """Check if account lockout is enabled"""
        settings = await self.get_system_settings(session)
        return settings.enable_account_lockout
    
    async def get_lockout_settings(self, session: AsyncSession) -> Dict[str, Any]:
        """Get account lockout configuration"""
        settings = await self.get_system_settings(session)
        return {
            "enabled": settings.enable_account_lockout,
            "max_attempts": settings.max_failed_login_attempts,
            "lockout_duration_minutes": settings.lockout_duration_minutes
        }
    
    async def get_password_policy(self, session: AsyncSession) -> Dict[str, Any]:
        """Get password policy configuration"""
        settings = await self.get_system_settings(session)
        return {
            "min_length": settings.min_password_length,
            "require_uppercase": settings.require_uppercase,
            "require_lowercase": settings.require_lowercase,
            "require_numbers": settings.require_numbers,
            "require_special_chars": settings.require_special_chars,
            "expiry_days": settings.password_expiry_days
        }
    
    async def get_security_settings(self, session: AsyncSession) -> Dict[str, Any]:
        """Get all security-related settings"""
        settings = await self.get_system_settings(session)
        return {
            "account_lockout": {
                "enabled": settings.enable_account_lockout,
                "max_attempts": settings.max_failed_login_attempts,
                "lockout_duration_minutes": settings.lockout_duration_minutes
            },
            "password_policy": {
                "min_length": settings.min_password_length,
                "require_uppercase": settings.require_uppercase,
                "require_lowercase": settings.require_lowercase,
                "require_numbers": settings.require_numbers,
                "require_special_chars": settings.require_special_chars,
                "expiry_days": settings.password_expiry_days
            },
            "session": {
                "timeout_minutes": settings.session_timeout_minutes,
                "max_sessions_per_user": settings.max_sessions_per_user
            },
            "rate_limiting": {
                "enabled": settings.enable_rate_limiting,
                "requests_per_minute": settings.rate_limit_requests_per_minute
            },
            "two_factor": {
                "require_for_admins": settings.require_2fa_for_admins,
                "allow_for_users": settings.allow_2fa_for_users
            },
            "email_verification": {
                "required": settings.require_email_verification,
                "expiry_hours": settings.email_verification_expiry_hours
            },
            "ip_security": {
                "whitelist_enabled": settings.enable_ip_whitelist,
                "whitelist": settings.ip_whitelist,
                "blacklist_enabled": settings.enable_ip_blacklist,
                "blacklist": settings.ip_blacklist
            },
            "audit": {
                "enabled": settings.enable_audit_logging,
                "retention_days": settings.audit_retention_days
            }
        }


# Singleton instance
_system_settings_service = None


def get_system_settings_service() -> SystemSettingsService:
    """Get singleton instance of system settings service"""
    global _system_settings_service
    if _system_settings_service is None:
        _system_settings_service = SystemSettingsService()
    return _system_settings_service