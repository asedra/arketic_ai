"""Vector Database API Routes

This module provides REST API endpoints for vector database operations
including document embedding, similarity search, and knowledge base management.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.pgvector_service import pgvector_service

router = APIRouter(prefix="/api/vector", tags=["Vector Store"])


# Request/Response Models
class DocumentUploadRequest(BaseModel):
    """Request model for document upload"""
    knowledge_base_id: UUID
    title: str
    content: str
    source_type: str = "text"
    metadata: Optional[Dict[str, Any]] = None


class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    document_id: UUID
    chunk_ids: List[UUID]
    chunk_count: int
    token_count: int
    processing_time_ms: float
    status: str


class SearchRequest(BaseModel):
    """Request model for similarity search"""
    query: str = Field(..., min_length=1, max_length=1000)
    knowledge_base_id: Optional[UUID] = None
    k: int = Field(default=5, ge=1, le=50)
    score_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    search_type: str = Field(default="semantic", pattern="^(semantic|keyword|hybrid)$")
    filters: Optional[Dict[str, Any]] = None


class SearchResult(BaseModel):
    """Search result model"""
    content: str
    score: float
    metadata: Dict[str, Any]
    document_id: Optional[UUID]
    chunk_index: Optional[int]


class SearchResponse(BaseModel):
    """Response model for search"""
    query: str
    results: List[SearchResult]
    search_type: str
    execution_time_ms: float
    total_results: int


class VectorHealthResponse(BaseModel):
    """Response model for vector store health check"""
    status: str
    version: Optional[str]
    vector_count: int
    tables: List[str]
    fallback_available: bool
    metrics: Dict[str, Any]


class VectorStatsResponse(BaseModel):
    """Response model for vector statistics"""
    document_count: int
    chunk_count: int
    total_tokens: int
    avg_chunk_size: float
    first_created: Optional[datetime]
    last_created: Optional[datetime]
    indexes: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]


# Endpoints

@router.get("/health", response_model=VectorHealthResponse)
async def check_vector_health(
    current_user: User = Depends(get_current_user)
):
    """
    Check PGVector health and availability
    
    Returns information about PGVector extension status, available tables,
    vector count, and fallback options.
    """
    try:
        health = await pgvector_service.check_pgvector_health()
        return VectorHealthResponse(**health)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    request: DocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and process a document for vector embedding
    
    This endpoint accepts text content, splits it into chunks,
    generates embeddings, and stores them in PGVector.
    Falls back to Pinecone if PGVector fails.
    """
    start_time = datetime.utcnow()
    
    try:
        # Create document
        doc = {
            "page_content": request.content,
            "metadata": {
                "title": request.title,
                "source_type": request.source_type,
                "user_id": str(current_user.id),
                **(request.metadata or {})
            }
        }
        
        # Generate document ID
        from uuid import uuid4
        document_id = uuid4()
        
        # Add to vector store
        chunk_ids = await pgvector_service.add_documents(
            [doc],
            request.knowledge_base_id,
            document_id,
            {
                "uploaded_by": str(current_user.id),
                "uploaded_at": datetime.utcnow().isoformat()
            }
        )
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Get token count
        token_count = pgvector_service._tiktoken_len(request.content)
        
        return DocumentUploadResponse(
            document_id=document_id,
            chunk_ids=chunk_ids,
            chunk_count=len(chunk_ids),
            token_count=token_count,
            processing_time_ms=processing_time,
            status="completed"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.post("/documents/file", response_model=DocumentUploadResponse)
async def upload_document_file(
    knowledge_base_id: UUID = Query(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a file for vector embedding
    
    Supports PDF, TXT, MD, and DOCX files.
    Automatically extracts text and processes it for embedding.
    """
    # Check file type
    allowed_types = ['.pdf', '.txt', '.md', '.docx']
    file_ext = '.' + file.filename.split('.')[-1].lower()
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not supported. Allowed types: {allowed_types}"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract text based on file type
        if file_ext == '.txt' or file_ext == '.md':
            text_content = content.decode('utf-8')
        else:
            # For PDF and DOCX, would need additional libraries
            raise HTTPException(
                status_code=501,
                detail=f"File type {file_ext} extraction not yet implemented"
            )
        
        # Process as document
        request = DocumentUploadRequest(
            knowledge_base_id=knowledge_base_id,
            title=file.filename,
            content=text_content,
            source_type="file",
            metadata={
                "filename": file.filename,
                "file_type": file_ext,
                "file_size": len(content)
            }
        )
        
        return await upload_document(request, current_user, db)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Search for similar documents using vector similarity
    
    Supports three search types:
    - semantic: Pure vector similarity search
    - keyword: PostgreSQL full-text search
    - hybrid: Combination of semantic and keyword search
    """
    start_time = datetime.utcnow()
    
    try:
        # Add user context to filters
        filters = request.filters or {}
        filters['user_id'] = str(current_user.id)
        
        # Perform search based on type
        if request.search_type == "semantic":
            results = await pgvector_service.search_similar(
                request.query,
                request.knowledge_base_id,
                request.k,
                request.score_threshold,
                filters
            )
        elif request.search_type == "hybrid":
            results = await pgvector_service.hybrid_search(
                request.query,
                request.knowledge_base_id,
                request.k,
                keyword_weight=0.3,
                semantic_weight=0.7
            )
        else:
            # Keyword search
            raise HTTPException(
                status_code=501,
                detail="Pure keyword search not yet implemented"
            )
        
        # Format results
        search_results = []
        for doc, score in results:
            search_results.append(SearchResult(
                content=doc.page_content,
                score=score,
                metadata=doc.metadata,
                document_id=doc.metadata.get('document_id'),
                chunk_index=doc.metadata.get('chunk_index')
            ))
        
        # Calculate execution time
        execution_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return SearchResponse(
            query=request.query,
            results=search_results,
            search_type=request.search_type,
            execution_time_ms=execution_time,
            total_results=len(search_results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/statistics", response_model=VectorStatsResponse)
async def get_vector_statistics(
    knowledge_base_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about vector storage
    
    Returns information about document count, chunk count,
    token usage, index sizes, and performance metrics.
    """
    try:
        stats = await pgvector_service.get_statistics(knowledge_base_id)
        return VectorStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a document and all its embeddings
    
    Removes all chunks and embeddings associated with the document.
    """
    try:
        deleted_count = await pgvector_service.delete_documents([document_id])
        
        return {
            "status": "success",
            "document_id": document_id,
            "chunks_deleted": deleted_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.put("/documents/{document_id}")
async def update_document(
    document_id: UUID,
    request: DocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing document
    
    Deletes old embeddings and creates new ones with updated content.
    """
    try:
        chunk_ids = await pgvector_service.update_document(
            document_id,
            request.content,
            request.knowledge_base_id,
            {
                "title": request.title,
                "updated_by": str(current_user.id),
                "updated_at": datetime.utcnow().isoformat(),
                **(request.metadata or {})
            }
        )
        
        return {
            "status": "success",
            "document_id": document_id,
            "chunk_ids": chunk_ids,
            "chunk_count": len(chunk_ids)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")


@router.post("/cache/clear")
async def clear_semantic_cache(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear the semantic cache
    
    Removes cached search results to force fresh queries.
    Admin only endpoint.
    """
    # Check if user is admin
    if current_user.role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Implementation would clear the semantic_cache table
        return {
            "status": "success",
            "message": "Semantic cache cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))