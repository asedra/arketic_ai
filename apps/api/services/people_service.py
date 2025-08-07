"""
People service for managing people
Simplified version with only basic CRUD operations
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.exc import IntegrityError

from models.organization import Person, PersonRole, PersonStatus
from schemas.people import PersonCreate, PersonUpdate
from core.exceptions import ValidationError, NotFoundError, ConflictError
from core.logging import get_logger

logger = get_logger(__name__)


class PeopleService:
    """Service for managing people - simplified CRUD operations"""

    async def create_person(
        self, 
        db: AsyncSession, 
        person_data: PersonCreate, 
        current_user_id: UUID
    ) -> Person:
        """Create a new person"""
        logger.info(f"Creating person with email: {person_data.email}")
        try:
            # NOTE: Removed pre-checks for email and employee_id uniqueness
            # Let the database handle the uniqueness constraint
            # This avoids race conditions and false positives

            # Validate manager exists if provided
            if person_data.manager_id:
                stmt = select(Person).where(Person.id == person_data.manager_id)
                result = await db.execute(stmt)
                manager = result.scalar_one_or_none()
                if not manager:
                    raise ValidationError("Manager not found")

            # Create person
            person = Person(
                first_name=person_data.first_name,
                last_name=person_data.last_name,
                email=person_data.email.lower(),
                phone=person_data.phone,
                job_title=person_data.job_title,
                department=person_data.department,
                site=person_data.site,
                location=person_data.location,
                role=person_data.role,
                manager_id=person_data.manager_id,
                hire_date=person_data.hire_date,
                notes=person_data.notes,
                status=PersonStatus.ACTIVE
            )

            db.add(person)
            await db.flush()  # Flush to check constraints
            await db.commit()
            await db.refresh(person)

            logger.info(f"Person created: {person.full_name} ({person.email})")
            return person

        except IntegrityError as e:
            await db.rollback()
            error_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            logger.error(f"Database integrity error creating person: {error_msg}")
            
            # Parse the error to provide more specific feedback
            if 'email' in error_msg.lower():
                raise ConflictError(f"Person with email {person_data.email} already exists")
            else:
                raise ConflictError("Person with this email already exists")
        except ConflictError:
            # Re-raise ConflictError as is
            raise
        except ValidationError:
            # Re-raise ValidationError as is
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"Unexpected error creating person: {str(e)}, type: {type(e)}")
            raise

    async def get_person(self, db: AsyncSession, person_id: UUID) -> Optional[Person]:
        """Get a person by ID"""
        stmt = select(Person).where(Person.id == person_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_people(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Person], int]:
        """List all people with basic pagination"""
        
        # Get total count
        count_stmt = select(func.count(Person.id))
        result = await db.execute(count_stmt)
        total = result.scalar()

        # Get paginated people
        offset = (page - 1) * page_size
        stmt = select(Person).order_by(Person.last_name, Person.first_name).offset(offset).limit(page_size)
        result = await db.execute(stmt)
        people = result.scalars().all()

        return list(people), total

    async def update_person(
        self,
        db: AsyncSession,
        person_id: UUID,
        person_data: PersonUpdate,
        current_user_id: UUID
    ) -> Person:
        """Update a person"""
        try:
            person = await self.get_person(db, person_id)
            if not person:
                raise NotFoundError("Person not found")

            # Check email uniqueness if being updated
            if person_data.email and person_data.email.lower() != person.email:
                stmt = select(Person).where(
                    and_(
                        Person.email == person_data.email.lower(),
                        Person.id != person_id
                    )
                )
                result = await db.execute(stmt)
                existing_person = result.scalar_one_or_none()
                if existing_person:
                    raise ConflictError("Person with this email already exists")

            # Validate manager exists if provided
            if person_data.manager_id:
                # Prevent self-management
                if person_data.manager_id == person_id:
                    raise ValidationError("Person cannot be their own manager")
                
                stmt = select(Person).where(Person.id == person_data.manager_id)
                result = await db.execute(stmt)
                manager = result.scalar_one_or_none()
                if not manager:
                    raise ValidationError("Manager not found")

            # Update person fields
            update_data = person_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                if field == 'email' and value:
                    value = value.lower()
                setattr(person, field, value)

            person.updated_at = datetime.utcnow()

            await db.commit()
            await db.refresh(person)

            logger.info(f"Person updated: {person.full_name} ({person.email})")
            return person

        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Database integrity error updating person: {str(e)}")
            raise ConflictError("Person with this email already exists")
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating person: {str(e)}")
            raise

    async def delete_person(
        self,
        db: AsyncSession,
        person_id: UUID,
        current_user_id: UUID
    ) -> bool:
        """Delete a person"""
        try:
            person = await self.get_person(db, person_id)
            if not person:
                raise NotFoundError("Person not found")

            # Check if person has direct reports and remove the manager relationship
            stmt = select(Person).where(Person.manager_id == person_id)
            result = await db.execute(stmt)
            direct_reports = result.scalars().all()
            
            for report in direct_reports:
                report.manager_id = None

            await db.delete(person)
            await db.commit()

            logger.info(f"Person deleted: {person.full_name} ({person.email})")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting person: {str(e)}")
            raise