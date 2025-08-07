"""
Settings router for user preferences and API key management
Handles encrypted storage and retrieval of sensitive user settings
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import SecurityManager
from core.dependencies import get_current_user_dict, get_security_manager
from models.user import User, UserApiKey

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for request/response
class ApiKeyCreate(BaseModel):
    """Request model for creating/updating API keys"""
    provider: str = Field(..., description="API provider (openai, anthropic, groq, etc.)")
    key_name: str = Field(..., description="User-friendly name for the API key")
    api_key: str = Field(..., description="The actual API key")
    
    @validator('provider')
    def validate_provider(cls, v):
        allowed_providers = ['openai', 'anthropic', 'groq', 'huggingface', 'local']
        if v.lower() not in allowed_providers:
            raise ValueError(f"Provider must be one of: {allowed_providers}")
        return v.lower()
    
    @validator('key_name')
    def validate_key_name(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError("Key name cannot be empty")
        if len(v) > 100:
            raise ValueError("Key name cannot exceed 100 characters")
        return v.strip()
    
    @validator('api_key')
    def validate_api_key(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("API key appears too short")
        return v.strip()


class ApiKeyUpdate(BaseModel):
    """Request model for updating API key name or status"""
    key_name: Optional[str] = Field(None, description="New name for the API key")
    is_active: Optional[bool] = Field(None, description="Whether the key is active")
    
    @validator('key_name')
    def validate_key_name(cls, v):
        if v is not None:
            if len(v.strip()) < 1:
                raise ValueError("Key name cannot be empty")
            if len(v) > 100:
                raise ValueError("Key name cannot exceed 100 characters")
            return v.strip()
        return v


class ApiKeyResponse(BaseModel):
    """Response model for API key information (without actual key)"""
    id: str
    provider: str
    key_name: str
    is_active: bool
    last_used_at: Optional[datetime]
    usage_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApiKeyTestResponse(BaseModel):
    """Response model for API key test results"""
    success: bool
    provider: str
    message: str
    details: Optional[Dict[str, Any]] = None


# Settings service
class SettingsService:
    """Service class for managing user settings and API keys"""
    
    def __init__(self, security_manager: SecurityManager):
        self.security_manager = security_manager
    
    async def create_or_update_api_key(
        self, 
        session: AsyncSession, 
        user_id: str, 
        api_key_data: ApiKeyCreate
    ) -> UserApiKey:
        """Create or update an encrypted API key"""
        
        # Validate the API key format
        validation = self.security_manager.validate_api_key_by_provider(
            api_key_data.provider, 
            api_key_data.api_key
        )
        
        if not validation['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid API key: {', '.join(validation['errors'])}"
            )
        
        # Check if a key with the same provider and name exists
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == api_key_data.provider,
                UserApiKey.key_name == api_key_data.key_name
            )
        )
        existing_key = await session.scalar(stmt)
        
        # Encrypt the API key
        encrypted_key = self.security_manager.encrypt_api_key(api_key_data.api_key)
        key_hash = self.security_manager.hash_api_key_for_verification(api_key_data.api_key)
        
        if existing_key:
            # Update existing key
            existing_key.encrypted_key = encrypted_key
            existing_key.key_hash = key_hash
            existing_key.updated_at = datetime.utcnow()
            existing_key.is_active = True
            session.add(existing_key)
            logger.info(f"Updated API key for user {user_id}, provider {api_key_data.provider}")
            return existing_key
        else:
            # Create new key
            new_key = UserApiKey(
                user_id=user_id,
                provider=api_key_data.provider,
                key_name=api_key_data.key_name,
                encrypted_key=encrypted_key,
                key_hash=key_hash,
                is_active=True
            )
            session.add(new_key)
            logger.info(f"Created API key for user {user_id}, provider {api_key_data.provider}")
            return new_key
    
    async def get_user_api_keys(
        self, 
        session: AsyncSession, 
        user_id: str,
        provider: Optional[str] = None,
        active_only: bool = True
    ) -> List[UserApiKey]:
        """Get user's API keys"""
        
        conditions = [UserApiKey.user_id == user_id]
        
        if provider:
            conditions.append(UserApiKey.provider == provider.lower())
        
        if active_only:
            conditions.append(UserApiKey.is_active == True)
        
        stmt = select(UserApiKey).where(and_(*conditions)).order_by(
            UserApiKey.provider, UserApiKey.created_at.desc()
        )
        
        result = await session.execute(stmt)
        return result.scalars().all()
    
    async def get_api_key_by_id(
        self, 
        session: AsyncSession, 
        user_id: str, 
        key_id: str
    ) -> Optional[UserApiKey]:
        """Get specific API key by ID"""
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.id == key_id,
                UserApiKey.user_id == user_id
            )
        )
        return await session.scalar(stmt)
    
    async def update_api_key(
        self, 
        session: AsyncSession, 
        user_id: str, 
        key_id: str,
        update_data: ApiKeyUpdate
    ) -> Optional[UserApiKey]:
        """Update API key metadata"""
        
        api_key = await self.get_api_key_by_id(session, user_id, key_id)
        if not api_key:
            return None
        
        if update_data.key_name is not None:
            # Check for duplicate names within the same provider
            stmt = select(UserApiKey).where(
                and_(
                    UserApiKey.user_id == user_id,
                    UserApiKey.provider == api_key.provider,
                    UserApiKey.key_name == update_data.key_name,
                    UserApiKey.id != key_id
                )
            )
            existing = await session.scalar(stmt)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Key name '{update_data.key_name}' already exists for provider '{api_key.provider}'"
                )
            
            api_key.key_name = update_data.key_name
        
        if update_data.is_active is not None:
            api_key.is_active = update_data.is_active
        
        api_key.updated_at = datetime.utcnow()
        session.add(api_key)
        
        return api_key
    
    async def delete_api_key(
        self, 
        session: AsyncSession, 
        user_id: str, 
        key_id: str
    ) -> bool:
        """Delete an API key"""
        
        api_key = await self.get_api_key_by_id(session, user_id, key_id)
        if not api_key:
            return False
        
        await session.delete(api_key)
        logger.info(f"Deleted API key {key_id} for user {user_id}")
        return True
    
    async def get_decrypted_api_key(
        self, 
        session: AsyncSession, 
        user_id: str, 
        provider: str,
        key_name: Optional[str] = None
    ) -> Optional[str]:
        """Get decrypted API key for use (internal method)"""
        
        conditions = [
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider.lower(),
            UserApiKey.is_active == True
        ]
        
        if key_name:
            conditions.append(UserApiKey.key_name == key_name)
        
        stmt = select(UserApiKey).where(and_(*conditions)).order_by(
            UserApiKey.updated_at.desc()
        ).limit(1)
        
        api_key = await session.scalar(stmt)
        
        if not api_key:
            return None
        
        # Mark as used
        api_key.mark_as_used()
        session.add(api_key)
        
        # Decrypt and return the key
        try:
            return self.security_manager.decrypt_api_key(api_key.encrypted_key)
        except Exception as e:
            logger.error(f"Failed to decrypt API key {api_key.id}: {e}")
            return None


