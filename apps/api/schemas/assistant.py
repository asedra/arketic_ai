"""
Assistant API schemas for request/response validation
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from uuid import UUID

from models.assistant import AIModel, AssistantStatus


class KnowledgeBaseSelection(BaseModel):
    """Knowledge base selection for assistant"""
    knowledge_base_id: UUID
    name: str
    description: Optional[str] = None


class DocumentSelection(BaseModel):
    """Document selection for assistant"""
    document_id: UUID
    title: str
    knowledge_base_id: UUID


class AssistantCreateRequest(BaseModel):
    """Request schema for creating an assistant"""
    name: str = Field(..., min_length=1, max_length=200, description="Assistant name")
    description: Optional[str] = Field(None, max_length=1000, description="Assistant description")
    system_prompt: Optional[str] = Field(None, max_length=50000, description="System prompt for the assistant")
    ai_model: AIModel = Field(AIModel.GPT_4O, description="AI model to use")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Temperature for AI responses")
    max_tokens: int = Field(2048, ge=1, le=32000, description="Maximum tokens for responses")
    is_public: bool = Field(False, description="Whether the assistant is publicly accessible")
    knowledge_base_ids: Optional[List[UUID]] = Field(default_factory=list, description="Knowledge bases to attach")
    document_ids: Optional[List[UUID]] = Field(default_factory=list, description="Documents to attach")
    configuration: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Assistant name cannot be empty')
        return v.strip()
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if not 0.0 <= v <= 2.0:
            raise ValueError('Temperature must be between 0.0 and 2.0')
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if not 1 <= v <= 32000:
            raise ValueError('Max tokens must be between 1 and 32000')
        return v
    
    class Config:
        use_enum_values = True


class AssistantUpdateRequest(BaseModel):
    """Request schema for updating an assistant"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    system_prompt: Optional[str] = Field(None, max_length=50000)
    ai_model: Optional[AIModel] = Field(None)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=1, le=32000)
    status: Optional[AssistantStatus] = Field(None)
    is_public: Optional[bool] = Field(None)
    knowledge_base_ids: Optional[List[UUID]] = Field(None)
    document_ids: Optional[List[UUID]] = Field(None)
    configuration: Optional[Dict[str, Any]] = Field(None)
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Assistant name cannot be empty')
        return v.strip() if v else v
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and not 0.0 <= v <= 2.0:
            raise ValueError('Temperature must be between 0.0 and 2.0')
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and not 1 <= v <= 32000:
            raise ValueError('Max tokens must be between 1 and 32000')
        return v
    
    class Config:
        use_enum_values = True


class AssistantKnowledgeRequest(BaseModel):
    """Request schema for managing assistant knowledge"""
    knowledge_base_ids: Optional[List[UUID]] = Field(default_factory=list)
    document_ids: Optional[List[UUID]] = Field(default_factory=list)
    action: str = Field(..., pattern="^(add|remove|replace)$", description="Action to perform: add, remove, or replace")


class AssistantResponse(BaseModel):
    """Response schema for assistant data"""
    id: UUID
    name: str
    description: Optional[str]
    system_prompt: Optional[str] = None  # Hidden by default for security
    ai_model: AIModel
    ai_model_display: str
    temperature: float
    max_tokens: int
    status: AssistantStatus
    is_public: bool
    creator_id: UUID
    total_conversations: int
    total_messages: int
    total_tokens_used: int
    knowledge_count: int
    document_count: int
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime]
    configuration: Optional[Dict[str, Any]] = None
    
    class Config:
        use_enum_values = True
        from_attributes = True


class AssistantDetailResponse(AssistantResponse):
    """Detailed response schema for assistant with full configuration"""
    system_prompt: Optional[str]
    knowledge_bases: List[KnowledgeBaseSelection] = Field(default_factory=list)
    documents: List[DocumentSelection] = Field(default_factory=list)


class AssistantListResponse(BaseModel):
    """Response schema for assistant list"""
    assistants: List[AssistantResponse]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool


class AssistantUsageStats(BaseModel):
    """Assistant usage statistics"""
    total_conversations: int
    total_messages: int
    total_tokens_used: int
    average_tokens_per_message: float
    conversations_this_month: int
    messages_this_month: int
    tokens_this_month: int
    last_used_at: Optional[datetime]
    most_active_day: Optional[str]


class AssistantAnalytics(BaseModel):
    """Assistant analytics data"""
    id: UUID
    name: str
    usage_stats: AssistantUsageStats
    knowledge_stats: Dict[str, Any]
    performance_metrics: Dict[str, Any]


class PublicAssistantResponse(BaseModel):
    """Public assistant response (limited data for non-owners)"""
    id: UUID
    name: str
    description: Optional[str]
    ai_model: AIModel
    ai_model_display: str
    is_public: bool
    total_conversations: int
    created_at: datetime
    last_used_at: Optional[datetime]
    
    class Config:
        use_enum_values = True
        from_attributes = True


class AssistantSearchRequest(BaseModel):
    """Request schema for searching assistants"""
    query: Optional[str] = Field(None, max_length=500, description="Search query")
    ai_model: Optional[AIModel] = Field(None, description="Filter by AI model")
    status: Optional[AssistantStatus] = Field(None, description="Filter by status")
    is_public: Optional[bool] = Field(None, description="Filter by public/private")
    creator_id: Optional[UUID] = Field(None, description="Filter by creator")
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: str = Field("created_at", pattern="^(name|created_at|updated_at|last_used_at|total_messages)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    
    class Config:
        use_enum_values = True


class AssistantChatRequest(BaseModel):
    """Request schema for chatting with an assistant"""
    message: str = Field(..., min_length=1, max_length=50000, description="Message to send")
    stream: bool = Field(False, description="Enable streaming response")
    save_to_history: bool = Field(True, description="Save messages to chat history")
    chat_id: Optional[UUID] = Field(None, description="Existing chat ID to continue conversation")
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()


class AssistantChatResponse(BaseModel):
    """Response schema for assistant chat"""
    success: bool
    message: str
    data: Dict[str, Any]
    timestamp: datetime


class ModelOption(BaseModel):
    """AI model option"""
    value: str
    label: str
    description: Optional[str]
    max_tokens: int
    cost_per_1k_tokens: Optional[float] = None


class AssistantModelsResponse(BaseModel):
    """Response schema for available AI models"""
    models: List[ModelOption]
    default_model: str


class AssistantTemplateResponse(BaseModel):
    """Response schema for assistant templates"""
    id: str
    name: str
    description: str
    system_prompt: str
    ai_model: AIModel
    temperature: float
    max_tokens: int
    category: str
    tags: List[str] = Field(default_factory=list)
    
    class Config:
        use_enum_values = True


class CreateAssistantFromTemplateRequest(BaseModel):
    """Request schema for creating assistant from template"""
    template_id: str
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    customize_prompt: bool = Field(False, description="Whether to allow customizing the system prompt")
    knowledge_base_ids: Optional[List[UUID]] = Field(default_factory=list)
    document_ids: Optional[List[UUID]] = Field(default_factory=list)
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Assistant name cannot be empty')
        return v.strip()


# Error response schemas
class AssistantErrorResponse(BaseModel):
    """Error response schema"""
    error: str
    error_code: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime


class ValidationErrorResponse(BaseModel):
    """Validation error response schema"""
    error: str = "Validation failed"
    error_code: str = "validation_error"
    details: List[Dict[str, Union[str, List[str]]]]
    timestamp: datetime