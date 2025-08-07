"""
Forms API router for Adaptive Cards Designer
Handles CRUD operations, templates, sharing, and form management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from typing import Optional, List
from uuid import UUID
import logging

from core.database import get_db
from core.dependencies import get_current_user_dict
from models.form import (
    Form, FormTemplate, FormSubmission, FormVersion, FormShare,
    FormStatus, FormVisibility, FormSharePermission
)
from models.user import User
from schemas.forms import (
    FormCreate, FormUpdate, FormResponse, FormListItem, FormListResponse, FormListQuery,
    FormTemplateCreate, FormTemplateUpdate, FormTemplateResponse, FormTemplateListResponse, FormTemplateQuery,
    FormSubmissionCreate, FormSubmissionResponse, FormSubmissionListResponse,
    FormShareCreate, FormShareUpdate, FormShareResponse, FormShareListResponse,
    FormVersionResponse, FormVersionListResponse,
    ApiResponse, ErrorResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


# Helper functions
async def get_form_or_404(db: AsyncSession, form_id: UUID, user_id: UUID, required_permission: str = "view") -> Form:
    """Get form by ID with permission check"""
    query = select(Form).where(Form.id == form_id)
    result = await db.execute(query)
    form = result.scalar_one_or_none()
    
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    # Check permissions
    if form.created_by != user_id:
        # Check if user has access through sharing
        if form.visibility == FormVisibility.PRIVATE:
            share_query = select(FormShare).where(
                and_(
                    FormShare.form_id == form_id,
                    FormShare.shared_with_user_id == user_id,
                    FormShare.is_active == True
                )
            )
            share_result = await db.execute(share_query)
            share = share_result.scalar_one_or_none()
            
            if not share:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this form"
                )
            
            # Check permission level
            if required_permission == "edit" and share.permission not in [FormSharePermission.EDIT, FormSharePermission.ADMIN]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to edit this form"
                )
        elif form.visibility == FormVisibility.ORGANIZATION:
            # TODO: Add organization-level permission check when organizations are fully implemented
            pass
    
    return form


async def create_form_version(db: AsyncSession, form: Form, user_id: UUID, change_description: Optional[str] = None):
    """Create a new version entry for form changes"""
    version = FormVersion(
        form_id=form.id,
        version_number=form.version,
        change_description=change_description,
        title=form.title,
        description=form.description,
        adaptive_card_json=form.adaptive_card_json,
        elements_json=form.elements_json,
        created_by=user_id
    )
    
    db.add(version)
    return version


# Forms CRUD endpoints
@router.post("/forms", response_model=FormResponse)
async def create_form(
    form_data: FormCreate,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Create a new form"""
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
            created_by=UUID(current_user["user_id"])
        )
        
        db.add(form)
        await db.flush()
        
        # Create initial version
        await create_form_version(db, form, UUID(current_user["user_id"]), "Initial version")
        
        await db.commit()
        await db.refresh(form)
        
        # Add computed fields
        form.is_expired = form.is_expired
        form.is_submission_allowed = form.is_submission_allowed
        
        logger.info(f"Created form {form.id} by user {current_user['user_id']}")
        
        return form
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating form: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create form"
        )


