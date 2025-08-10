"""
Knowledge Management API Router

REST API endpoints for knowledge management including document upload,
search, RAG queries, and collection management.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from schemas.knowledge import (
    DocumentUploadRequest,
    DocumentUploadResponse,
    DocumentFileUploadResponse,
    DocumentListRequest,
    DocumentListResponse,
    DocumentDetailResponse,
    DocumentEmbeddingsResponse,
    SearchRequest,
    SearchResponse,
    RAGQueryRequest,
    RAGQueryResponse,
    SimilarDocumentsRequest,
    SimilarDocumentsResponse,
    CollectionCreateRequest,
    CollectionCreateResponse,
    CollectionListRequest,
    CollectionListResponse,
    CollectionUpdateRequest,
    CollectionUpdateResponse,
    CollectionDeleteResponse,
    ErrorResponse,
    ErrorDetail
)
from services.knowledge_service import knowledge_service
# Rate limiting will be handled by middleware

router = APIRouter(prefix="/api/v1", tags=["Knowledge Management"])


# Document Management Endpoints

@router.post(
    "/knowledge/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload text document",
    description="Upload text content as a document to the knowledge base"
)
async def upload_document(
    request: DocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload text content as a document.
    
    This endpoint accepts text content, splits it into chunks,
    generates embeddings, and stores them in PGVector.
    """
    try:
        result = await knowledge_service.upload_document_text(
            db=db,
            user=current_user,
            knowledge_base_id=request.knowledge_base_id,
            title=request.title,
            content=request.content,
            source_type=request.source_type,
            metadata=request.metadata
        )
        return DocumentUploadResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload document: {str(e)}"
        )


@router.post(
    "/knowledge/upload/file",
    response_model=DocumentFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document file",
    description="Upload a file (PDF, TXT, MD, DOCX) as a document"
)
async def upload_document_file(
    knowledge_base_id: Optional[UUID] = Query(None, description="Knowledge base ID (optional)"),
    file: UploadFile = File(..., description="File to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a file as a document.
    
    Supports PDF, TXT, MD, and DOCX files.
    Automatically extracts text and processes it for embedding.
    """
    try:
        result = await knowledge_service.upload_document_file(
            db=db,
            user=current_user,
            knowledge_base_id=knowledge_base_id,
            file=file
        )
        return DocumentFileUploadResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post(
    "/knowledge/upload/files",
    response_model=List[DocumentFileUploadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload multiple document files",
    description="Upload multiple files (PDF, TXT, MD, DOCX) as documents"
)
async def upload_document_files(
    knowledge_base_id: Optional[UUID] = Query(None, description="Knowledge base ID (optional)"),
    files: List[UploadFile] = File(..., description="Files to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload multiple files as documents.
    
    Supports PDF, TXT, MD, and DOCX files.
    Automatically extracts text and processes each file for embedding.
    Returns results for each file including success/failure status.
    """
    try:
        results = await knowledge_service.upload_document_files(
            db=db,
            user=current_user,
            knowledge_base_id=knowledge_base_id,
            files=files
        )
        return [DocumentFileUploadResponse(**result) for result in results]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}"
        )


