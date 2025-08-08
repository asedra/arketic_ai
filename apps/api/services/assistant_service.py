"""
Assistant Service

Business logic layer for AI assistant management operations.
Handles assistant creation, updates, knowledge management, and usage tracking.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, text, select, delete, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException

from models.user import User
from models.assistant import Assistant, AssistantStatus, AIModel, AssistantUsageLog
from schemas.assistant import (
    AssistantCreateRequest, AssistantUpdateRequest, AssistantSearchRequest,
    AssistantResponse, AssistantDetailResponse, AssistantListResponse
)

logger = logging.getLogger(__name__)


class AssistantService:
    """Service for managing AI assistants"""
    
    def __init__(self):
        self.default_system_prompts = self._load_default_prompts()
    
    async def create_assistant(
        self,
        db: AsyncSession,
        user: User,
        request: AssistantCreateRequest
    ) -> AssistantDetailResponse:
        """Create a new AI assistant"""
        try:
            # Debug logging
            logger.info(f"Request ai_model type: {type(request.ai_model)}, value: {request.ai_model}")
            
            # Create the assistant  
            assistant = Assistant(
                name=request.name,
                description=request.description,
                system_prompt=request.system_prompt,
                ai_model=request.ai_model.value if hasattr(request.ai_model, 'value') else request.ai_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                status=AssistantStatus.ACTIVE.value,  # Explicitly set status to the value
                is_public=request.is_public,
                creator_id=user.id,
                configuration=request.configuration
            )
            
            db.add(assistant)
            await db.flush()  # Get the assistant ID
            
            # Add knowledge bases if specified
            if request.knowledge_base_ids:
                await self._add_knowledge_bases(db, assistant.id, request.knowledge_base_ids, user.id)
            
            # Add documents if specified
            if request.document_ids:
                await self._add_documents(db, assistant.id, request.document_ids, user.id)
            
            await db.commit()
            await db.refresh(assistant)
            
            # Load relationships for detailed response
            assistant_with_relations = await self._get_assistant_with_relations(db, assistant.id)
            
            logger.info(f"Created assistant {assistant.id} '{assistant.name}' for user {user.id}")
            
            return await self._to_detail_response(assistant_with_relations)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create assistant: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create assistant: {str(e)}")
    
    async def get_assistant(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user: User,
        include_details: bool = False
    ) -> AssistantDetailResponse:
        """Get an assistant by ID"""
        try:
            assistant = await self._get_assistant_with_relations(db, assistant_id)
            
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            
            # Check access permissions
            if not assistant.can_be_used_by(str(user.id)):
                raise HTTPException(status_code=403, detail="Access denied to this assistant")
            
            if include_details:
                return await self._to_detail_response(assistant)
            else:
                return AssistantResponse.from_orm(assistant)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get assistant {assistant_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get assistant: {str(e)}")
    
    async def update_assistant(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user: User,
        request: AssistantUpdateRequest
    ) -> AssistantDetailResponse:
        """Update an existing assistant"""
        try:
            # Get and validate assistant
            assistant = await self._get_assistant_with_relations(db, assistant_id)
            
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            
            if not assistant.can_be_edited_by(str(user.id)):
                raise HTTPException(status_code=403, detail="No permission to edit this assistant")
            
            # Update basic fields
            if request.name is not None:
                assistant.name = request.name
            if request.description is not None:
                assistant.description = request.description
            if request.system_prompt is not None:
                assistant.system_prompt = request.system_prompt
            if request.ai_model is not None:
                assistant.ai_model = request.ai_model.value if hasattr(request.ai_model, 'value') else request.ai_model
            if request.temperature is not None:
                assistant.temperature = request.temperature
            if request.max_tokens is not None:
                assistant.max_tokens = request.max_tokens
            if request.status is not None:
                assistant.status = request.status.value if hasattr(request.status, 'value') else request.status
            if request.is_public is not None:
                assistant.is_public = request.is_public
            if request.configuration is not None:
                assistant.configuration = request.configuration
            
            # Update knowledge relationships if specified
            if request.knowledge_base_ids is not None:
                await self._replace_knowledge_bases(db, assistant_id, request.knowledge_base_ids, user.id)
            
            if request.document_ids is not None:
                await self._replace_documents(db, assistant_id, request.document_ids, user.id)
            
            assistant.updated_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(assistant)
            
            # Reload with relationships
            updated_assistant = await self._get_assistant_with_relations(db, assistant_id)
            
            logger.info(f"Updated assistant {assistant_id} for user {user.id}")
            
            return await self._to_detail_response(updated_assistant)
            
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update assistant {assistant_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update assistant: {str(e)}")
    
    async def delete_assistant(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user: User
    ) -> Dict[str, Any]:
        """Delete an assistant"""
        try:
            # Get and validate assistant
            query = select(Assistant).where(Assistant.id == assistant_id)
            result = await db.execute(query)
            assistant = result.scalar_one_or_none()
            
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            
            if not assistant.can_be_edited_by(str(user.id)):
                raise HTTPException(status_code=403, detail="No permission to delete this assistant")
            
            assistant_name = assistant.name
            
            # Soft delete by setting status to archived
            assistant.status = AssistantStatus.ARCHIVED.value
            assistant.updated_at = datetime.utcnow()
            
            await db.commit()
            
            logger.info(f"Deleted assistant {assistant_id} '{assistant_name}' for user {user.id}")
            
            return {
                "message": f"Assistant '{assistant_name}' deleted successfully",
                "assistant_id": assistant_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to delete assistant {assistant_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete assistant: {str(e)}")
    
    async def list_assistants(
        self,
        db: AsyncSession,
        user: User,
        search: Optional[AssistantSearchRequest] = None
    ) -> AssistantListResponse:
        """List assistants with filtering and pagination"""
        try:
            # Build base query with eager loading of relationships for counts
            query = select(Assistant).options(
                selectinload(Assistant.knowledge_bases),
                selectinload(Assistant.documents)
            ).where(
                or_(
                    Assistant.creator_id == user.id,  # User's assistants
                    and_(Assistant.is_public == True, Assistant.status == "active")  # Public assistants - use string value
                )
            )
            
            # Apply search filters if provided
            if search:
                if search.query:
                    search_term = f"%{search.query}%"
                    query = query.where(
                        or_(
                            Assistant.name.ilike(search_term),
                            Assistant.description.ilike(search_term)
                        )
                    )
                
                if search.ai_model:
                    query = query.where(Assistant.ai_model == (search.ai_model.value if hasattr(search.ai_model, 'value') else search.ai_model))
                
                if search.status:
                    # search.status is a string value due to use_enum_values = True
                    status_value = search.status.value if hasattr(search.status, 'value') else search.status
                    query = query.where(Assistant.status == status_value)
                else:
                    # Default: exclude archived unless specifically requested
                    query = query.where(Assistant.status != "archived")
                
                if search.is_public is not None:
                    query = query.where(Assistant.is_public == search.is_public)
                
                if search.creator_id:
                    query = query.where(Assistant.creator_id == search.creator_id)
                
                # Apply sorting
                sort_column = getattr(Assistant, search.sort_by, Assistant.created_at)
                if search.sort_order == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
                
                # Calculate pagination
                offset = (search.page - 1) * search.limit
                query = query.offset(offset).limit(search.limit)
            else:
                # Default: exclude archived and sort by creation date
                query = query.where(Assistant.status != "archived")
                query = query.order_by(Assistant.created_at.desc()).limit(20)
            
            # Get total count for pagination
            count_query = select(func.count(Assistant.id)).where(
                or_(
                    Assistant.creator_id == user.id,
                    and_(Assistant.is_public == True, Assistant.status == "active")
                )
            )
            
            if search:
                # Apply same filters to count query
                if search.query:
                    search_term = f"%{search.query}%"
                    count_query = count_query.where(
                        or_(
                            Assistant.name.ilike(search_term),
                            Assistant.description.ilike(search_term)
                        )
                    )
                
                if search.ai_model:
                    count_query = count_query.where(Assistant.ai_model == (search.ai_model.value if hasattr(search.ai_model, 'value') else search.ai_model))
                
                if search.status:
                    # search.status is a string value due to use_enum_values = True
                    status_value = search.status.value if hasattr(search.status, 'value') else search.status
                    count_query = count_query.where(Assistant.status == status_value)
                else:
                    count_query = count_query.where(Assistant.status != "archived")
                
                if search.is_public is not None:
                    count_query = count_query.where(Assistant.is_public == search.is_public)
                
                if search.creator_id:
                    count_query = count_query.where(Assistant.creator_id == search.creator_id)
            else:
                count_query = count_query.where(Assistant.status != AssistantStatus.ARCHIVED.value)
            
            # Execute queries
            result = await db.execute(query)
            assistants = result.scalars().all()
            
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            # Convert to response objects
            assistant_responses = [AssistantResponse.from_orm(assistant) for assistant in assistants]
            
            # Pagination info
            page = search.page if search else 1
            limit = search.limit if search else 20
            
            return AssistantListResponse(
                assistants=assistant_responses,
                total=total,
                page=page,
                limit=limit,
                has_next=(page * limit) < total,
                has_prev=page > 1
            )
            
        except Exception as e:
            logger.error(f"Failed to list assistants: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to list assistants: {str(e)}")
    
    async def manage_assistant_knowledge(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user: User,
        knowledge_base_ids: Optional[List[UUID]] = None,
        document_ids: Optional[List[UUID]] = None,
        action: str = "replace"
    ) -> Dict[str, Any]:
        """Manage assistant's knowledge base and document associations"""
        try:
            # Get and validate assistant
            query = select(Assistant).where(Assistant.id == assistant_id)
            result = await db.execute(query)
            assistant = result.scalar_one_or_none()
            
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            
            if not assistant.can_be_edited_by(str(user.id)):
                raise HTTPException(status_code=403, detail="No permission to edit this assistant")
            
            result = {"knowledge_bases": [], "documents": []}
            
            # Handle knowledge bases
            if knowledge_base_ids is not None:
                if action == "add":
                    await self._add_knowledge_bases(db, assistant_id, knowledge_base_ids, user.id)
                elif action == "remove":
                    await self._remove_knowledge_bases(db, assistant_id, knowledge_base_ids)
                elif action == "replace":
                    await self._replace_knowledge_bases(db, assistant_id, knowledge_base_ids, user.id)
                
                result["knowledge_bases"] = knowledge_base_ids
            
            # Handle documents
            if document_ids is not None:
                if action == "add":
                    await self._add_documents(db, assistant_id, document_ids, user.id)
                elif action == "remove":
                    await self._remove_documents(db, assistant_id, document_ids)
                elif action == "replace":
                    await self._replace_documents(db, assistant_id, document_ids, user.id)
                
                result["documents"] = document_ids
            
            assistant.updated_at = datetime.utcnow()
            await db.commit()
            
            logger.info(f"Updated knowledge for assistant {assistant_id}, action: {action}")
            
            return {
                "message": "Assistant knowledge updated successfully",
                "action": action,
                "result": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to manage assistant knowledge: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to manage assistant knowledge: {str(e)}")
    
    async def log_assistant_usage(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user_id: UUID,
        action: str,
        chat_id: Optional[UUID] = None,
        tokens_used: int = 0,
        processing_time_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log assistant usage for analytics"""
        try:
            usage_log = AssistantUsageLog(
                assistant_id=assistant_id,
                user_id=user_id,
                chat_id=chat_id,
                action=action,
                tokens_used=tokens_used,
                processing_time_ms=processing_time_ms,
                metadata=metadata
            )
            
            db.add(usage_log)
            
            # Update assistant statistics
            query = select(Assistant).where(Assistant.id == assistant_id)
            result = await db.execute(query)
            assistant = result.scalar_one_or_none()
            if assistant:
                if action == "message":
                    assistant.mark_as_used()
                    assistant.add_token_usage(tokens_used)
                elif action == "conversation_start":
                    assistant.increment_conversations()
            
            await db.commit()
            
        except Exception as e:
            logger.warning(f"Failed to log assistant usage: {str(e)}")
            # Don't raise exception for usage logging failures
    
    async def get_assistant_for_chat(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        user: User
    ) -> Dict[str, Any]:
        """Get assistant configuration for chat integration"""
        try:
            assistant = await self._get_assistant_with_relations(db, assistant_id)
            
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            
            if not assistant.can_be_used_by(str(user.id)):
                raise HTTPException(status_code=403, detail="Access denied to this assistant")
            
            # Get knowledge base IDs for RAG integration (placeholder for now)
            knowledge_base_ids = []  # Will be implemented when knowledge base relationships are added
            document_ids = []  # Will be implemented when document relationships are added
            
            return {
                "id": str(assistant.id),
                "name": assistant.name,
                "description": assistant.description,
                "system_prompt": assistant.system_prompt,
                "ai_model": assistant.ai_model.value,
                "temperature": assistant.temperature,
                "max_tokens": assistant.max_tokens,
                "knowledge_base_ids": knowledge_base_ids,
                "document_ids": document_ids,
                "configuration": assistant.configuration or {}
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get assistant for chat: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get assistant configuration: {str(e)}")
    
    # Helper methods
    
    async def _get_assistant_with_relations(
        self,
        db: AsyncSession,
        assistant_id: UUID
    ) -> Optional[Assistant]:
        """Get assistant with relationships loaded"""
        # Get the assistant with eager loading of relationships
        query = select(Assistant).options(
            selectinload(Assistant.knowledge_bases),
            selectinload(Assistant.documents)
        ).where(Assistant.id == assistant_id)
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def _add_knowledge_bases(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        knowledge_base_ids: List[UUID],
        user_id: UUID
    ) -> None:
        """Add knowledge bases to assistant"""
        if not knowledge_base_ids:
            return
            
        # Verify user has access to each knowledge base
        for kb_id in knowledge_base_ids:
            await self._verify_knowledge_base_access(db, kb_id, user_id)
        
        # Insert new associations
        for kb_id in knowledge_base_ids:
            # Check if association already exists
            check_query = text("""
                SELECT id FROM assistant_knowledge_bases
                WHERE assistant_id = :assistant_id AND knowledge_base_id = :kb_id
            """)
            
            result = await db.execute(check_query, {
                "assistant_id": str(assistant_id),
                "kb_id": str(kb_id)
            })
            
            if not result.fetchone():
                # Insert new association
                insert_query = text("""
                    INSERT INTO assistant_knowledge_bases (id, assistant_id, knowledge_base_id, created_by, created_at)
                    VALUES (:id, :assistant_id, :kb_id, :user_id, :created_at)
                """)
                
                await db.execute(insert_query, {
                    "id": str(uuid4()),
                    "assistant_id": str(assistant_id),
                    "kb_id": str(kb_id),
                    "user_id": str(user_id),
                    "created_at": datetime.utcnow()
                })
        
        logger.info(f"Added {len(knowledge_base_ids)} knowledge bases to assistant {assistant_id}")
    
    async def _remove_knowledge_bases(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        knowledge_base_ids: List[UUID]
    ) -> None:
        """Remove knowledge bases from assistant"""
        if not knowledge_base_ids:
            return
            
        # Delete associations
        delete_query = text("""
            DELETE FROM assistant_knowledge_bases
            WHERE assistant_id = :assistant_id 
            AND knowledge_base_id = ANY(:kb_ids)
        """)
        
        await db.execute(delete_query, {
            "assistant_id": str(assistant_id),
            "kb_ids": [str(kb_id) for kb_id in knowledge_base_ids]
        })
        
        logger.info(f"Removed {len(knowledge_base_ids)} knowledge bases from assistant {assistant_id}")
    
    async def _replace_knowledge_bases(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        knowledge_base_ids: List[UUID],
        user_id: UUID
    ) -> None:
        """Replace all knowledge bases for assistant"""
        # Delete all existing associations
        delete_query = text("""
            DELETE FROM assistant_knowledge_bases
            WHERE assistant_id = :assistant_id
        """)
        
        await db.execute(delete_query, {
            "assistant_id": str(assistant_id)
        })
        
        # Add new associations
        if knowledge_base_ids:
            await self._add_knowledge_bases(db, assistant_id, knowledge_base_ids, user_id)
        
        logger.info(f"Replaced knowledge bases for assistant {assistant_id} with {len(knowledge_base_ids)} items")
    
    async def _add_documents(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        document_ids: List[UUID],
        user_id: UUID
    ) -> None:
        """Add documents to assistant"""
        if not document_ids:
            return
            
        # Verify user has access to each document
        for doc_id in document_ids:
            await self._verify_document_access(db, doc_id, user_id)
        
        # Insert new associations
        for doc_id in document_ids:
            # Check if association already exists
            check_query = text("""
                SELECT id FROM assistant_documents
                WHERE assistant_id = :assistant_id AND document_id = :doc_id
            """)
            
            result = await db.execute(check_query, {
                "assistant_id": str(assistant_id),
                "doc_id": str(doc_id)
            })
            
            if not result.fetchone():
                # Insert new association
                insert_query = text("""
                    INSERT INTO assistant_documents (id, assistant_id, document_id, created_by, created_at)
                    VALUES (:id, :assistant_id, :doc_id, :user_id, :created_at)
                """)
                
                await db.execute(insert_query, {
                    "id": str(uuid4()),
                    "assistant_id": str(assistant_id),
                    "doc_id": str(doc_id),
                    "user_id": str(user_id),
                    "created_at": datetime.utcnow()
                })
        
        logger.info(f"Added {len(document_ids)} documents to assistant {assistant_id}")
    
    async def _remove_documents(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        document_ids: List[UUID]
    ) -> None:
        """Remove documents from assistant"""
        if not document_ids:
            return
            
        # Delete associations
        delete_query = text("""
            DELETE FROM assistant_documents
            WHERE assistant_id = :assistant_id 
            AND document_id = ANY(:doc_ids)
        """)
        
        await db.execute(delete_query, {
            "assistant_id": str(assistant_id),
            "doc_ids": [str(doc_id) for doc_id in document_ids]
        })
        
        logger.info(f"Removed {len(document_ids)} documents from assistant {assistant_id}")
    
    async def _replace_documents(
        self,
        db: AsyncSession,
        assistant_id: UUID,
        document_ids: List[UUID],
        user_id: UUID
    ) -> None:
        """Replace all documents for assistant"""
        # Delete all existing associations
        delete_query = text("""
            DELETE FROM assistant_documents
            WHERE assistant_id = :assistant_id
        """)
        
        await db.execute(delete_query, {
            "assistant_id": str(assistant_id)
        })
        
        # Add new associations
        if document_ids:
            await self._add_documents(db, assistant_id, document_ids, user_id)
        
        logger.info(f"Replaced documents for assistant {assistant_id} with {len(document_ids)} items")
    
    async def _verify_knowledge_base_access(
        self,
        db: AsyncSession,
        knowledge_base_id: UUID,
        user_id: UUID
    ) -> None:
        """Verify user has access to knowledge base"""
        query = text("""
            SELECT id FROM knowledge_bases
            WHERE id = :kb_id AND (
                is_public = true OR
                creator_id = :user_id
            )
        """)
        
        result = await db.execute(query, {
            "kb_id": str(knowledge_base_id),
            "user_id": str(user_id)
        })
        
        if not result.fetchone():
            raise HTTPException(status_code=404, detail=f"Knowledge base {knowledge_base_id} not found or access denied")
    
    async def _verify_document_access(
        self,
        db: AsyncSession,
        document_id: UUID,
        user_id: UUID
    ) -> None:
        """Verify user has access to document"""
        query = text("""
            SELECT d.id FROM knowledge_documents d
            JOIN knowledge_bases kb ON d.knowledge_base_id = kb.id
            WHERE d.id = :doc_id AND (
                kb.is_public = true OR
                kb.creator_id = :user_id
            )
        """)
        
        result = await db.execute(query, {
            "doc_id": str(document_id),
            "user_id": str(user_id)
        })
        
        if not result.fetchone():
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found or access denied")
    
    async def _to_detail_response(self, assistant: Assistant) -> AssistantDetailResponse:
        """Convert assistant to detailed response"""
        response_dict = assistant.to_dict(include_config=True)
        
        # Add knowledge bases info
        response_dict["knowledge_bases"] = []
        if hasattr(assistant, 'knowledge_bases') and assistant.knowledge_bases:
            for kb in assistant.knowledge_bases:
                response_dict["knowledge_bases"].append({
                    "knowledge_base_id": str(kb.id),
                    "name": kb.name,
                    "description": kb.description
                })
        
        # Add documents info
        response_dict["documents"] = []
        if hasattr(assistant, 'documents') and assistant.documents:
            for doc in assistant.documents:
                response_dict["documents"].append({
                    "document_id": str(doc.id),
                    "title": doc.title,
                    "knowledge_base_id": str(doc.knowledge_base_id) if doc.knowledge_base_id else None
                })
        
        # Update counts
        response_dict["knowledge_count"] = len(response_dict["knowledge_bases"])
        response_dict["document_count"] = len(response_dict["documents"])
        
        return AssistantDetailResponse(**response_dict)
    
    def _load_default_prompts(self) -> Dict[str, str]:
        """Load default system prompts for different use cases"""
        return {
            "general": "You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.",
            "code_assistant": "You are an expert programming assistant. Help users with coding questions, provide code examples, explain programming concepts, and assist with debugging.",
            "writing_assistant": "You are a professional writing assistant. Help users improve their writing, provide suggestions for clarity and style, and assist with various forms of written communication.",
            "research_assistant": "You are a research assistant. Help users find information, analyze data, summarize complex topics, and provide well-sourced answers to research questions.",
            "customer_support": "You are a friendly and helpful customer support agent. Assist customers with their questions, provide solutions to problems, and ensure a positive experience.",
            "teacher": "You are an educational assistant. Help students learn new concepts, explain complex topics in simple terms, and provide educational guidance and support.",
        }


# Singleton instance
assistant_service = AssistantService()