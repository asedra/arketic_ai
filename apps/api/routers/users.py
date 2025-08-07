"""User management endpoints"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/me")
async def get_current_user():
    """Get current user (placeholder)"""
    return {"message": "Current user endpoint - implementation pending"}

@router.get("/")
async def list_users():
    """List users (placeholder)"""
    return {"message": "List users endpoint - implementation pending"}