@router.get(
    "/knowledge/list",
    response_model=DocumentListResponse,
    summary="List documents",
    description="List all documents in a knowledge base with pagination"
)
async def list_documents(
    knowledge_base_id: Optional[str] = Query(None, description="Knowledge base ID (optional)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    search: Optional[str] = Query(None, description="Search in title and content"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all documents in a knowledge base.
    
    Supports pagination, sorting, searching, and filtering.
    """
    try:
        # Handle "None" string being passed as knowledge_base_id
        parsed_kb_id = None
        if knowledge_base_id and knowledge_base_id.lower() != "none":
            try:
                parsed_kb_id = UUID(knowledge_base_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid UUID format for knowledge_base_id: {knowledge_base_id}"
                )
        
        result = await knowledge_service.list_documents(
            db=db,
            user=current_user,
            knowledge_base_id=parsed_kb_id,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            search=search,
            source_type=source_type,
            status=status
        )
        return DocumentListResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )


@router.get(
    "/knowledge/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document details",
    description="Get detailed information about a specific document"
)
async def get_document_details(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a document.
    
    Returns document metadata, content preview, and chunk information.
    """
    try:
        result = await knowledge_service.get_document_details(
            db=db,
            user=current_user,
            document_id=document_id
        )
        return DocumentDetailResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document details: {str(e)}"
        )


@router.get(
    "/knowledge/{document_id}/embeddings",
    response_model=DocumentEmbeddingsResponse,
    summary="Get document embeddings",
    description="Retrieve all embeddings for a specific document"
)
async def get_document_embeddings(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all embeddings for a document.
    
    Returns embedding chunks with their text content and metadata.
    Useful for debugging and understanding how documents are processed.
    """
    try:
        result = await knowledge_service.get_document_embeddings(
            db=db,
            user=current_user,
            document_id=document_id
        )
        return DocumentEmbeddingsResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document embeddings: {str(e)}"
        )


@router.delete(
    "/knowledge/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete document",
    description="Delete a document and all its embeddings"
)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document and all its embeddings.
    
    This operation is permanent and cannot be undone.
    """
    try:
        result = await knowledge_service.delete_document(
            db=db,
            user=current_user,
            document_id=document_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


# Search & Retrieval Endpoints

@router.post(
    "/knowledge/search",
    response_model=SearchResponse,
    summary="Semantic search",
    description="Perform semantic search using vector similarity"
)
async def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for similar documents using vector similarity.
    
    Supports three search types:
    - semantic: Pure vector similarity search
    - keyword: PostgreSQL full-text search
    - hybrid: Combination of semantic and keyword search
    """
    try:
        result = await knowledge_service.semantic_search(
            db=db,
            user=current_user,
            query=request.query,
            knowledge_base_id=request.knowledge_base_id,
            document_id=request.document_id,
            k=request.k,
            score_threshold=request.score_threshold,
            search_type=request.search_type,
            filters=request.filters
        )
        return SearchResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.post(
    "/knowledge/query",
    response_model=RAGQueryResponse,
    summary="RAG query",
    description="Perform Retrieval Augmented Generation query"
)
async def rag_query(
    request: RAGQueryRequest,
    request_obj: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform RAG (Retrieval Augmented Generation) query.
    
    Retrieves relevant documents and uses them as context
    to generate an answer using the specified LLM.
    """
    # Get API key from header or user settings
    x_api_key = request_obj.headers.get("x-api-key")
    if not x_api_key:
        # Would need to fetch from user settings/database
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key required for RAG queries. Please provide x-api-key header."
        )
    
    try:
        result = await knowledge_service.rag_query(
            db=db,
            user=current_user,
            query=request.query,
            knowledge_base_id=request.knowledge_base_id,
            document_id=request.document_id,
            api_key=x_api_key,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            include_sources=request.include_sources,
            k=request.k,
            system_prompt=request.system_prompt
        )
        return RAGQueryResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}"
        )