@router.get("/forms", response_model=FormListResponse)
async def list_forms(
    query: FormListQuery = Depends(),
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """List forms with filtering and pagination"""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Build base query
        base_query = select(Form).where(
            or_(
                Form.created_by == user_id,
                Form.visibility == FormVisibility.PUBLIC,
                and_(
                    Form.visibility == FormVisibility.ORGANIZATION,
                    # TODO: Add organization membership check
                    True
                ),
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
        if query.status:
            base_query = base_query.where(Form.status == query.status)
        if query.visibility:
            base_query = base_query.where(Form.visibility == query.visibility)
        if query.is_template is not None:
            base_query = base_query.where(Form.is_template == query.is_template)
        if query.category:
            base_query = base_query.where(Form.category == query.category)
        if query.created_by:
            base_query = base_query.where(Form.created_by == query.created_by)
        if query.search:
            search_filter = or_(
                Form.title.ilike(f"%{query.search}%"),
                Form.description.ilike(f"%{query.search}%")
            )
            base_query = base_query.where(search_filter)
        if query.tags:
            # PostgreSQL JSON array contains check
            for tag in query.tags:
                base_query = base_query.where(Form.tags.op("@>")([tag]))
        
        # Apply sorting
        sort_field = getattr(Form, query.sort, Form.created_at)
        if query.order == "desc":
            base_query = base_query.order_by(desc(sort_field))
        else:
            base_query = base_query.order_by(asc(sort_field))
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (query.page - 1) * query.size
        paginated_query = base_query.offset(offset).limit(query.size)
        
        # Execute query
        result = await db.execute(paginated_query)
        forms = result.scalars().all()
        
        # Add computed fields
        form_items = []
        for form in forms:
            form.is_expired = form.is_expired
            form.is_submission_allowed = form.is_submission_allowed
            form_items.append(form)
        
        pages = (total + query.size - 1) // query.size
        
        return FormListResponse(
            items=form_items,
            total=total,
            page=query.page,
            size=query.size,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Error listing forms: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve forms"
        )


@router.get("/forms/{form_id}", response_model=FormResponse)
async def get_form(
    form_id: UUID,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific form by ID"""
    try:
        user_id = UUID(current_user["user_id"])
        form = await get_form_or_404(db, form_id, user_id)
        
        # Increment view count
        form.increment_view_count()
        await db.commit()
        
        # Add computed fields
        form.is_expired = form.is_expired
        form.is_submission_allowed = form.is_submission_allowed
        
        return form
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting form {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve form"
        )


@router.put("/forms/{form_id}", response_model=FormResponse)
async def update_form(
    form_id: UUID,
    form_data: FormUpdate,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing form"""
    try:
        user_id = UUID(current_user["user_id"])
        form = await get_form_or_404(db, form_id, user_id, required_permission="edit")
        
        # Create version before updating if significant changes
        significant_change = any([
            form_data.adaptive_card_json is not None,
            form_data.elements_json is not None,
            form_data.title is not None
        ])
        
        if significant_change:
            await create_form_version(db, form, user_id, "Form updated")
            form.version += 1
        
        # Update fields
        update_data = form_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(form, field, value)
        
        await db.commit()
        await db.refresh(form)
        
        # Add computed fields
        form.is_expired = form.is_expired
        form.is_submission_allowed = form.is_submission_allowed
        
        logger.info(f"Updated form {form_id} by user {current_user['user_id']}")
        
        return form
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating form {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update form"
        )


@router.delete("/forms/{form_id}", response_model=ApiResponse)
async def delete_form(
    form_id: UUID,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Delete a form (soft delete by setting status to deleted)"""
    try:
        user_id = UUID(current_user["user_id"])
        form = await get_form_or_404(db, form_id, user_id, required_permission="edit")
        
        # Check if user is the creator (only creators can delete)
        if form.created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the form creator can delete this form"
            )
        
        # Soft delete
        form.status = FormStatus.DELETED
        
        await db.commit()
        
        logger.info(f"Deleted form {form_id} by user {current_user['user_id']}")
        
        return ApiResponse(
            success=True,
            message="Form deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting form {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete form"
        )


# Form Templates endpoints
@router.post("/forms/templates", response_model=FormTemplateResponse)
async def create_form_template(
    template_data: FormTemplateCreate,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
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
            created_by=UUID(current_user["user_id"])
        )
        
        db.add(template)
        await db.commit()
        await db.refresh(template)
        
        logger.info(f"Created form template {template.id} by user {current_user['user_id']}")
        
        return template
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating form template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create form template"
        )


@router.get("/forms/templates", response_model=FormTemplateListResponse)
async def list_form_templates(
    query: FormTemplateQuery = Depends(),
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """List form templates with filtering and pagination"""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Build base query - show public templates and user's own templates
        base_query = select(FormTemplate).where(
            or_(
                FormTemplate.is_public == True,
                FormTemplate.created_by == user_id
            )
        )
        
        # Apply filters
        if query.category:
            base_query = base_query.where(FormTemplate.category == query.category)
        if query.is_featured is not None:
            base_query = base_query.where(FormTemplate.is_featured == query.is_featured)
        if query.search:
            search_filter = or_(
                FormTemplate.name.ilike(f"%{query.search}%"),
                FormTemplate.description.ilike(f"%{query.search}%")
            )
            base_query = base_query.where(search_filter)
        if query.tags:
            for tag in query.tags:
                base_query = base_query.where(FormTemplate.tags.op("@>")([tag]))
        
        # Apply sorting
        sort_field = getattr(FormTemplate, query.sort, FormTemplate.usage_count)
        if query.order == "desc":
            base_query = base_query.order_by(desc(sort_field))
        else:
            base_query = base_query.order_by(asc(sort_field))
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (query.page - 1) * query.size
        paginated_query = base_query.offset(offset).limit(query.size)
        
        # Execute query
        result = await db.execute(paginated_query)
        templates = result.scalars().all()
        
        pages = (total + query.size - 1) // query.size
        
        return FormTemplateListResponse(
            items=templates,
            total=total,
            page=query.page,
            size=query.size,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Error listing form templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve form templates"
        )


@router.get("/forms/templates/{template_id}", response_model=FormTemplateResponse)
async def get_form_template(
    template_id: UUID,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific form template by ID"""
    try:
        user_id = UUID(current_user["user_id"])
        
        query = select(FormTemplate).where(FormTemplate.id == template_id)
        result = await db.execute(query)
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form template not found"
            )
        
        # Check access permissions
        if not template.is_public and template.created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this template"
            )
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting form template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve form template"
        )


@router.post("/forms/templates/{template_id}/use", response_model=FormResponse)
async def create_form_from_template(
    template_id: UUID,
    title: str = Query(..., description="Title for the new form"),
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Create a new form from a template"""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Get template
        query = select(FormTemplate).where(FormTemplate.id == template_id)
        result = await db.execute(query)
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form template not found"
            )
        
        if not template.is_public and template.created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this template"
            )
        
        # Create form from template
        form = Form(
            title=title,
            description=template.description,
            adaptive_card_json=template.adaptive_card_json,
            elements_json=template.elements_json,
            category=template.category,
            tags=template.tags,
            created_by=user_id
        )
        
        db.add(form)
        await db.flush()
        
        # Create initial version
        await create_form_version(db, form, user_id, f"Created from template: {template.name}")
        
        # Increment template usage count
        template.increment_usage_count()
        
        await db.commit()
        await db.refresh(form)
        
        # Add computed fields
        form.is_expired = form.is_expired
        form.is_submission_allowed = form.is_submission_allowed
        
        logger.info(f"Created form {form.id} from template {template_id} by user {current_user['user_id']}")
        
        return form
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating form from template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create form from template"
        )


# Form Submissions endpoints
@router.post("/forms/{form_id}/submit", response_model=ApiResponse)
async def submit_form(
    form_id: UUID,
    submission_data: FormSubmissionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Submit form data"""
    try:
        user_id = UUID(current_user["user_id"])
        
        # Get form
        query = select(Form).where(Form.id == form_id)
        result = await db.execute(query)
        form = result.scalar_one_or_none()
        
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found"
            )
        
        # Check if form accepts submissions
        if not form.is_submission_allowed:
            if form.status != FormStatus.PUBLISHED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Form is not published"
                )
            elif form.is_expired:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Form has expired"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Form no longer accepts submissions"
                )
        
        # Create submission
        submission = FormSubmission(
            form_id=form_id,
            data=submission_data.data,
            submitter_user_id=user_id
        )
        
        db.add(submission)
        
        # Update form statistics
        form.increment_submission_count()
        
        await db.commit()
        
        # TODO: Add background task for processing submissions (webhooks, notifications, etc.)
        # background_tasks.add_task(process_form_submission, submission.id)
        
        logger.info(f"Form {form_id} submitted by user {current_user['user_id']}")
        
        return ApiResponse(
            success=True,
            message=form.submit_message or "Form submitted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error submitting form {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit form"
        )


