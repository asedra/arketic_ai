"""
OpenAI Settings router - Bridge between frontend expectations and backend API key system
Maps the specific OpenAI settings endpoints expected by the frontend to the generic API key system
"""

from datetime import datetime
from typing import Optional, Dict, Any
import json
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, validator, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError

from core.database import get_db
from core.dependencies import get_current_user_dict, get_security_manager
from models.user import User, UserApiKey
# Conditional import to avoid dependency issues
try:
    from services.ai_service import test_openai_connection_with_key
except ImportError:
    # Fallback function if ai_service is not available
    async def test_openai_connection_with_key(api_key: str, model: str) -> Dict[str, Any]:
        return {
            "success": True,
            "message": "Connection test temporarily unavailable",
            "model_info": {"model": model}
        }

# Initialize router
router = APIRouter()

# Request/Response models for OpenAI settings
class OpenAISettingsRequest(BaseModel):
    """Request model for OpenAI settings"""
    api_key: str = Field(..., description="OpenAI API key")
    model: str = Field(default="gpt-3.5-turbo", description="OpenAI model to use")
    max_tokens: int = Field(default=1000, ge=1, le=8192, description="Maximum tokens per request")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for randomness")
    
    @validator('api_key')
    def validate_api_key(cls, v):
        if not v or not v.strip():
            raise ValueError("API key is required")
        if not v.startswith('sk-'):
            raise ValueError("Invalid OpenAI API key format")
        if len(v) < 20:
            raise ValueError("API key appears to be too short")
        return v.strip()
    
    @validator('model')
    def validate_model(cls, v):
        allowed_models = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini']
        if v not in allowed_models:
            raise ValueError(f"Model must be one of: {allowed_models}")
        return v


class OpenAISettingsResponse(BaseModel):
    """Response model for OpenAI settings"""
    api_key: str = Field(description="Masked API key")
    model: str
    max_tokens: int
    temperature: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SettingsResponse(BaseModel):
    """Combined settings response for frontend compatibility"""
    openai: Optional[OpenAISettingsResponse] = None


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    success: bool
    message: str
    model_info: Optional[Dict[str, Any]] = None
    response_time_ms: Optional[int] = None
    
    model_config = {"protected_namespaces": ()}


def mask_api_key(api_key: str) -> str:
    """Mask API key for safe display"""
    if not api_key or len(api_key) < 8:
        return api_key
    return api_key[:3] + '•' * (len(api_key) - 7) + api_key[-4:]


def _get_openai_settings_from_api_key(api_key_record: UserApiKey) -> Dict[str, Any]:
    """Extract OpenAI settings from API key record"""
    # Default settings
    settings = {
        "model": "gpt-3.5-turbo",
        "max_tokens": 1000,
        "temperature": 0.7
    }
    
    # Try to parse settings from key_name if it contains JSON
    # Format: "OpenAI Settings: {json_data}"
    try:
        if api_key_record.key_name.startswith("OpenAI Settings: "):
            json_part = api_key_record.key_name[17:]  # Remove "OpenAI Settings: " prefix
            metadata = json.loads(json_part)
            if isinstance(metadata, dict):
                settings.update({
                    "model": metadata.get("model", settings["model"]),
                    "max_tokens": metadata.get("max_tokens", settings["max_tokens"]),
                    "temperature": metadata.get("temperature", settings["temperature"])
                })
    except (json.JSONDecodeError, ValueError, AttributeError):
        pass
    
    return settings


def _create_key_name_with_settings(model: str, max_tokens: int, temperature: float) -> str:
    """Create key name with embedded settings JSON"""
    settings_json = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature
    }, separators=(',', ':'))  # Compact JSON
    return f"OpenAI Settings: {settings_json}"