@router.get(
    "/knowledge/similar/{document_id}",
    response_model=SimilarDocumentsResponse,
    summary="Find similar documents",
    description="Find documents similar to a given document"
)
async def find_similar_documents(
    document_id: UUID,
    k: int = Query(5, ge=1, le=20, description="Number of similar documents"),
    score_threshold: float = Query(0.5, ge=0.0, le=1.0, description="Minimum similarity score"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Find documents similar to a reference document.
    
    Uses vector similarity to find related content.
    """
    try:
        result = await knowledge_service.find_similar_documents(
            db=db,
            user=current_user,
            document_id=document_id,
            k=k,
            score_threshold=score_threshold
        )
        return SimilarDocumentsResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find similar documents: {str(e)}"
        )


# Collection Management Endpoints

@router.post(
    "/collections",
    response_model=CollectionCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create collection",
    description="Create a new document collection (knowledge base)"
)
async def create_collection(
    request: CollectionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new document collection (knowledge base).
    
    Collections organize related documents and can be
    configured with different embedding models and access controls.
    """
    try:
        result = await knowledge_service.create_knowledge_base(
            db=db,
            user=current_user,
            name=request.name,
            description=request.description,
            type=request.type,
            is_public=request.is_public,
            embedding_model=request.embedding_model,
            metadata=request.metadata
        )
        return CollectionCreateResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create collection: {str(e)}"
        )


@router.get(
    "/collections",
    response_model=CollectionListResponse,
    summary="List collections",
    description="List all accessible collections"
)
async def list_collections(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    type: Optional[str] = Query(None, description="Filter by collection type"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all accessible collections.
    
    Returns collections created by the user, their organization,
    or public collections.
    """
    try:
        # Build query for collections
        from sqlalchemy import text
        
        query = text("""
            SELECT * FROM knowledge_bases
            WHERE (
                is_public = true OR
                creator_id = :user_id
            )
        """)
        params = {
            "user_id": str(current_user.id)
        }
        
        # Add filters
        conditions = []
        if type:
            conditions.append("type = :type")
            params["type"] = type
        
        if is_public is not None:
            conditions.append("is_public = :is_public")
            params["is_public"] = is_public
        
        if search:
            conditions.append("(name ILIKE :search OR description ILIKE :search)")
            params["search"] = f"%{search}%"
        
        # Rebuild query with conditions
        if conditions:
            base_query = str(query) + " AND " + " AND ".join(conditions)
            query = text(base_query)
        
        # Get total count
        count_query = text(str(query).replace("SELECT *", "SELECT COUNT(*)"))
        count_result = await db.execute(count_query, params)
        total = count_result.scalar()
        
        # Add pagination
        final_query = text(str(query) + " ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
        params.update({"limit": limit, "offset": (page - 1) * limit})
        
        # Execute query
        result = await db.execute(final_query, params)
        collections = []
        
        for row in result:
            collections.append({
                "id": str(row.id),
                "name": row.name,
                "description": row.description,
                "type": row.type,
                "is_public": row.is_public,
                "is_active": row.is_active,
                "total_documents": getattr(row, 'total_documents', 0),
                "total_chunks": getattr(row, 'total_chunks', 0),
                "total_tokens": getattr(row, 'total_tokens', 0),
                "created_at": row.created_at,
                "updated_at": row.updated_at
            })
        
        return CollectionListResponse(
            collections=collections,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list collections: {str(e)}"
        )


@router.put(
    "/collections/{collection_id}",
    response_model=CollectionUpdateResponse,
    summary="Update collection",
    description="Update collection properties"
)
async def update_collection(
    collection_id: UUID,
    request: CollectionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update collection properties.
    
    Only the collection creator or organization members can update.
    """
    try:
        # Verify ownership
        from sqlalchemy import text
        
        check_query_text = text("SELECT * FROM knowledge_bases WHERE id = :id AND creator_id = :creator_id")
        result = await db.execute(check_query_text, {
            "id": str(collection_id),
            "creator_id": str(current_user.id)
        })
        row = result.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found or no permission to update"
            )
        
        # Build update query
        update_params = {"id": str(collection_id), "updated_at": datetime.utcnow()}
        update_fields = ["updated_at = :updated_at"]
        
        if request.name is not None:
            update_fields.append("name = :name")
            update_params["name"] = request.name
        
        if request.description is not None:
            update_fields.append("description = :description")
            update_params["description"] = request.description
        
        if request.is_public is not None:
            update_fields.append("is_public = :is_public")
            update_params["is_public"] = request.is_public
        
        if request.metadata is not None:
            update_fields.append("metadata = :metadata")
            import json
            update_params["metadata"] = json.dumps(request.metadata)
        
        update_query = text(f"UPDATE knowledge_bases SET {', '.join(update_fields)} WHERE id = :id RETURNING name, updated_at")
        
        result = await db.execute(update_query, update_params)
        updated_row = result.fetchone()
        await db.commit()
        
        return CollectionUpdateResponse(
            collection_id=collection_id,
            name=updated_row.name,
            updated_at=updated_row.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update collection: {str(e)}"
        )


@router.delete(
    "/collections/{collection_id}",
    response_model=CollectionDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete collection",
    description="Delete a collection and optionally its documents"
)
async def delete_collection(
    collection_id: UUID,
    cascade: bool = Query(False, description="Delete all documents in collection"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a collection.
    
    If cascade=true, all documents in the collection will also be deleted.
    Only the collection creator can delete.
    """
    try:
        # Verify ownership
        from sqlalchemy import text
        
        check_query = text("SELECT * FROM knowledge_bases WHERE id = :id AND creator_id = :creator_id")
        
        result = await db.execute(check_query, {
            "id": str(collection_id),
            "creator_id": str(current_user.id)
        })
        row = result.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found or no permission to delete"
            )
        
        documents_deleted = 0
        
        if cascade:
            # Count documents to be deleted
            count_query = text("SELECT COUNT(*) FROM knowledge_documents WHERE knowledge_base_id = :kb_id")
            count_result = await db.execute(count_query, {"kb_id": str(collection_id)})
            documents_deleted = count_result.scalar()
        else:
            # Check if collection has documents
            check_docs = text("SELECT COUNT(*) FROM knowledge_documents WHERE knowledge_base_id = :kb_id")
            doc_result = await db.execute(check_docs, {"kb_id": str(collection_id)})
            doc_count = doc_result.scalar()
            
            if doc_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Collection has {doc_count} documents. Use cascade=true to delete all."
                )
        
        # Delete collection (cascade will handle documents if configured)
        delete_query = text("DELETE FROM knowledge_bases WHERE id = :id")
        await db.execute(delete_query, {"id": str(collection_id)})
        await db.commit()
        
        return CollectionDeleteResponse(
            message="Collection deleted successfully",
            collection_id=collection_id,
            documents_deleted=documents_deleted
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete collection: {str(e)}"
        )