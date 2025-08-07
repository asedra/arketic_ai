"""
Security utilities and authentication services
JWT token management, password hashing, and security validation
"""

import logging
import secrets
import hashlib
import base64
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from fastapi import HTTPException, status
from pydantic import BaseModel

from .config import settings

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []
    exp: Optional[datetime] = None


class SecurityManager:
    """Centralized security management"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire_minutes = settings.JWT_EXPIRE_MINUTES
        self.failed_attempts: Dict[str, Dict[str, Any]] = {}
        self.blocked_ips: set = set()
        self._encryption_key = None
        self._initialize_encryption()
        
    def _initialize_encryption(self):
        """Initialize encryption key for API key storage"""
        # Use the SECRET_KEY to derive a consistent encryption key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'arketic_api_key_salt',  # Fixed salt for consistency
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.secret_key.encode()))
        self._encryption_key = Fernet(key)
    
    async def initialize(self):
        """Initialize security manager"""
        logger.info("Security manager initialized")
        
    async def cleanup(self):
        """Cleanup security resources"""
        logger.info("Security manager cleanup completed")
        
    async def health_check(self) -> Dict[str, str]:
        """Security health check"""
        return {
            "status": "healthy",
            "algorithm": self.algorithm,
            "token_expire_minutes": str(self.access_token_expire_minutes)
        }
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # Refresh tokens expire in 7 days by default
            expire = datetime.now(timezone.utc) + timedelta(days=7)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_reset_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create password reset token"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # Reset tokens expire in 1 hour
            expire = datetime.now(timezone.utc) + timedelta(hours=1)
        
        token_data = {
            "user_id": user_id,
            "type": "password_reset",
            "exp": expire
        }
        
        encoded_jwt = jwt.encode(token_data, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_verification_token(self, user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create email verification token"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # Verification tokens expire in 24 hours
            expire = datetime.now(timezone.utc) + timedelta(hours=24)
        
        token_data = {
            "user_id": user_id,
            "email": email,
            "type": "email_verification",
            "exp": expire
        }
        
        encoded_jwt = jwt.encode(token_data, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> TokenData:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Extract token data
            username: str = payload.get("sub")
            user_id: str = payload.get("user_id")
            email: str = payload.get("email")
            roles: List[str] = payload.get("roles", [])
            permissions: List[str] = payload.get("permissions", [])
            exp_timestamp: float = payload.get("exp", 0)
            
            exp = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc) if exp_timestamp else None
            
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(
                username=username,
                user_id=user_id,
                email=email,
                roles=roles,
                permissions=permissions,
                exp=exp
            )
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def generate_api_key(self, length: int = 32) -> str:
        """Generate secure API key"""
        return secrets.token_urlsafe(length)
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def hash_token(self, token: str) -> str:
        """Hash token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate secure random token"""
        return secrets.token_urlsafe(length)
    
    def verify_api_key(self, api_key: str, hashed_key: str) -> bool:
        """Verify API key against hash"""
        return self.hash_api_key(api_key) == hashed_key
    
    def record_failed_attempt(self, identifier: str, ip_address: str):
        """Record failed authentication attempt"""
        now = datetime.now(timezone.utc)
        key = f"{identifier}:{ip_address}"
        
        if key not in self.failed_attempts:
            self.failed_attempts[key] = {
                "count": 0,
                "first_attempt": now,
                "last_attempt": now
            }
        
        self.failed_attempts[key]["count"] += 1
        self.failed_attempts[key]["last_attempt"] = now
        
        # Block IP after 5 failed attempts within 15 minutes
        if (self.failed_attempts[key]["count"] >= 5 and 
            (now - self.failed_attempts[key]["first_attempt"]).seconds < 900):
            self.blocked_ips.add(ip_address)
            logger.warning(f"IP address {ip_address} blocked due to failed attempts")
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked"""
        return ip_address in self.blocked_ips
    
    def clear_failed_attempts(self, identifier: str, ip_address: str):
        """Clear failed attempts for successful authentication"""
        key = f"{identifier}:{ip_address}"
        if key in self.failed_attempts:
            del self.failed_attempts[key]
    
    def encrypt_api_key(self, api_key: str) -> bytes:
        """Encrypt API key for secure storage"""
        if not self._encryption_key:
            raise RuntimeError("Encryption not initialized")
        return self._encryption_key.encrypt(api_key.encode())
    
    def decrypt_api_key(self, encrypted_key: bytes) -> str:
        """Decrypt API key for use"""
        if not self._encryption_key:
            raise RuntimeError("Encryption not initialized")
        return self._encryption_key.decrypt(encrypted_key).decode()
    
    def hash_api_key_for_verification(self, api_key: str) -> str:
        """Create a hash of API key for verification (different from storage hash)"""
        return hashlib.sha256(f"{api_key}:verification".encode()).hexdigest()
    
    def validate_openai_api_key(self, api_key: str) -> Dict[str, Any]:
        """Validate OpenAI API key format"""
        errors = []
        
        if not api_key:
            errors.append("API key cannot be empty")
            return {"valid": False, "errors": errors}
        
        # OpenAI API keys typically start with 'sk-'
        if not api_key.startswith('sk-'):
            errors.append("OpenAI API keys must start with 'sk-'")
        
        # Check reasonable length bounds (OpenAI keys vary in length)
        if len(api_key) < 20 or len(api_key) > 100:
            errors.append("API key length appears invalid")
        
        # Check for common issues
        if ' ' in api_key:
            errors.append("API key should not contain spaces")
        
        # Basic format check - should have at least one dash after 'sk-'
        if len(api_key.split('-')) < 2:
            errors.append("API key format appears invalid")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "provider": "openai"
        }
    
    def validate_anthropic_api_key(self, api_key: str) -> Dict[str, Any]:
        """Validate Anthropic API key format"""
        errors = []
        
        if not api_key:
            errors.append("API key cannot be empty")
            return {"valid": False, "errors": errors}
        
        # Anthropic API keys typically start with 'sk-ant-'
        if not api_key.startswith('sk-ant-'):
            errors.append("Anthropic API keys must start with 'sk-ant-'")
        
        # Check length
        if len(api_key) < 30 or len(api_key) > 200:
            errors.append("API key length appears invalid")
        
        # Check for common issues
        if ' ' in api_key:
            errors.append("API key should not contain spaces")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "provider": "anthropic"
        }
    
    def validate_api_key_by_provider(self, provider: str, api_key: str) -> Dict[str, Any]:
        """Validate API key based on provider"""
        provider = provider.lower()
        
        if provider == "openai":
            return self.validate_openai_api_key(api_key)
        elif provider == "anthropic":
            return self.validate_anthropic_api_key(api_key)
        elif provider in ["groq", "huggingface"]:
            # Basic validation for other providers
            errors = []
            if not api_key:
                errors.append("API key cannot be empty")
            elif len(api_key) < 10:
                errors.append("API key appears too short")
            elif ' ' in api_key:
                errors.append("API key should not contain spaces")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "provider": provider
            }
        else:
            return {
                "valid": False,
                "errors": [f"Unsupported provider: {provider}"]
            }
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        errors = []
        score = 0
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        else:
            score += 1
            
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        else:
            score += 1
            
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        else:
            score += 1
            
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        else:
            score += 1
            
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        else:
            score += 1
        
        strength_levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
        strength = strength_levels[min(score, 4)]
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "strength": strength,
            "score": score
        }
    
    def encrypt_api_key(self, api_key: str) -> bytes:
        """Encrypt an API key for secure storage"""
        if not self._encryption_key:
            raise ValueError("Encryption key not initialized")
        return self._encryption_key.encrypt(api_key.encode())
    
    def decrypt_api_key(self, encrypted_key: bytes) -> str:
        """Decrypt an API key from storage"""
        if not self._encryption_key:
            raise ValueError("Encryption key not initialized")
        return self._encryption_key.decrypt(encrypted_key).decode()




