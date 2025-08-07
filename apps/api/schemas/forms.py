"""
Pydantic schemas for forms API
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from uuid import UUID
from enum import Enum


class FormStatus(str, Enum):
    """Form status enumeration"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class FormVisibility(str, Enum):
    """Form visibility levels"""
    PRIVATE = "private"
    ORGANIZATION = "organization"
    PUBLIC = "public"


class FormSharePermission(str, Enum):
    """Form sharing permission levels"""
    VIEW = "view"
    EDIT = "edit"
    ADMIN = "admin"


# Form schemas
class FormBase(BaseModel):
    """Base form schema with common fields"""
    title: str = Field(..., min_length=1, max_length=255, description="Form title")
    description: Optional[str] = Field(None, description="Form description")
    adaptive_card_json: Dict[str, Any] = Field(..., description="Adaptive Card JSON definition")
    elements_json: Optional[Dict[str, Any]] = Field(None, description="Designer elements JSON")
    visibility: FormVisibility = Field(FormVisibility.PRIVATE, description="Form visibility level")
    allow_anonymous: bool = Field(False, description="Allow anonymous submissions")
    submit_message: Optional[str] = Field(None, description="Custom submit success message")
    redirect_url: Optional[str] = Field(None, max_length=500, description="Redirect URL after submission")
    email_notifications: Optional[List[str]] = Field(None, description="Email addresses for notifications")
    webhook_url: Optional[str] = Field(None, max_length=500, description="Webhook URL for submissions")
    max_submissions: Optional[int] = Field(None, ge=1, description="Maximum number of submissions")
    expires_at: Optional[datetime] = Field(None, description="Form expiration date")
    tags: Optional[List[str]] = Field(None, description="Form tags for categorization")
    category: Optional[str] = Field(None, max_length=50, description="Form category")
    
    @validator('adaptive_card_json')
    def validate_adaptive_card(cls, v):
        """Validate Adaptive Card JSON structure"""
        if not isinstance(v, dict):
            raise ValueError("Adaptive card JSON must be a dictionary")
        
        if v.get('type') != 'AdaptiveCard':
            raise ValueError("Adaptive card type must be 'AdaptiveCard'")
        
        if 'version' not in v:
            raise ValueError("Adaptive card must include version field")
        
        return v
    
    @validator('email_notifications')
    def validate_email_list(cls, v):
        """Validate email notification list"""
        if v is None:
            return v
        
        import re
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        
        for email in v:
            if not email_pattern.match(email):
                raise ValueError(f"Invalid email address: {email}")
        
        return v


class FormCreate(FormBase):
    """Schema for creating a new form"""
    pass


class FormUpdate(BaseModel):
    """Schema for updating an existing form"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    adaptive_card_json: Optional[Dict[str, Any]] = None
    elements_json: Optional[Dict[str, Any]] = None
    status: Optional[FormStatus] = None
    visibility: Optional[FormVisibility] = None
    allow_anonymous: Optional[bool] = None
    submit_message: Optional[str] = None
    redirect_url: Optional[str] = Field(None, max_length=500)
    email_notifications: Optional[List[str]] = None
    webhook_url: Optional[str] = Field(None, max_length=500)
    max_submissions: Optional[int] = Field(None, ge=1)
    expires_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = Field(None, max_length=50)
    
    @validator('adaptive_card_json')
    def validate_adaptive_card(cls, v):
        """Validate Adaptive Card JSON structure if provided"""
        if v is None:
            return v
        
        if not isinstance(v, dict):
            raise ValueError("Adaptive card JSON must be a dictionary")
        
        if v.get('type') != 'AdaptiveCard':
            raise ValueError("Adaptive card type must be 'AdaptiveCard'")
        
        if 'version' not in v:
            raise ValueError("Adaptive card must include version field")
        
        return v


class UserInfo(BaseModel):
    """User info schema for form responses"""
    id: UUID
    email: str
    first_name: str
    last_name: str
    full_name: Optional[str] = None


class FormResponse(FormBase):
    """Schema for form responses"""
    id: UUID
    status: FormStatus
    schema_version: str
    is_template: bool
    submission_count: int
    view_count: int
    version: int
    parent_form_id: Optional[UUID]
    last_submitted_at: Optional[datetime]
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    
    # Computed fields
    is_expired: bool
    is_submission_allowed: bool
    creator: Optional[UserInfo] = None
    
    class Config:
        from_attributes = True


class FormListItem(BaseModel):
    """Simplified form schema for list responses"""
    id: UUID
    title: str
    description: Optional[str]
    status: FormStatus
    visibility: FormVisibility
    is_template: bool
    submission_count: int
    view_count: int
    category: Optional[str]
    tags: Optional[List[str]]
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    last_submitted_at: Optional[datetime]
    
    # Computed fields
    is_expired: bool
    is_submission_allowed: bool
    
    class Config:
        from_attributes = True


class FormListResponse(BaseModel):
    """Paginated form list response"""
    items: List[FormListItem]
    total: int
    page: int
    size: int
    pages: int


# Form Template schemas
class FormTemplateBase(BaseModel):
    """Base form template schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    adaptive_card_json: Dict[str, Any] = Field(..., description="Adaptive Card JSON definition")
    elements_json: Optional[Dict[str, Any]] = Field(None, description="Designer elements JSON")
    category: str = Field(..., min_length=1, max_length=50, description="Template category")
    tags: Optional[List[str]] = Field(None, description="Template tags")
    is_public: bool = Field(True, description="Is template publicly available")
    is_featured: bool = Field(False, description="Is template featured")
    
    @validator('adaptive_card_json')
    def validate_adaptive_card(cls, v):
        """Validate Adaptive Card JSON structure"""
        if not isinstance(v, dict):
            raise ValueError("Adaptive card JSON must be a dictionary")
        
        if v.get('type') != 'AdaptiveCard':
            raise ValueError("Adaptive card type must be 'AdaptiveCard'")
        
        return v


