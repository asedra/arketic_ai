"""People management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from services.people_service import PeopleService
from schemas.people import (
    PersonCreate, PersonUpdate, PersonResponse, PersonListResponse
)
from core.exceptions import ValidationError, NotFoundError, ConflictError
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()
people_service = PeopleService()


@router.post("/", response_model=PersonResponse, status_code=201)
async def create_person(
    person_data: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new person"""
    try:
        person = await people_service.create_person(
            db=db,
            person_data=person_data,
            current_user_id=current_user.id
        )
        return PersonResponse.from_orm(person)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating person: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=PersonListResponse)
async def list_people(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List people with basic pagination"""
    try:
        people, total = await people_service.list_people(
            db=db,
            page=page,
            page_size=page_size
        )
        
        people_responses = [PersonResponse.from_orm(person) for person in people]
        total_pages = (total + page_size - 1) // page_size
        
        return PersonListResponse(
            people=people_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error listing people: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific person by ID"""
    try:
        person = await people_service.get_person(
            db=db,
            person_id=person_id
        )
        if not person:
            raise HTTPException(status_code=404, detail="Person not found")
        
        return PersonResponse.from_orm(person)
    except HTTPException:
        # Re-raise HTTP exceptions (like our 404)
        raise
    except Exception as e:
        logger.error(f"Error getting person {person_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: UUID,
    person_data: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a person"""
    try:
        person = await people_service.update_person(
            db=db,
            person_id=person_id,
            person_data=person_data,
            current_user_id=current_user.id
        )
        return PersonResponse.from_orm(person)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Person not found")
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating person {person_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{person_id}", status_code=204)
async def delete_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a person"""
    try:
        success = await people_service.delete_person(
            db=db,
            person_id=person_id,
            current_user_id=current_user.id
        )
        if not success:
            raise HTTPException(status_code=404, detail="Person not found")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Person not found")
    except Exception as e:
        logger.error(f"Error deleting person {person_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