def validate_file_upload(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Validate uploaded file for security"""
    errors = []
    
    # Check file size
    if len(file_content) > settings.MAX_FILE_SIZE:
        errors.append(f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes")
    
    # Check file extension
    file_ext = Path(filename).suffix.lower().lstrip('.')
    if file_ext not in settings.ALLOWED_FILE_TYPES:
        errors.append(f"File type '{file_ext}' is not allowed")
    
    # Basic malware detection (simple magic byte checking)
    suspicious_patterns = [
        b'MZ',  # Windows executable
        b'\x7fELF',  # Linux executable
        b'<script',  # JavaScript
        b'<?php',  # PHP
    ]
    
    for pattern in suspicious_patterns:
        if pattern in file_content[:1024]:  # Check first 1KB
            errors.append("File contains suspicious content")
            break
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "file_size": len(file_content),
        "file_type": file_ext
    }


def sanitize_input(input_string: str, max_length: int = 1000) -> str:
    """Sanitize user input"""
    if not input_string:
        return ""
    
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in input_string if ord(char) >= 32 or char in '\t\n\r')
    
    # Truncate to max length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    # Basic HTML entity encoding for dangerous characters
    sanitized = (sanitized
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#x27;'))
    
    return sanitized


# Global security manager instance
_global_security_manager: Optional[SecurityManager] = None


def get_security_manager() -> SecurityManager:
    """Get global security manager instance"""
    global _global_security_manager
    if _global_security_manager is None:
        _global_security_manager = SecurityManager()
    return _global_security_manager


def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data using global security manager"""
    security_manager = get_security_manager()
    encrypted_bytes = security_manager.encrypt_api_key(data)
    # Convert bytes to base64 string for database storage
    return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data using global security manager"""
    security_manager = get_security_manager()
    # Convert base64 string back to bytes
    encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
    return security_manager.decrypt_api_key(encrypted_bytes)


async def get_current_user(token: str) -> 'User':
    """Get current user from JWT token"""
    from models.user import User
    from core.database import get_db
    from sqlalchemy.orm import Session
    
    # Verify token
    security_manager = get_security_manager()
    token_data = security_manager.verify_token(token)
    
    # Get user from database
    db: Session = next(get_db())
    try:
        import uuid
        # Convert string UUID to UUID object for proper database comparison
        try:
            uuid_obj = uuid.UUID(token_data.user_id) if isinstance(token_data.user_id, str) else token_data.user_id
            user = db.query(User).filter(User.id == uuid_obj).first()
        except (ValueError, TypeError):
            user = None
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    finally:
        db.close()


# Export all necessary components
__all__ = [
    "SecurityManager",
    "TokenData",
    "validate_file_upload",
    "sanitize_input",
    "get_security_manager",
    "encrypt_sensitive_data",
    "decrypt_sensitive_data",
    "get_current_user",
]