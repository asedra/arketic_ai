"""Organization management endpoints"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from core.dependencies import get_current_user_dict

router = APIRouter()

@router.get("/")
async def get_organization(current_user: dict = Depends(get_current_user_dict)):
    """Get organization data"""
    # Return mock organization data for now
    return {
        "id": "org-001",
        "name": "Arketic Organization",
        "description": "Default organization for Arketic users",
        "created_at": "2024-01-01T00:00:00Z",
        "member_count": 1,
        "is_active": True
    }

@router.get("/people")
async def get_organization_people(current_user: dict = Depends(get_current_user_dict)) -> List[Dict[str, Any]]:
    """Get organization people - returns array format as expected by frontend"""
    # Return mock people data in the correct array format
    return [
        {
            "id": current_user["user_id"],
            "email": current_user["email"],
            "first_name": "Test",
            "last_name": "User", 
            "title": "Software Engineer",
            "department": "Engineering",
            "phone": "+1-555-0123",
            "location": "San Francisco, CA",
            "hire_date": "2024-01-01",
            "manager_id": None,
            "profile_image_url": "/placeholder-user.jpg",
            "status": "active",
            "skills": ["Python", "JavaScript", "React"],
            "bio": "Test user for Arketic platform development and testing.",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "user-002", 
            "email": "admin@arketic.com",
            "first_name": "Arketic",
            "last_name": "Admin",
            "title": "System Administrator", 
            "department": "IT",
            "phone": "+1-555-0124",
            "location": "Remote",
            "hire_date": "2023-12-01",
            "manager_id": None,
            "profile_image_url": "/placeholder-user.jpg",
            "status": "active",
            "skills": ["System Administration", "DevOps", "Security"],
            "bio": "System administrator responsible for maintaining the Arketic platform.",
            "created_at": "2023-12-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]