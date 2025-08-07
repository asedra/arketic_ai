"""
Assistant API Router

Handles AI assistant management operations including:
- Creating, updating, deleting assistants
- Managing assistant knowledge bases and documents
- Listing and searching assistants
- Integration with chat system
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user_dict
from models.user import User
from models.assistant import AIModel, AssistantStatus
from schemas.assistant import (
    AssistantCreateRequest, AssistantUpdateRequest, AssistantSearchRequest,
    AssistantKnowledgeRequest, AssistantChatRequest,
    AssistantResponse, AssistantDetailResponse, AssistantListResponse,
    AssistantChatResponse, AssistantModelsResponse, AssistantErrorResponse,
    PublicAssistantResponse, ModelOption
)
from services.assistant_service import assistant_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistants", tags=["AI Assistants"])


@router.post("/", response_model=AssistantDetailResponse)
async def create_assistant(
    request: AssistantCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Create a new AI assistant"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Creating assistant '{request.name}' for user {user.id}")
        
        assistant = await assistant_service.create_assistant(db, user, request)
        
        return assistant
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create assistant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create assistant: {str(e)}"
        )


@router.get("/", response_model=AssistantListResponse)
async def list_assistants(
    query: Optional[str] = Query(None, description="Search query"),
    ai_model: Optional[AIModel] = Query(None, description="Filter by AI model"),
    status_filter: Optional[AssistantStatus] = Query(None, alias="status", description="Filter by status"),
    is_public: Optional[bool] = Query(None, description="Filter by public/private"),
    creator_id: Optional[UUID] = Query(None, description="Filter by creator"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", regex="^(name|created_at|updated_at|last_used_at|total_messages)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """List assistants with filtering and pagination"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create search request
        search_request = AssistantSearchRequest(
            query=query,
            ai_model=ai_model,
            status=status_filter,
            is_public=is_public,
            creator_id=creator_id,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        logger.info(f"Listing assistants for user {user.id} with filters: {search_request.dict()}")
        
        assistants = await assistant_service.list_assistants(db, user, search_request)
        
        return assistants
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list assistants: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list assistants"
        )


