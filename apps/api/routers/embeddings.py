"""
Embeddings router for vector generation and management
Handles embedding generation with multi-provider support and fallback
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user_dict
from services.embedding_service import embedding_service, EmbeddingProvider
from services.audit_service import audit_service, AuditEventType, AuditSeverity

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class EmbeddingRequest(BaseModel):
    """Request model for generating embeddings"""
    texts: List[str] = Field(..., description="List of texts to generate embeddings for")
    knowledge_base_id: Optional[str] = Field(None, description="Knowledge base ID for context")
    preferred_provider: Optional[str] = Field(None, description="Preferred embedding provider")
    preferred_model: Optional[str] = Field(None, description="Preferred embedding model")
    
    class Config:
        json_schema_extra = {
            "example": {
                "texts": [
                    "This is a sample text for embedding generation.",
                    "Another text to be converted to vector representation."
                ],
                "preferred_provider": "openai",
                "preferred_model": "text-embedding-3-small"
            }
        }


class EmbeddingResponse(BaseModel):
    """Response model for embedding generation"""
    embeddings: List[List[float]]
    provider: str
    model: str
    tokens: int
    cost: float
    rate_limit_info: Optional[Dict[str, Any]] = None
    fallback_reason: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "embeddings": [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
                "provider": "openai",
                "model": "text-embedding-3-small",
                "tokens": 150,
                "cost": 0.003,
                "rate_limit_info": {
                    "requests_remaining": 2999,
                    "tokens_remaining": 999850
                }
            }
        }


class UsageStatisticsResponse(BaseModel):
    """Response model for usage statistics"""
    user_id: str
    period: Dict[str, str]
    providers: Dict[str, Dict[str, Any]]
    total: Dict[str, Any]


class ProviderStatusResponse(BaseModel):
    """Response model for provider status"""
    providers: Dict[str, Dict[str, Any]]


# API Endpoints
@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embeddings(
    request: EmbeddingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Generate embeddings for given texts with automatic provider fallback"""
    
    start_time = datetime.utcnow()
    user_id = current_user["user_id"]
    
    try:
        # Validate inputs
        if not request.texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No texts provided for embedding generation"
            )
        
        if len(request.texts) > 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 1000 texts allowed per request"
            )
        
        # Parse provider if specified
        preferred_provider = None
        if request.preferred_provider:
            try:
                preferred_provider = EmbeddingProvider(request.preferred_provider.lower())
            except ValueError:
                logger.warning(f"Invalid provider specified: {request.preferred_provider}")
        
        # Generate embeddings with fallback
        embeddings, metadata = await embedding_service.generate_embeddings_with_fallback(
            texts=request.texts,
            user_id=user_id,
            preferred_provider=preferred_provider,
            preferred_model=request.preferred_model
        )
        
        # Calculate latency
        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Log audit event
        await audit_service.log_embedding_operation(
            user_id=user_id,
            provider=metadata.get("provider", "unknown"),
            model=metadata.get("model", "unknown"),
            text_count=len(request.texts),
            token_count=metadata.get("tokens", 0),
            success=True,
            latency_ms=latency_ms,
            fallback_reason=metadata.get("fallback_reason")
        )
        
        # Prepare response
        response = EmbeddingResponse(
            embeddings=embeddings,
            provider=metadata.get("provider", "unknown"),
            model=metadata.get("model", "unknown"),
            tokens=metadata.get("tokens", 0),
            cost=metadata.get("cost", 0.0),
            rate_limit_info=metadata.get("rate_limit_info"),
            fallback_reason=metadata.get("fallback_reason")
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        
        # Log audit event for failure
        await audit_service.log_embedding_operation(
            user_id=user_id,
            provider=request.preferred_provider or "unknown",
            model=request.preferred_model or "unknown",
            text_count=len(request.texts),
            token_count=0,
            success=False,
            latency_ms=(datetime.utcnow() - start_time).total_seconds() * 1000,
            error_message=str(e)
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate embeddings"
        )


@router.get("/usage", response_model=UsageStatisticsResponse)
async def get_usage_statistics(
    start_date: Optional[datetime] = Query(None, description="Start date for statistics"),
    end_date: Optional[datetime] = Query(None, description="End date for statistics"),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get embedding usage statistics for the current user"""
    
    try:
        user_id = current_user["user_id"]
        
        # Default to last 30 days if no dates specified
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Get usage statistics
        stats = await embedding_service.get_usage_statistics(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return UsageStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get usage statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage statistics"
        )


@router.get("/providers/status", response_model=ProviderStatusResponse)
async def get_provider_status(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get current status of all embedding providers"""
    
    try:
        status = await embedding_service.get_provider_status()
        return ProviderStatusResponse(providers=status)
        
    except Exception as e:
        logger.error(f"Failed to get provider status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve provider status"
        )


@router.get("/providers")
async def get_available_providers(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get list of available embedding providers and their models"""
    
    try:
        providers = []
        
        for provider in EmbeddingProvider:
            provider_info = {
                "name": provider.value,
                "models": [],
                "default_model": embedding_service._get_default_model(provider)
            }
            
            # Get models from provider config
            from services.embedding_service import ProviderConfig
            config = ProviderConfig.CONFIGS.get(provider, {})
            models = config.get("models", {})
            
            for model_name, model_config in models.items():
                provider_info["models"].append({
                    "name": model_name,
                    "dimensions": model_config.get("dimensions"),
                    "max_batch_size": model_config.get("max_batch"),
                    "max_tokens": model_config.get("max_tokens"),
                    "cost_per_1k_tokens": config.get("cost_per_1k_tokens", 0)
                })
            
            providers.append(provider_info)
        
        return {"providers": providers}
        
    except Exception as e:
        logger.error(f"Failed to get available providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available providers"
        )


@router.post("/test-provider")
async def test_provider(
    provider: str,
    model: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Test a specific embedding provider with user's API key"""
    
    try:
        user_id = current_user["user_id"]
        
        # Parse provider
        try:
            provider_enum = EmbeddingProvider(provider.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider: {provider}"
            )
        
        # Test with a simple text
        test_text = ["This is a test embedding generation."]
        
        embeddings, metadata = await embedding_service.generate_embeddings_with_fallback(
            texts=test_text,
            user_id=user_id,
            preferred_provider=provider_enum,
            preferred_model=model
        )
        
        # Check if the requested provider was actually used
        success = metadata.get("provider") == provider_enum.value
        
        return {
            "success": success,
            "provider": metadata.get("provider"),
            "model": metadata.get("model"),
            "message": "Provider test successful" if success else f"Fallback to {metadata.get('provider')}",
            "details": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to test provider: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test provider: {str(e)}"
        )