class FormTemplateCreate(FormTemplateBase):
    """Schema for creating a form template"""
    pass


class FormTemplateUpdate(BaseModel):
    """Schema for updating a form template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    adaptive_card_json: Optional[Dict[str, Any]] = None
    elements_json: Optional[Dict[str, Any]] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_featured: Optional[bool] = None


class FormTemplateResponse(FormTemplateBase):
    """Schema for form template responses"""
    id: UUID
    usage_count: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserInfo] = None
    
    class Config:
        from_attributes = True


class FormTemplateListResponse(BaseModel):
    """Paginated form template list response"""
    items: List[FormTemplateResponse]
    total: int
    page: int
    size: int
    pages: int


# Form Submission schemas
class FormSubmissionCreate(BaseModel):
    """Schema for creating form submission"""
    data: Dict[str, Any] = Field(..., description="Form submission data")
    
    @validator('data')
    def validate_data(cls, v):
        """Validate submission data"""
        if not isinstance(v, dict):
            raise ValueError("Submission data must be a dictionary")
        return v


class FormSubmissionResponse(BaseModel):
    """Schema for form submission responses"""
    id: UUID
    form_id: UUID
    data: Dict[str, Any]
    submitter_user_id: Optional[UUID]
    is_processed: bool
    processing_error: Optional[str]
    submitted_at: datetime
    processed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class FormSubmissionListResponse(BaseModel):
    """Paginated form submission list response"""
    items: List[FormSubmissionResponse]
    total: int
    page: int
    size: int
    pages: int


# Form Sharing schemas
class FormShareCreate(BaseModel):
    """Schema for sharing a form"""
    user_email: str = Field(..., description="Email of user to share with")
    permission: FormSharePermission = Field(FormSharePermission.VIEW, description="Permission level")
    can_reshare: bool = Field(False, description="Can the user reshare the form")
    message: Optional[str] = Field(None, description="Optional message with the share")
    expires_at: Optional[datetime] = Field(None, description="Share expiration date")
    
    @validator('user_email')
    def validate_email(cls, v):
        """Validate email format"""
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError("Invalid email format")
        return v.lower()


class FormShareUpdate(BaseModel):
    """Schema for updating form share"""
    permission: Optional[FormSharePermission] = None
    can_reshare: Optional[bool] = None
    message: Optional[str] = None
    expires_at: Optional[datetime] = None


class FormShareResponse(BaseModel):
    """Schema for form share responses"""
    id: UUID
    form_id: UUID
    shared_with_user_id: UUID
    shared_by_user_id: UUID
    permission: FormSharePermission
    can_reshare: bool
    message: Optional[str]
    expires_at: Optional[datetime]
    shared_at: datetime
    last_accessed_at: Optional[datetime]
    
    # Computed fields
    is_expired: bool
    is_active: bool
    
    # Related objects
    shared_with: Optional[UserInfo] = None
    shared_by: Optional[UserInfo] = None
    form: Optional[FormListItem] = None
    
    class Config:
        from_attributes = True


class FormShareListResponse(BaseModel):
    """Paginated form share list response"""
    items: List[FormShareResponse]
    total: int
    page: int
    size: int
    pages: int


# Form Version schemas
class FormVersionResponse(BaseModel):
    """Schema for form version responses"""
    id: UUID
    form_id: UUID
    version_number: int
    change_description: Optional[str]
    title: str
    description: Optional[str]
    adaptive_card_json: Dict[str, Any]
    elements_json: Optional[Dict[str, Any]]
    created_by: UUID
    created_at: datetime
    creator: Optional[UserInfo] = None
    
    class Config:
        from_attributes = True


class FormVersionListResponse(BaseModel):
    """Paginated form version list response"""
    items: List[FormVersionResponse]
    total: int
    page: int
    size: int
    pages: int


# Query parameters
class FormListQuery(BaseModel):
    """Query parameters for form list"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(10, ge=1, le=100, description="Page size")
    status: Optional[FormStatus] = Field(None, description="Filter by status")
    visibility: Optional[FormVisibility] = Field(None, description="Filter by visibility")
    is_template: Optional[bool] = Field(None, description="Filter templates")
    category: Optional[str] = Field(None, description="Filter by category")
    search: Optional[str] = Field(None, description="Search in title and description")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    created_by: Optional[UUID] = Field(None, description="Filter by creator")
    sort: Optional[str] = Field("created_at", description="Sort field")
    order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class FormTemplateQuery(BaseModel):
    """Query parameters for form template list"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(10, ge=1, le=100, description="Page size")
    category: Optional[str] = Field(None, description="Filter by category")
    is_featured: Optional[bool] = Field(None, description="Filter featured templates")
    search: Optional[str] = Field(None, description="Search in name and description")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    sort: Optional[str] = Field("usage_count", description="Sort field")
    order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")


# Response wrappers
class ApiResponse(BaseModel):
    """Generic API response wrapper"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Error response schema"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None