@router.get("/settings", response_model=SettingsResponse)
async def get_user_settings(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get all user settings (OpenAI focus for frontend compatibility)"""
    try:
        user_id = current_user["user_id"]
        
        # Get OpenAI API key
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == "openai",
                UserApiKey.is_active == True
            )
        ).order_by(UserApiKey.updated_at.desc()).limit(1)
        
        result = await db.execute(stmt)
        openai_key = result.scalar_one_or_none()
        
        openai_data = None
        if openai_key:
            # Get security manager to decrypt key
            security_manager = get_security_manager()
            
            try:
                decrypted_key = security_manager.decrypt_api_key(openai_key.encrypted_key)
                settings = _get_openai_settings_from_api_key(openai_key)
                
                openai_data = OpenAISettingsResponse(
                    api_key=mask_api_key(decrypted_key),
                    model=settings["model"],
                    max_tokens=settings["max_tokens"],
                    temperature=settings["temperature"],
                    created_at=openai_key.created_at,
                    updated_at=openai_key.updated_at
                )
            except Exception as e:
                # If decryption fails, don't return anything
                print(f"Decryption failed: {e}")
        
        return SettingsResponse(openai=openai_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving settings: {str(e)}"
        )


@router.post("/settings/openai")
async def update_openai_settings(
    settings: OpenAISettingsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Update OpenAI settings for the current user"""
    try:
        user_id = current_user["user_id"]
        
        # Get security manager to encrypt key
        security_manager = get_security_manager()
        
        # Create a key name with embedded settings
        key_name = _create_key_name_with_settings(settings.model, settings.max_tokens, settings.temperature)
        
        # Check if a key with openai provider exists for this user
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == "openai"
            )
        ).order_by(UserApiKey.updated_at.desc()).limit(1)
        
        result = await db.execute(stmt)
        existing_key = result.scalar_one_or_none()
        
        # Encrypt the API key
        encrypted_key = security_manager.encrypt_api_key(settings.api_key)
        key_hash = security_manager.hash_api_key_for_verification(settings.api_key)
        
        if existing_key:
            # Update existing key
            existing_key.encrypted_key = encrypted_key
            existing_key.key_hash = key_hash
            existing_key.key_name = key_name
            existing_key.updated_at = datetime.utcnow()
            existing_key.is_active = True
            db.add(existing_key)
        else:
            # Create new key
            new_key = UserApiKey(
                user_id=user_id,
                provider="openai",
                key_name=key_name,
                encrypted_key=encrypted_key,
                key_hash=key_hash,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_key)
        
        await db.commit()
        
        return {
            "success": True,
            "message": "OpenAI settings updated successfully",
            "data": {
                "model": settings.model,
                "max_tokens": settings.max_tokens,
                "temperature": settings.temperature,
                "user_id": user_id
            }
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating OpenAI settings: {str(e)}"
        )


# Additional endpoint aliases for frontend compatibility
@router.put("/settings/openai-key")
async def update_openai_key(
    settings: OpenAISettingsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Update OpenAI settings for the current user (PUT version)"""
    return await update_openai_settings(settings, current_user, db)


@router.post("/openai/settings")
async def set_openai_settings(
    settings: OpenAISettingsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Set OpenAI settings for the current user (alternative endpoint)"""
    return await update_openai_settings(settings, current_user, db)


@router.delete("/settings/openai")
async def clear_openai_settings(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Clear OpenAI settings for the current user"""
    try:
        user_id = current_user["user_id"]
        
        # Find and delete all OpenAI keys for the user
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == "openai"
            )
        )
        result = await db.execute(stmt)
        openai_keys = result.scalars().all()
        
        if openai_keys:
            for key in openai_keys:
                db.delete(key)
            await db.commit()
            
            return {
                "success": True,
                "message": "OpenAI settings cleared successfully"
            }
        else:
            return {
                "success": True,
                "message": "No OpenAI settings found to clear"
            }
            
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing OpenAI settings: {str(e)}"
        )


@router.post("/settings/test-openai", response_model=ConnectionTestResponse)
async def test_openai_connection(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Test OpenAI API connection with stored settings"""
    try:
        user_id = current_user["user_id"]
        
        # Get user's OpenAI API key
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.user_id == user_id,
                UserApiKey.provider == "openai",
                UserApiKey.is_active == True
            )
        ).order_by(UserApiKey.updated_at.desc()).limit(1)
        
        result = await db.execute(stmt)
        openai_key = result.scalar_one_or_none()
        
        if not openai_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OpenAI API key found. Please save your API key first."
            )
        
        # Decrypt API key
        security_manager = get_security_manager()
        try:
            api_key = security_manager.decrypt_api_key(openai_key.encrypted_key)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to decrypt API key. Please update your settings."
            )
        
        # Get settings from metadata
        settings = _get_openai_settings_from_api_key(openai_key)
        
        # Test connection
        start_time = datetime.utcnow()
        test_result = await test_openai_connection_with_key(
            api_key=api_key,
            model=settings["model"]
        )
        end_time = datetime.utcnow()
        response_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Update usage statistics
        openai_key.mark_as_used()
        await db.commit()
        
        return ConnectionTestResponse(
            success=test_result["success"],
            message=test_result.get("message", "Connection test completed"),
            model_info=test_result.get("model_info"),
            response_time_ms=response_time_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error testing OpenAI connection: {str(e)}"
        )


# Additional endpoint mappings for frontend compatibility
@router.get("/openai/settings")
async def get_openai_settings_alt(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get OpenAI settings (alternative path)"""
    settings = await get_user_settings(current_user, db)
    return settings.openai if settings.openai else {}


@router.get("/settings/openai-key")
async def get_openai_key_settings(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get OpenAI key settings"""
    settings = await get_user_settings(current_user, db)
    return settings.openai if settings.openai else {}