@router.get("/forms/{form_id}/submissions", response_model=FormSubmissionListResponse)
async def list_form_submissions(
    form_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """List form submissions (form owner only)"""
    try:
        user_id = UUID(current_user["user_id"])
        form = await get_form_or_404(db, form_id, user_id, required_permission="admin")
        
        # Only form owner can view submissions
        if form.created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the form creator can view submissions"
            )
        
        # Build query
        base_query = select(FormSubmission).where(FormSubmission.form_id == form_id)
        base_query = base_query.order_by(desc(FormSubmission.submitted_at))
        
        # Get total count
        count_query = select(func.count()).where(FormSubmission.form_id == form_id)
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        paginated_query = base_query.offset(offset).limit(size)
        
        # Execute query
        result = await db.execute(paginated_query)
        submissions = result.scalars().all()
        
        pages = (total + size - 1) // size
        
        return FormSubmissionListResponse(
            items=submissions,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing form submissions for {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve form submissions"
        )


# Form Versions endpoints
@router.get("/forms/{form_id}/versions", response_model=FormVersionListResponse)
async def list_form_versions(
    form_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """List form version history"""
    try:
        user_id = UUID(current_user["user_id"])
        await get_form_or_404(db, form_id, user_id)  # Check access
        
        # Build query
        base_query = select(FormVersion).where(FormVersion.form_id == form_id)
        base_query = base_query.order_by(desc(FormVersion.version_number))
        
        # Get total count
        count_query = select(func.count()).where(FormVersion.form_id == form_id)
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * size
        paginated_query = base_query.offset(offset).limit(size)
        
        # Execute query
        result = await db.execute(paginated_query)
        versions = result.scalars().all()
        
        pages = (total + size - 1) // size
        
        return FormVersionListResponse(
            items=versions,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing form versions for {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve form versions"
        )


# Form Sharing endpoints (basic implementation)
@router.post("/forms/{form_id}/share", response_model=ApiResponse)
async def share_form(
    form_id: UUID,
    share_data: FormShareCreate,
    current_user: dict = Depends(get_current_user_dict),
    db: AsyncSession = Depends(get_db)
):
    """Share a form with another user"""
    try:
        user_id = UUID(current_user["user_id"])
        form = await get_form_or_404(db, form_id, user_id, required_permission="admin")
        
        # Only form owner can share
        if form.created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the form creator can share this form"
            )
        
        # Find user to share with
        user_query = select(User).where(User.email == share_data.user_email)
        user_result = await db.execute(user_query)
        target_user = user_result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if already shared
        existing_share_query = select(FormShare).where(
            and_(
                FormShare.form_id == form_id,
                FormShare.shared_with_user_id == target_user.id
            )
        )
        existing_result = await db.execute(existing_share_query)
        existing_share = existing_result.scalar_one_or_none()
        
        if existing_share:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Form is already shared with this user"
            )
        
        # Create share
        share = FormShare(
            form_id=form_id,
            shared_with_user_id=target_user.id,
            shared_by_user_id=user_id,
            permission=share_data.permission,
            can_reshare=share_data.can_reshare,
            message=share_data.message,
            expires_at=share_data.expires_at
        )
        
        db.add(share)
        await db.commit()
        
        logger.info(f"Form {form_id} shared with user {target_user.id} by {current_user['user_id']}")
        
        return ApiResponse(
            success=True,
            message=f"Form shared successfully with {share_data.user_email}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error sharing form {form_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to share form"
        )