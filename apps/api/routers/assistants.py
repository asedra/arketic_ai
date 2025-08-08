"""
Assistant API Router

Handles AI assistant management operations including:
- Creating, updating, deleting assistants
- Managing assistant knowledge bases and documents
- Listing and searching assistants
- Integration with chat system
"""

import logging
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, desc, and_

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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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
        # Get user object using proper async query
        user_query = select(User).where(User.id == current_user["user_id"])
        result = await db.execute(user_query)
        user = result.scalar_one_or_none()
        
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


# Knowledge association endpoints
@router.get("/{assistant_id}/knowledge", response_model=Dict[str, Any])
async def get_assistant_knowledge(
    assistant_id: str,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get knowledge bases and documents associated with an assistant"""
    try:
        from models.assistant import Assistant
        from models.knowledge import KnowledgeBase, KnowledgeDocument
        
        # Get assistant with relationships
        query = select(Assistant).where(Assistant.id == assistant_id)
        result = await db.execute(query)
        assistant = result.scalar_one_or_none()
        
        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )
        
        # Check permissions
        if not assistant.can_be_edited_by(str(current_user["user_id"])):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this assistant's knowledge"
            )
        
        # Get associated knowledge bases and documents
        knowledge_bases = []
        documents = []
        
        # Fetch knowledge bases
        kb_query = text("""
            SELECT kb.* FROM knowledge_bases kb
            JOIN assistant_knowledge_bases akb ON kb.id = akb.knowledge_base_id
            WHERE akb.assistant_id = :assistant_id
        """)
        kb_result = await db.execute(kb_query, {"assistant_id": assistant_id})
        kb_rows = kb_result.fetchall()
        
        for row in kb_rows:
            knowledge_bases.append({
                "id": str(row.id),
                "name": row.name,
                "description": row.description,
                "type": row.type,
                "document_count": row.total_documents
            })
        
        # Fetch documents
        doc_query = text("""
            SELECT kd.*, kb.name as collection_name FROM knowledge_documents kd
            JOIN assistant_documents ad ON kd.id = ad.document_id
            LEFT JOIN knowledge_bases kb ON kd.knowledge_base_id = kb.id
            WHERE ad.assistant_id = :assistant_id
        """)
        doc_result = await db.execute(doc_query, {"assistant_id": assistant_id})
        doc_rows = doc_result.fetchall()
        
        for row in doc_rows:
            documents.append({
                "id": str(row.id),
                "title": row.title,
                "knowledge_base_id": str(row.knowledge_base_id) if row.knowledge_base_id else None,
                "collection_name": row.collection_name,
                "source_type": row.source_type,
                "file_name": row.file_name
            })
        
        return {
            "assistant_id": assistant_id,
            "knowledge_bases": knowledge_bases,
            "documents": documents
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get assistant knowledge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get assistant knowledge"
        )


@router.post("/{assistant_id}/knowledge", response_model=Dict[str, Any])
async def update_assistant_knowledge(
    assistant_id: str,
    knowledge_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Update knowledge bases and documents associated with an assistant"""
    try:
        from models.assistant import Assistant
        
        # Get assistant
        query = select(Assistant).where(Assistant.id == assistant_id)
        result = await db.execute(query)
        assistant = result.scalar_one_or_none()
        
        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found"
            )
        
        # Check permissions
        if not assistant.can_be_edited_by(str(current_user["user_id"])):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to edit this assistant"
            )
        
        knowledge_base_ids = knowledge_data.get("knowledge_base_ids", [])
        document_ids = knowledge_data.get("document_ids", [])
        
        # Clear existing associations
        await db.execute(text(
            "DELETE FROM assistant_knowledge_bases WHERE assistant_id = :assistant_id"
        ), {"assistant_id": assistant_id})
        
        await db.execute(text(
            "DELETE FROM assistant_documents WHERE assistant_id = :assistant_id"
        ), {"assistant_id": assistant_id})
        
        # Add new knowledge base associations
        for kb_id in knowledge_base_ids:
            await db.execute(text("""
                INSERT INTO assistant_knowledge_bases (id, assistant_id, knowledge_base_id, created_by, created_at)
                VALUES (:id, :assistant_id, :kb_id, :user_id, :created_at)
            """), {
                "id": str(uuid4()),
                "assistant_id": assistant_id,
                "kb_id": kb_id,
                "user_id": str(current_user["user_id"]),
                "created_at": datetime.utcnow()
            })
        
        # Add new document associations
        for doc_id in document_ids:
            await db.execute(text("""
                INSERT INTO assistant_documents (id, assistant_id, document_id, created_by, created_at)
                VALUES (:id, :assistant_id, :doc_id, :user_id, :created_at)
            """), {
                "id": str(uuid4()),
                "assistant_id": assistant_id,
                "doc_id": doc_id,
                "user_id": str(current_user["user_id"]),
                "created_at": datetime.utcnow()
            })
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Knowledge associations updated successfully",
            "knowledge_base_count": len(knowledge_base_ids),
            "document_count": len(document_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update assistant knowledge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update assistant knowledge"
        )


@router.get("/{assistant_id}/available-knowledge", response_model=Dict[str, Any])
async def get_available_knowledge(
    assistant_id: str,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get all available knowledge bases and documents for selection"""
    try:
        # Check if this is for a new assistant
        is_new_assistant = assistant_id == 'new'
        
        # Get all accessible knowledge bases
        kb_query = text("""
            SELECT id, name, description, type, total_documents, is_public
            FROM knowledge_bases
            WHERE is_active = true 
            AND (is_public = true OR creator_id = :user_id)
            ORDER BY name
        """)
        kb_result = await db.execute(kb_query, {"user_id": str(current_user["user_id"])})
        kb_rows = kb_result.fetchall()
        
        collections = []
        for row in kb_rows:
            # Get documents for this collection
            doc_query = text("""
                SELECT id, title, source_type, file_name, chunk_count, token_count
                FROM knowledge_documents
                WHERE knowledge_base_id = :kb_id
                AND processing_status = 'completed'
                ORDER BY title
            """)
            doc_result = await db.execute(doc_query, {"kb_id": row.id})
            doc_rows = doc_result.fetchall()
            
            documents = [{
                "id": str(doc.id),
                "title": doc.title,
                "source_type": doc.source_type,
                "file_name": doc.file_name,
                "chunk_count": doc.chunk_count,
                "token_count": doc.token_count
            } for doc in doc_rows]
            
            collections.append({
                "id": str(row.id),
                "name": row.name,
                "description": row.description,
                "type": row.type,
                "document_count": row.total_documents,
                "is_public": row.is_public,
                "documents": documents
            })
        
        # Get current associations (only if not a new assistant)
        current_kb_ids = []
        current_doc_ids = []
        
        if not is_new_assistant:
            current_kb_query = text("""
                SELECT knowledge_base_id FROM assistant_knowledge_bases
                WHERE assistant_id = :assistant_id
            """)
            current_kb_result = await db.execute(current_kb_query, {"assistant_id": assistant_id})
            current_kb_ids = [str(row.knowledge_base_id) for row in current_kb_result]
            
            current_doc_query = text("""
                SELECT document_id FROM assistant_documents
                WHERE assistant_id = :assistant_id
            """)
            current_doc_result = await db.execute(current_doc_query, {"assistant_id": assistant_id})
            current_doc_ids = [str(row.document_id) for row in current_doc_result]
        
        return {
            "collections": collections,
            "selected_collection_ids": current_kb_ids,
            "selected_document_ids": current_doc_ids
        }
        
    except Exception as e:
        logger.error(f"Failed to get available knowledge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get available knowledge"
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