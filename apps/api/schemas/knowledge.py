"""
Knowledge Management Schemas

Pydantic models for Knowledge Management API request/response validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from datetime import datetime


# Document Management Schemas

class DocumentUploadRequest(BaseModel):
    """Request model for document upload"""
    knowledge_base_id: Optional[UUID] = Field(default=None, description="UUID of the knowledge base (optional)")
    title: str = Field(..., min_length=1, max_length=500, description="Document title")
    content: str = Field(..., min_length=1, max_length=1048576, description="Document content (max 1MB)")
    source_type: Literal["text", "url", "file", "api"] = Field(default="text", description="Source type")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    @field_validator('content')
    def validate_content_size(cls, v):
        if len(v.encode('utf-8')) > 1048576:  # 1MB in bytes
            raise ValueError('Content size exceeds 1MB limit')
        return v


class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    document_id: UUID
    chunk_ids: List[UUID]
    chunk_count: int
    token_count: int
    processing_time_ms: float
    status: Literal["completed", "failed"]


class DocumentFileUploadResponse(BaseModel):
    """Response model for file upload"""
    document_id: UUID
    chunk_ids: List[UUID]
    chunk_count: int
    token_count: int
    processing_time_ms: float
    status: Literal["completed", "failed"]
    file_info: Dict[str, Any]


class DocumentListRequest(BaseModel):
    """Request model for listing documents"""
    knowledge_base_id: UUID
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: Literal["created_at", "updated_at", "title"] = Field(default="created_at")
    sort_order: Literal["asc", "desc"] = Field(default="desc")
    search: Optional[str] = Field(default=None, max_length=100)
    source_type: Optional[Literal["text", "url", "file", "api"]] = None
    status: Optional[Literal["pending", "processing", "completed", "failed"]] = None


class DocumentInfo(BaseModel):
    """Document information model"""
    id: UUID
    title: str
    source_type: str
    file_name: Optional[str]
    file_type: Optional[str]
    chunk_count: int
    token_count: int
    processing_status: str
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]]


class DocumentListResponse(BaseModel):
    """Response model for document list"""
    documents: List[DocumentInfo]
    pagination: Dict[str, Any]


class DocumentDetailResponse(BaseModel):
    """Response model for document details"""
    id: UUID
    knowledge_base_id: UUID
    title: str
    content: Optional[str]
    source_type: str
    source_url: Optional[str]
    file_name: Optional[str]
    file_type: Optional[str]
    file_size: Optional[int]
    chunk_count: int
    token_count: int
    processing_status: str
    error_message: Optional[str]
    tags: Optional[List[str]]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime]
    chunks: Optional[List[Dict[str, Any]]]


# Search & Retrieval Schemas

class SearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str = Field(..., min_length=1, max_length=1000, description="Search query")
    knowledge_base_id: Optional[UUID] = Field(default=None, description="Limit to specific knowledge base")
    k: int = Field(default=5, ge=1, le=50, description="Number of results")
    score_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum similarity score")
    search_type: Literal["semantic", "keyword", "hybrid"] = Field(default="semantic")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Additional filters")


class SearchResult(BaseModel):
    """Search result model"""
    content: str
    score: float
    document_id: UUID
    document_title: str
    chunk_index: int
    metadata: Dict[str, Any]


class SearchResponse(BaseModel):
    """Response model for search"""
    query: str
    results: List[SearchResult]
    search_type: str
    execution_time_ms: float
    total_results: int


class RAGQueryRequest(BaseModel):
    """Request model for RAG query"""
    query: str = Field(..., min_length=1, max_length=1000, description="Question to answer")
    knowledge_base_id: Optional[UUID] = Field(default=None, description="Knowledge base to search (optional)")
    model: str = Field(default="gpt-3.5-turbo", description="LLM model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: int = Field(default=500, ge=1, le=4096, description="Max tokens for response")
    include_sources: bool = Field(default=True, description="Include source documents")
    k: int = Field(default=5, ge=1, le=20, description="Number of documents to retrieve")
    system_prompt: Optional[str] = Field(default=None, max_length=1000, description="Custom system prompt")


class DocumentSource(BaseModel):
    """Document source for RAG response"""
    document_id: UUID
    title: str
    content: str
    score: float


class TokenUsage(BaseModel):
    """Token usage information"""
    prompt: int
    completion: int
    total: int


class RAGQueryResponse(BaseModel):
    """Response model for RAG query"""
    query: str
    answer: str
    sources: Optional[List[DocumentSource]]
    model_used: str
    tokens_used: TokenUsage
    execution_time_ms: float


class SimilarDocumentsRequest(BaseModel):
    """Request model for finding similar documents"""
    k: int = Field(default=5, ge=1, le=20, description="Number of similar documents")
    score_threshold: float = Field(default=0.5, ge=0.0, le=1.0, description="Minimum similarity score")


class SimilarDocument(BaseModel):
    """Similar document model"""
    id: UUID
    title: str
    similarity_score: float
    chunk_overlap: int
    metadata: Optional[Dict[str, Any]]


class SimilarDocumentsResponse(BaseModel):
    """Response model for similar documents"""
    reference_document: Dict[str, Any]
    similar_documents: List[SimilarDocument]
    total_found: int


# Collection Management Schemas

class CollectionCreateRequest(BaseModel):
    """Request model for creating a collection"""
    name: str = Field(..., min_length=1, max_length=200, description="Collection name")
    description: Optional[str] = Field(default=None, max_length=1000, description="Collection description")
    type: Literal["documentation", "faq", "product", "general", "custom"] = Field(default="general")
    is_public: bool = Field(default=False, description="Make collection public")
    embedding_model: str = Field(default="text-embedding-3-small", description="Embedding model")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class CollectionInfo(BaseModel):
    """Collection information model"""
    id: UUID
    name: str
    description: Optional[str]
    type: str
    is_public: bool
    is_active: bool
    total_documents: int
    total_chunks: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime


class CollectionCreateResponse(BaseModel):
    """Response model for collection creation"""
    collection_id: UUID
    name: str
    type: str
    is_public: bool
    created_at: datetime


class CollectionListRequest(BaseModel):
    """Request model for listing collections"""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    type: Optional[Literal["documentation", "faq", "product", "general", "custom"]] = None
    is_public: Optional[bool] = None
    search: Optional[str] = Field(default=None, max_length=100)


class CollectionListResponse(BaseModel):
    """Response model for collection list"""
    collections: List[CollectionInfo]
    pagination: Dict[str, Any]


class CollectionUpdateRequest(BaseModel):
    """Request model for updating a collection"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    is_public: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class CollectionUpdateResponse(BaseModel):
    """Response model for collection update"""
    collection_id: UUID
    name: str
    updated_at: datetime


class CollectionDeleteResponse(BaseModel):
    """Response model for collection deletion"""
    message: str
    collection_id: UUID
    documents_deleted: int


# Error Response Schema

class ErrorDetail(BaseModel):
    """Error detail model"""
    code: str
    message: str
    details: Optional[str] = None
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: ErrorDetail
    timestamp: datetime