@router.get("/{assistant_id}", response_model=AssistantDetailResponse)
async def get_assistant(
    assistant_id: UUID,
    include_details: bool = Query(True, description="Include full details"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Get a specific assistant by ID"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Getting assistant {assistant_id} for user {user.id}")
        
        assistant = await assistant_service.get_assistant(db, assistant_id, user, include_details)
        
        return assistant
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get assistant {assistant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistant"
        )


@router.put("/{assistant_id}", response_model=AssistantDetailResponse)
async def update_assistant(
    assistant_id: UUID,
    request: AssistantUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Update an existing assistant"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Updating assistant {assistant_id} for user {user.id}")
        
        assistant = await assistant_service.update_assistant(db, assistant_id, user, request)
        
        return assistant
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update assistant {assistant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assistant"
        )


@router.delete("/{assistant_id}")
async def delete_assistant(
    assistant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Delete an assistant (soft delete - marks as archived)"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Deleting assistant {assistant_id} for user {user.id}")
        
        result = await assistant_service.delete_assistant(db, assistant_id, user)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete assistant {assistant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete assistant"
        )


@router.post("/{assistant_id}/knowledge")
async def manage_assistant_knowledge(
    assistant_id: UUID,
    request: AssistantKnowledgeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Manage assistant's knowledge bases and documents"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Managing knowledge for assistant {assistant_id}, action: {request.action}")
        
        result = await assistant_service.manage_assistant_knowledge(
            db, assistant_id, user,
            knowledge_base_ids=request.knowledge_base_ids,
            document_ids=request.document_ids,
            action=request.action
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to manage assistant knowledge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to manage assistant knowledge"
        )


@router.get("/{assistant_id}/chat-config")
async def get_assistant_chat_config(
    assistant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Get assistant configuration for chat integration"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Getting chat config for assistant {assistant_id}")
        
        config = await assistant_service.get_assistant_for_chat(db, assistant_id, user)
        
        return {
            "success": True,
            "data": config,
            "timestamp": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get assistant chat config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistant configuration"
        )


@router.post("/{assistant_id}/usage")
async def log_assistant_usage(
    assistant_id: UUID,
    action: str,
    chat_id: Optional[UUID] = None,
    tokens_used: int = 0,
    processing_time_ms: Optional[int] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_dict)
):
    """Log assistant usage for analytics (background task)"""
    try:
        # Get user object
        user = await db.get(User, current_user["user_id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Add to background tasks to avoid blocking response
        background_tasks.add_task(
            assistant_service.log_assistant_usage,
            db, assistant_id, user.id, action, chat_id,
            tokens_used, processing_time_ms
        )
        
        return {
            "success": True,
            "message": "Usage logged successfully",
            "timestamp": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to log assistant usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log usage"
        )


@router.get("/models/available", response_model=AssistantModelsResponse)
async def get_available_models():
    """Get list of available AI models for assistants"""
    try:
        models = [
            ModelOption(
                value=AIModel.GPT_4O.value,
                label="GPT-4o",
                description="Most capable GPT-4 model, great for complex tasks",
                max_tokens=4096,
                cost_per_1k_tokens=0.03
            ),
            ModelOption(
                value=AIModel.GPT_4O_MINI.value,
                label="GPT-4o Mini",
                description="Smaller, faster GPT-4 model, good for simple tasks",
                max_tokens=4096,
                cost_per_1k_tokens=0.015
            ),
            ModelOption(
                value=AIModel.GPT_4_TURBO.value,
                label="GPT-4 Turbo",
                description="Enhanced GPT-4 with improved performance",
                max_tokens=4096,
                cost_per_1k_tokens=0.03
            ),
            ModelOption(
                value=AIModel.GPT_4.value,
                label="GPT-4",
                description="Most capable model, best for complex reasoning",
                max_tokens=8192,
                cost_per_1k_tokens=0.06
            ),
            ModelOption(
                value=AIModel.GPT_3_5_TURBO.value,
                label="GPT-3.5 Turbo",
                description="Fast and efficient, good for most tasks",
                max_tokens=4096,
                cost_per_1k_tokens=0.002
            ),
            ModelOption(
                value=AIModel.GPT_3_5_TURBO_16K.value,
                label="GPT-3.5 Turbo 16K",
                description="GPT-3.5 with extended context window",
                max_tokens=16384,
                cost_per_1k_tokens=0.004
            ),
            ModelOption(
                value=AIModel.CLAUDE_3_5_SONNET.value,
                label="Claude 3.5 Sonnet",
                description="Anthropic's most capable model",
                max_tokens=4096,
                cost_per_1k_tokens=0.03
            ),
            ModelOption(
                value=AIModel.CLAUDE_3_OPUS.value,
                label="Claude 3 Opus",
                description="Anthropic's most powerful model",
                max_tokens=4096,
                cost_per_1k_tokens=0.075
            ),
            ModelOption(
                value=AIModel.CLAUDE_3_HAIKU.value,
                label="Claude 3 Haiku",
                description="Fast and cost-effective Anthropic model",
                max_tokens=4096,
                cost_per_1k_tokens=0.0025
            )
        ]
        
        return AssistantModelsResponse(
            models=models,
            default_model=AIModel.GPT_4O.value
        )
        
    except Exception as e:
        logger.error(f"Failed to get available models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get available models"
        )


@router.get("/public/featured", response_model=List[PublicAssistantResponse])
async def get_featured_public_assistants(
    limit: int = Query(10, ge=1, le=50, description="Number of featured assistants"),
    db: AsyncSession = Depends(get_db)
):
    """Get featured public assistants"""
    try:
        # This would be implemented with a featured flag or based on usage stats
        # For now, return most used public assistants
        from sqlalchemy import select, desc, and_
        from models.assistant import Assistant
        
        query = select(Assistant).where(
            and_(
                Assistant.is_public == True,
                Assistant.status == "active"
            )
        ).order_by(desc(Assistant.total_conversations)).limit(limit)
        
        result = await db.execute(query)
        assistants = result.scalars().all()
        
        return [
            PublicAssistantResponse.from_orm(assistant)
            for assistant in assistants
        ]
        
    except Exception as e:
        logger.error(f"Failed to get featured assistants: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get featured assistants"
        )


# Health check endpoint - no authentication required
@router.get("/health", tags=["Health"])
async def assistant_service_health():
    """Health check for assistant service"""
    try:
        return {
            "status": "healthy",
            "service": "assistant_service",
            "timestamp": datetime.utcnow(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Assistant service health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assistant service unhealthy"
        )