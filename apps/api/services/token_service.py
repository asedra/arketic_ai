"""
Token management service
Handles refresh tokens, password reset tokens, and email verification tokens
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import and_, select

from models.user import User, RefreshToken, PasswordResetToken, EmailVerificationToken
from core.security import get_security_manager


class TokenService:
    """Service for managing various types of tokens"""
    
    def __init__(self):
        self._security_manager = None
    
    @property
    def security_manager(self):
        """Lazy initialization of security manager"""
        if self._security_manager is None:
            self._security_manager = get_security_manager()
        return self._security_manager
    
    # Refresh Token Management
    async def create_refresh_token(
        self, 
        session: AsyncSession, 
        user_id: str, 
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        expires_delta: Optional[timedelta] = None
    ) -> tuple[str, RefreshToken]:
        """Create a new refresh token"""
        # Generate raw token
        raw_token = self.security_manager.generate_secure_token(32)
        token_hash = self.security_manager.hash_token(raw_token)
        
        # Set expiration (default 7 days)
        if expires_delta:
            expires_at = datetime.utcnow() + expires_delta
        else:
            expires_at = datetime.utcnow() + timedelta(days=7)
        
        # Create token record
        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address
        )
        
        session.add(refresh_token)
        await session.commit()
        await session.refresh(refresh_token)
        
        return raw_token, refresh_token
    
    async def validate_refresh_token(self, session: AsyncSession, raw_token: str) -> Optional[RefreshToken]:
        """Validate a refresh token and return the token record if valid"""
        token_hash = self.security_manager.hash_token(raw_token)
        
        result = await session.execute(select(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ))
        refresh_token = result.scalar_one_or_none()
        
        if not refresh_token or not refresh_token.is_valid:
            return None
            
        # Mark as used
        refresh_token.mark_as_used()
        await session.commit()
        
        return refresh_token
    
    async def revoke_refresh_token(self, session: AsyncSession, raw_token: str) -> bool:
        """Revoke a specific refresh token"""
        token_hash = self.security_manager.hash_token(raw_token)
        
        result = await session.execute(select(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ))
        refresh_token = result.scalar_one_or_none()
        
        if refresh_token:
            refresh_token.revoke()
            await session.commit()
            return True
        
        return False
    
    async def revoke_user_refresh_tokens(self, session: AsyncSession, user_id: str) -> int:
        """Revoke all refresh tokens for a user"""
        from sqlalchemy import update
        
        stmt = update(RefreshToken).where(
            and_(
                RefreshToken.user_id == user_id,
                RefreshToken.is_revoked == False
            )
        ).values(is_revoked=True)
        
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount
    
    async def cleanup_expired_tokens(self, session: AsyncSession) -> int:
        """Clean up expired refresh tokens"""
        from sqlalchemy import delete
        
        stmt = delete(RefreshToken).where(
            RefreshToken.expires_at < datetime.utcnow()
        )
        
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount
    
    # Password Reset Token Management
    async def create_password_reset_token(
        self, 
        session: AsyncSession, 
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> tuple[str, PasswordResetToken]:
        """Create a password reset token"""
        from sqlalchemy import update
        
        # Revoke any existing reset tokens for this user
        stmt = update(PasswordResetToken).where(
            and_(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.is_used == False
            )
        ).values(is_used=True)
        
        await session.execute(stmt)
        
        # Generate new token
        raw_token = self.security_manager.generate_secure_token(32)
        token_hash = self.security_manager.hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
        
        # Create token record
        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        session.add(reset_token)
        await session.commit()
        await session.refresh(reset_token)
        
        return raw_token, reset_token
    
    async def validate_password_reset_token(self, session: AsyncSession, raw_token: str) -> Optional[PasswordResetToken]:
        """Validate a password reset token"""
        token_hash = self.security_manager.hash_token(raw_token)
        
        result = await session.execute(select(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash
        ))
        reset_token = result.scalar_one_or_none()
        
        if not reset_token or not reset_token.is_valid:
            return None
            
        return reset_token
    
    async def use_password_reset_token(self, session: AsyncSession, raw_token: str) -> bool:
        """Mark a password reset token as used"""
        reset_token = await self.validate_password_reset_token(session, raw_token)
        
        if reset_token:
            reset_token.mark_as_used()
            await session.commit()
            return True
        
        return False
    
    # Email Verification Token Management
    async def create_email_verification_token(
        self, 
        session: AsyncSession, 
        user_id: str,
        email: str
    ) -> tuple[str, EmailVerificationToken]:
        """Create an email verification token"""
        from sqlalchemy import update
        
        # Revoke any existing verification tokens for this user/email
        stmt = update(EmailVerificationToken).where(
            and_(
                EmailVerificationToken.user_id == user_id,
                EmailVerificationToken.email == email,
                EmailVerificationToken.is_used == False
            )
        ).values(is_used=True)
        
        await session.execute(stmt)
        
        # Generate new token
        raw_token = self.security_manager.generate_secure_token(32)
        token_hash = self.security_manager.hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=24)  # 24 hour expiry
        
        # Create token record
        verification_token = EmailVerificationToken(
            user_id=user_id,
            email=email,
            token_hash=token_hash,
            expires_at=expires_at
        )
        
        session.add(verification_token)
        await session.commit()
        await session.refresh(verification_token)
        
        return raw_token, verification_token
    
    async def validate_email_verification_token(self, session: AsyncSession, raw_token: str) -> Optional[EmailVerificationToken]:
        """Validate an email verification token"""
        token_hash = self.security_manager.hash_token(raw_token)
        
        result = await session.execute(select(EmailVerificationToken).filter(
            EmailVerificationToken.token_hash == token_hash
        ))
        verification_token = result.scalar_one_or_none()
        
        if not verification_token or not verification_token.is_valid:
            return None
            
        return verification_token
    
    async def use_email_verification_token(self, session: AsyncSession, raw_token: str) -> Optional[EmailVerificationToken]:
        """Mark an email verification token as used and return it"""
        verification_token = await self.validate_email_verification_token(session, raw_token)
        
        if verification_token:
            verification_token.mark_as_used()
            await session.commit()
            return verification_token
        
        return None
    
    # Token Statistics
    async def get_user_token_stats(self, session: AsyncSession, user_id: str) -> Dict[str, Any]:
        """Get token statistics for a user"""
        from sqlalchemy import func
        
        # Active refresh tokens
        refresh_result = await session.execute(
            select(func.count(RefreshToken.id)).filter(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_revoked == False,
                    RefreshToken.expires_at > datetime.utcnow()
                )
            )
        )
        active_refresh_tokens = refresh_result.scalar()
        
        # Pending reset tokens
        reset_result = await session.execute(
            select(func.count(PasswordResetToken.id)).filter(
                and_(
                    PasswordResetToken.user_id == user_id,
                    PasswordResetToken.is_used == False,
                    PasswordResetToken.expires_at > datetime.utcnow()
                )
            )
        )
        pending_reset_tokens = reset_result.scalar()
        
        # Pending verification tokens
        verification_result = await session.execute(
            select(func.count(EmailVerificationToken.id)).filter(
                and_(
                    EmailVerificationToken.user_id == user_id,
                    EmailVerificationToken.is_used == False,
                    EmailVerificationToken.expires_at > datetime.utcnow()
                )
            )
        )
        pending_verification_tokens = verification_result.scalar()
        
        return {
            "active_refresh_tokens": active_refresh_tokens,
            "pending_reset_tokens": pending_reset_tokens,
            "pending_verification_tokens": pending_verification_tokens
        }