# Settings service will be created with dependency injection


# API Routes
@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    api_key_data: ApiKeyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Create or update an encrypted API key"""
    
    try:
        user_id = current_user["user_id"]
        settings_service = SettingsService(security_manager)
        api_key = await settings_service.create_or_update_api_key(
            session, user_id, api_key_data
        )
        await session.commit()
        
        return ApiKeyResponse.model_validate(api_key)
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to create API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save API key"
        )


@router.get("/api-keys", response_model=List[ApiKeyResponse])
async def get_api_keys(
    provider: Optional[str] = None,
    active_only: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Get user's API keys (without exposing actual keys)"""
    
    try:
        user_id = current_user["user_id"]
        settings_service = SettingsService(security_manager)
        api_keys = await settings_service.get_user_api_keys(
            session, user_id, provider, active_only
        )
        
        return [ApiKeyResponse.model_validate(key) for key in api_keys]
        
    except Exception as e:
        logger.error(f"Failed to get API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API keys"
        )


@router.get("/api-keys/{key_id}", response_model=ApiKeyResponse)
async def get_api_key(
    key_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Get specific API key by ID"""
    
    try:
        user_id = current_user["user_id"]
        settings_service = SettingsService(security_manager)
        api_key = await settings_service.get_api_key_by_id(session, user_id, key_id)
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return ApiKeyResponse.model_validate(api_key)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve API key"
        )


@router.put("/api-keys/{key_id}", response_model=ApiKeyResponse)
async def update_api_key(
    key_id: str,
    update_data: ApiKeyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Update API key metadata"""
    
    try:
        user_id = current_user["user_id"]
        settings_service = SettingsService(security_manager)
        api_key = await settings_service.update_api_key(
            session, user_id, key_id, update_data
        )
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        await session.commit()
        return ApiKeyResponse.model_validate(api_key)
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to update API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update API key"
        )


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Delete an API key"""
    
    try:
        user_id = current_user["user_id"]
        settings_service = SettingsService(security_manager)
        deleted = await settings_service.delete_api_key(session, user_id, key_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        await session.commit()
        return {"message": "API key deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"Failed to delete API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )


@router.post("/api-keys/validate", response_model=ApiKeyTestResponse)
async def validate_api_key(
    api_key_data: ApiKeyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    security_manager: SecurityManager = Depends(get_security_manager)
):
    """Validate API key format without storing it"""
    
    try:
        validation = security_manager.validate_api_key_by_provider(
            api_key_data.provider, 
            api_key_data.api_key
        )
        
        return ApiKeyTestResponse(
            success=validation['valid'],
            provider=api_key_data.provider,
            message="API key validation successful" if validation['valid'] else "API key validation failed",
            details=validation
        )
        
    except Exception as e:
        logger.error(f"Failed to validate API key: {e}")
        return ApiKeyTestResponse(
            success=False,
            provider=api_key_data.provider,
            message="API key validation error",
            details={"error": str(e)}
        )


# Helper function for other services to get decrypted API keys
async def get_user_api_key_for_provider(
    session: AsyncSession, 
    user_id: str, 
    provider: str,
    key_name: Optional[str] = None,
    security_manager: SecurityManager = None
) -> Optional[str]:
    """Helper function to get decrypted API key for a specific provider"""
    if security_manager is None:
        from core.dependencies import get_security_manager
        security_manager = get_security_manager()
    settings_service = SettingsService(security_manager)
    return await settings_service.get_decrypted_api_key(
        session, user_id, provider, key_name
    )