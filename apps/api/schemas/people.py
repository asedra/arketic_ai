"""
Pydantic schemas for People management
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator

from models.organization import PersonRole, PersonStatus


class PersonBase(BaseModel):
    """Base person schema"""
    first_name: str = Field(..., min_length=1, max_length=100, description="Person's first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Person's last name")
    email: EmailStr = Field(..., description="Person's email address")
    phone: Optional[str] = Field(None, max_length=20, description="Person's phone number")
    job_title: Optional[str] = Field(None, max_length=200, description="Person's job title")
    department: Optional[str] = Field(None, max_length=100, description="Person's department")
    site: Optional[str] = Field(None, max_length=200, description="Person's work site")
    location: Optional[str] = Field(None, max_length=200, description="Person's location")
    role: PersonRole = Field(..., description="Person's system role")
    manager_id: Optional[UUID] = Field(None, description="Person's manager ID")
    hire_date: Optional[datetime] = Field(None, description="Person's hire date")
    notes: Optional[str] = Field(None, description="Additional notes about the person")

    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        """Validate name fields"""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @validator('email')
    def validate_email_format(cls, v):
        """Additional email validation"""
        return v.lower()

    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        if v and v.strip():
            # Remove common formatting characters
            cleaned = ''.join(c for c in v if c.isdigit() or c in '+()-. ')
            if len(cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')) < 7:
                raise ValueError('Phone number too short')
            return cleaned
        return None


class PersonCreate(PersonBase):
    """Schema for creating a person"""
    pass


class PersonUpdate(BaseModel):
    """Schema for updating a person"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    job_title: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=100)
    site: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    role: Optional[PersonRole] = None
    status: Optional[PersonStatus] = None
    manager_id: Optional[UUID] = None
    hire_date: Optional[datetime] = None
    notes: Optional[str] = None

    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        """Validate name fields"""
        if v is not None and (not v or not v.strip()):
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v

    @validator('email')
    def validate_email_format(cls, v):
        """Additional email validation"""
        return v.lower() if v else v

    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        if v and v.strip():
            # Remove common formatting characters
            cleaned = ''.join(c for c in v if c.isdigit() or c in '+()-. ')
            if len(cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')) < 7:
                raise ValueError('Phone number too short')
            return cleaned
        return None


class PersonResponse(PersonBase):
    """Schema for person response"""
    id: UUID
    status: PersonStatus
    full_name: str
    is_active: bool
    # Removed is_manager field - requires async DB access
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonListResponse(BaseModel):
    """Schema for person list response"""
    people: List[PersonResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        from_attributes = True


class PersonSearchRequest(BaseModel):
    """Schema for person search request"""
    query: Optional[str] = Field(None, description="Search query (name, email, job title)")
    department: Optional[str] = Field(None, description="Filter by department")
    role: Optional[PersonRole] = Field(None, description="Filter by role")
    status: Optional[PersonStatus] = Field(None, description="Filter by status")
    manager_id: Optional[UUID] = Field(None, description="Filter by manager")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field("last_name", description="Sort field")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class PersonBulkCreateRequest(BaseModel):
    """Schema for bulk person creation"""
    people: List[PersonCreate] = Field(..., min_items=1, max_items=100, description="List of people to create")


class PersonBulkUpdateRequest(BaseModel):
    """Schema for bulk person updates"""
    person_ids: List[UUID] = Field(..., min_items=1, max_items=100, description="List of person IDs to update")
    updates: PersonUpdate = Field(..., description="Updates to apply to all selected people")


class PersonStatsResponse(BaseModel):
    """Schema for person statistics"""
    total_people: int
    active_people: int
    inactive_people: int
    pending_people: int
    departments: dict
    roles: dict
    recent_hires: int  # Last 30 days
    
    class Config:
        from_attributes = True