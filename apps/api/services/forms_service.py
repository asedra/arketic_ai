"""
Forms service layer for business logic
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, asc, func
import logging

from models.form import (
    Form, FormTemplate, FormSubmission, FormVersion, FormShare,
    FormStatus, FormVisibility, FormSharePermission
)
from models.user import User
from schemas.forms import FormCreate, FormUpdate, FormTemplateCreate

logger = logging.getLogger(__name__)


class FormsService:
    """Service class for form-related operations"""
    
    async def create_form(
        self,
        db: AsyncSession,
        form_data: FormCreate,
        created_by: UUID
    ) -> Form:
        """Create a new form with initial version"""
        try:
            # Create form
            form = Form(
                title=form_data.title,
                description=form_data.description,
                adaptive_card_json=form_data.adaptive_card_json,
                elements_json=form_data.elements_json,
                visibility=form_data.visibility,
                allow_anonymous=form_data.allow_anonymous,
                submit_message=form_data.submit_message,
                redirect_url=form_data.redirect_url,
                email_notifications=form_data.email_notifications,
                webhook_url=form_data.webhook_url,
                max_submissions=form_data.max_submissions,
                expires_at=form_data.expires_at,
                tags=form_data.tags,
                category=form_data.category,
                created_by=created_by
            )
            
            db.add(form)
            await db.flush()
            
            # Create initial version
            await self._create_form_version(db, form, created_by, "Initial version")
            
            await db.commit()
            await db.refresh(form)
            
            return form
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating form: {e}")
            raise
    
    async def get_form_by_id(
        self,
        db: AsyncSession,
        form_id: UUID,
        user_id: UUID,
        increment_view: bool = False
    ) -> Optional[Form]:
        """Get form by ID with permission check"""
        query = select(Form).where(Form.id == form_id)
        result = await db.execute(query)
        form = result.scalar_one_or_none()
        
        if not form:
            return None
        
        # Check permissions
        has_access = await self._check_form_access(db, form, user_id)
        if not has_access:
            return None
        
        if increment_view:
            form.increment_view_count()
            await db.commit()
        
        return form
    
    async def update_form(
        self,
        db: AsyncSession,
        form: Form,
        form_data: FormUpdate,
        updated_by: UUID
    ) -> Form:
        """Update an existing form"""
        try:
            # Create version before updating if significant changes
            significant_change = any([
                form_data.adaptive_card_json is not None,
                form_data.elements_json is not None,
                form_data.title is not None
            ])
            
            if significant_change:
                await self._create_form_version(db, form, updated_by, "Form updated")
                form.version += 1
            
            # Update fields
            update_data = form_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(form, field, value)
            
            await db.commit()
            await db.refresh(form)
            
            return form
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating form {form.id}: {e}")
            raise
    
    async def delete_form(
        self,
        db: AsyncSession,
        form: Form
    ) -> bool:
        """Soft delete a form"""
        try:
            form.status = FormStatus.DELETED
            await db.commit()
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deleting form {form.id}: {e}")
            raise
    
    async def list_forms(
        self,
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        size: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        sort: str = "created_at",
        order: str = "desc"
    ) -> tuple[List[Form], int]:
        """List forms with pagination and filtering"""
        filters = filters or {}
        
        # Build base query with permission filtering
        base_query = select(Form).where(
            or_(
                Form.created_by == user_id,
                Form.visibility == FormVisibility.PUBLIC,
                Form.id.in_(
                    select(FormShare.form_id).where(
                        and_(
                            FormShare.shared_with_user_id == user_id,
                            FormShare.is_active == True
                        )
                    )
                )
            )
        )
        
        # Apply filters
        if filters.get('status'):
            base_query = base_query.where(Form.status == filters['status'])
        if filters.get('visibility'):
            base_query = base_query.where(Form.visibility == filters['visibility'])
        if filters.get('is_template') is not None:
            base_query = base_query.where(Form.is_template == filters['is_template'])
        if filters.get('category'):
            base_query = base_query.where(Form.category == filters['category'])
        if filters.get('created_by'):
            base_query = base_query.where(Form.created_by == filters['created_by'])
        if filters.get('search'):
            search_filter = or_(
                Form.title.ilike(f"%{filters['search']}%"),
                Form.description.ilike(f"%{filters['search']}%")
            )
            base_query = base_query.where(search_filter)
        if filters.get('tags'):
            for tag in filters['tags']:
                base_query = base_query.where(Form.tags.op("@>")([tag]))
        
        # Apply sorting
        sort_field = getattr(Form, sort, Form.created_at)
        if order == "desc":
            base_query = base_query.order_by(desc(sort_field))
        else:
            base_query = base_query.order_by(asc(sort_field))
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        paginated_query = base_query.offset(offset).limit(size)
        
        # Execute query
        result = await db.execute(paginated_query)
        forms = result.scalars().all()
        
        return forms, total
    
    async def submit_form(
        self,
        db: AsyncSession,
        form: Form,
        submission_data: Dict[str, Any],
        submitter_user_id: Optional[UUID] = None,
        submitter_ip: Optional[str] = None,
        submitter_user_agent: Optional[str] = None
    ) -> FormSubmission:
        """Submit form data"""
        try:
            # Validate form can accept submissions
            if not form.is_submission_allowed:
                raise ValueError("Form no longer accepts submissions")
            
            # Create submission
            submission = FormSubmission(
                form_id=form.id,
                data=submission_data,
                submitter_user_id=submitter_user_id,
                submitter_ip=submitter_ip,
                submitter_user_agent=submitter_user_agent
            )
            
            db.add(submission)
            
            # Update form statistics
            form.increment_submission_count()
            
            await db.commit()
            await db.refresh(submission)
            
            return submission
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error submitting form {form.id}: {e}")
            raise
    
    async def share_form(
        self,
        db: AsyncSession,
        form: Form,
        target_user_email: str,
        shared_by: UUID,
        permission: FormSharePermission,
        can_reshare: bool = False,
        message: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> FormShare:
        """Share a form with another user"""
        try:
            # Find target user
            user_query = select(User).where(User.email == target_user_email)
            user_result = await db.execute(user_query)
            target_user = user_result.scalar_one_or_none()
            
            if not target_user:
                raise ValueError("User not found")
            
            # Check if already shared
            existing_share_query = select(FormShare).where(
                and_(
                    FormShare.form_id == form.id,
                    FormShare.shared_with_user_id == target_user.id
                )
            )
            existing_result = await db.execute(existing_share_query)
            existing_share = existing_result.scalar_one_or_none()
            
            if existing_share:
                raise ValueError("Form is already shared with this user")
            
            # Create share
            share = FormShare(
                form_id=form.id,
                shared_with_user_id=target_user.id,
                shared_by_user_id=shared_by,
                permission=permission,
                can_reshare=can_reshare,
                message=message,
                expires_at=expires_at
            )
            
            db.add(share)
            await db.commit()
            await db.refresh(share)
            
            return share
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error sharing form {form.id}: {e}")
            raise
    
    async def _create_form_version(
        self,
        db: AsyncSession,
        form: Form,
        created_by: UUID,
        change_description: Optional[str] = None
    ) -> FormVersion:
        """Create a new version entry for form changes"""
        version = FormVersion(
            form_id=form.id,
            version_number=form.version,
            change_description=change_description,
            title=form.title,
            description=form.description,
            adaptive_card_json=form.adaptive_card_json,
            elements_json=form.elements_json,
            created_by=created_by
        )
        
        db.add(version)
        return version
    
    async def _check_form_access(
        self,
        db: AsyncSession,
        form: Form,
        user_id: UUID
    ) -> bool:
        """Check if user has access to form"""
        # Owner has full access
        if form.created_by == user_id:
            return True
        
        # Check visibility
        if form.visibility == FormVisibility.PUBLIC:
            return True
        elif form.visibility == FormVisibility.ORGANIZATION:
            # TODO: Add organization membership check
            return True
        elif form.visibility == FormVisibility.PRIVATE:
            # Check if shared with user
            share_query = select(FormShare).where(
                and_(
                    FormShare.form_id == form.id,
                    FormShare.shared_with_user_id == user_id,
                    FormShare.is_active == True
                )
            )
            share_result = await db.execute(share_query)
            share = share_result.scalar_one_or_none()
            
            return share is not None
        
        return False
    
    async def _check_form_edit_permission(
        self,
        db: AsyncSession,
        form: Form,
        user_id: UUID
    ) -> bool:
        """Check if user can edit form"""
        # Owner can always edit
        if form.created_by == user_id:
            return True
        
        # Check shared permissions
        share_query = select(FormShare).where(
            and_(
                FormShare.form_id == form.id,
                FormShare.shared_with_user_id == user_id,
                FormShare.is_active == True
            )
        )
        share_result = await db.execute(share_query)
        share = share_result.scalar_one_or_none()
        
        if share:
            return share.permission in [FormSharePermission.EDIT, FormSharePermission.ADMIN]
        
        return False


class FormTemplatesService:
    """Service class for form template operations"""
    
    async def create_template(
        self,
        db: AsyncSession,
        template_data: FormTemplateCreate,
        created_by: UUID
    ) -> FormTemplate:
        """Create a new form template"""
        try:
            template = FormTemplate(
                name=template_data.name,
                description=template_data.description,
                adaptive_card_json=template_data.adaptive_card_json,
                elements_json=template_data.elements_json,
                category=template_data.category,
                tags=template_data.tags,
                is_public=template_data.is_public,
                is_featured=template_data.is_featured,
                created_by=created_by
            )
            
            db.add(template)
            await db.commit()
            await db.refresh(template)
            
            return template
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating form template: {e}")
            raise
    
    async def list_templates(
        self,
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        size: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        sort: str = "usage_count",
        order: str = "desc"
    ) -> tuple[List[FormTemplate], int]:
        """List form templates with pagination and filtering"""
        filters = filters or {}
        
        # Build base query - show public templates and user's own templates
        base_query = select(FormTemplate).where(
            or_(
                FormTemplate.is_public == True,
                FormTemplate.created_by == user_id
            )
        )
        
        # Apply filters
        if filters.get('category'):
            base_query = base_query.where(FormTemplate.category == filters['category'])
        if filters.get('is_featured') is not None:
            base_query = base_query.where(FormTemplate.is_featured == filters['is_featured'])
        if filters.get('search'):
            search_filter = or_(
                FormTemplate.name.ilike(f"%{filters['search']}%"),
                FormTemplate.description.ilike(f"%{filters['search']}%")
            )
            base_query = base_query.where(search_filter)
        if filters.get('tags'):
            for tag in filters['tags']:
                base_query = base_query.where(FormTemplate.tags.op("@>")([tag]))
        
        # Apply sorting
        sort_field = getattr(FormTemplate, sort, FormTemplate.usage_count)
        if order == "desc":
            base_query = base_query.order_by(desc(sort_field))
        else:
            base_query = base_query.order_by(asc(sort_field))
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        paginated_query = base_query.offset(offset).limit(size)
        
        # Execute query
        result = await db.execute(paginated_query)
        templates = result.scalars().all()
        
        return templates, total
    
    async def get_template_by_id(
        self,
        db: AsyncSession,
        template_id: UUID,
        user_id: UUID
    ) -> Optional[FormTemplate]:
        """Get template by ID with permission check"""
        query = select(FormTemplate).where(FormTemplate.id == template_id)
        result = await db.execute(query)
        template = result.scalar_one_or_none()
        
        if not template:
            return None
        
        # Check access permissions
        if not template.is_public and template.created_by != user_id:
            return None
        
        return template
    
    async def create_form_from_template(
        self,
        db: AsyncSession,
        template: FormTemplate,
        form_title: str,
        created_by: UUID
    ) -> Form:
        """Create a new form from a template"""
        try:
            # Create form from template
            form = Form(
                title=form_title,
                description=template.description,
                adaptive_card_json=template.adaptive_card_json,
                elements_json=template.elements_json,
                category=template.category,
                tags=template.tags,
                created_by=created_by
            )
            
            db.add(form)
            await db.flush()
            
            # Create initial version
            version = FormVersion(
                form_id=form.id,
                version_number=form.version,
                change_description=f"Created from template: {template.name}",
                title=form.title,
                description=form.description,
                adaptive_card_json=form.adaptive_card_json,
                elements_json=form.elements_json,
                created_by=created_by
            )
            
            db.add(version)
            
            # Increment template usage count
            template.increment_usage_count()
            
            await db.commit()
            await db.refresh(form)
            
            return form
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error creating form from template {template.id}: {e}")
            raise