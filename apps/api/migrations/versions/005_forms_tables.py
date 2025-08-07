"""Forms and Adaptive Cards tables

Revision ID: 005
Revises: 004
Create Date: 2025-08-07 23:34:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create forms table
    op.create_table('forms',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('schema_version', sa.String(10), default='1.5', nullable=False),
        sa.Column('adaptive_card_json', sa.JSON(), nullable=False),
        sa.Column('elements_json', sa.JSON(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'published', 'archived', 'deleted', name='formstatus'), default='draft', nullable=False),
        sa.Column('visibility', sa.Enum('private', 'organization', 'public', name='formvisibility'), default='private', nullable=False),
        sa.Column('is_template', sa.Boolean(), default=False, nullable=False),
        sa.Column('allow_anonymous', sa.Boolean(), default=False, nullable=False),
        sa.Column('submit_message', sa.Text(), nullable=True),
        sa.Column('redirect_url', sa.String(500), nullable=True),
        sa.Column('email_notifications', sa.JSON(), nullable=True),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('max_submissions', sa.Integer(), nullable=True),
        sa.Column('submission_count', sa.Integer(), default=0, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.Column('parent_form_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='SET NULL'), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('view_count', sa.Integer(), default=0, nullable=False),
        sa.Column('last_submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for forms table
    op.create_index('idx_form_title', 'forms', ['title'])
    op.create_index('idx_form_status', 'forms', ['status'])
    op.create_index('idx_form_creator_status', 'forms', ['created_by', 'status'])
    op.create_index('idx_form_template_status', 'forms', ['is_template', 'status'])
    op.create_index('idx_form_visibility_status', 'forms', ['visibility', 'status'])
    op.create_index('idx_form_created_at_desc', 'forms', ['created_at'])
    op.create_index('idx_form_updated_at_desc', 'forms', ['updated_at'])
    op.create_index('idx_form_category', 'forms', ['category'])
    op.create_index('idx_form_is_template', 'forms', ['is_template'])
    op.create_index('idx_form_created_by', 'forms', ['created_by'])

    # Create form_templates table
    op.create_table('form_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('adaptive_card_json', sa.JSON(), nullable=False),
        sa.Column('elements_json', sa.JSON(), nullable=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('is_public', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_featured', sa.Boolean(), default=False, nullable=False),
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for form_templates
    op.create_index('idx_template_name', 'form_templates', ['name'])
    op.create_index('idx_template_category_public', 'form_templates', ['category', 'is_public'])
    op.create_index('idx_template_featured_public', 'form_templates', ['is_featured', 'is_public'])
    op.create_index('idx_template_usage_count', 'form_templates', ['usage_count'])
    op.create_index('idx_template_category', 'form_templates', ['category'])

    # Create form_submissions table
    op.create_table('form_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('form_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('submitter_ip', sa.String(45), nullable=True),
        sa.Column('submitter_user_agent', sa.String(500), nullable=True),
        sa.Column('submitter_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_processed', sa.Boolean(), default=False, nullable=False),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for form_submissions
    op.create_index('idx_submission_form_submitted', 'form_submissions', ['form_id', 'submitted_at'])
    op.create_index('idx_submission_user_submitted', 'form_submissions', ['submitter_user_id', 'submitted_at'])
    op.create_index('idx_submission_processed', 'form_submissions', ['is_processed'])
    op.create_index('idx_submission_form_id', 'form_submissions', ['form_id'])
    op.create_index('idx_submission_submitted_at', 'form_submissions', ['submitted_at'])

    # Create form_versions table
    op.create_table('form_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('form_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('change_description', sa.Text(), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('adaptive_card_json', sa.JSON(), nullable=False),
        sa.Column('elements_json', sa.JSON(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
    )
    
    # Create indexes and constraints for form_versions
    op.create_index('idx_version_form_number', 'form_versions', ['form_id', 'version_number'])
    op.create_index('idx_version_created_at', 'form_versions', ['created_at'])
    op.create_index('idx_version_form_id', 'form_versions', ['form_id'])
    op.create_unique_constraint('unique_form_version', 'form_versions', ['form_id', 'version_number'])

    # Create form_shares table
    op.create_table('form_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('form_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_with_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('permission', sa.Enum('view', 'edit', 'admin', name='formsharepermission'), default='view', nullable=False),
        sa.Column('can_reshare', sa.Boolean(), default=False, nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('shared_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes and constraints for form_shares
    op.create_index('idx_share_form_permission', 'form_shares', ['form_id', 'permission'])
    op.create_index('idx_share_user_permission', 'form_shares', ['shared_with_user_id', 'permission'])
    op.create_index('idx_share_expires', 'form_shares', ['expires_at'])
    op.create_index('idx_share_form_id', 'form_shares', ['form_id'])
    op.create_index('idx_share_shared_with_user_id', 'form_shares', ['shared_with_user_id'])
    op.create_unique_constraint('unique_form_user_share', 'form_shares', ['form_id', 'shared_with_user_id'])

    # Create form_collaborators table (junction table)
    op.create_table('form_collaborators',
        sa.Column('form_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission', sa.Enum('view', 'edit', 'admin', name='formsharepermission2'), default='view', nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.PrimaryKeyConstraint('form_id', 'user_id')
    )
    
    # Create indexes for form_collaborators
    op.create_index('idx_form_collaborators_form', 'form_collaborators', ['form_id'])
    op.create_index('idx_form_collaborators_user', 'form_collaborators', ['user_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('form_collaborators')
    op.drop_table('form_shares')
    op.drop_table('form_versions')
    op.drop_table('form_submissions')
    op.drop_table('form_templates')
    op.drop_table('forms')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS formsharepermission2')
    op.execute('DROP TYPE IF EXISTS formsharepermission')
    op.execute('DROP TYPE IF EXISTS formvisibility')
    op.execute('DROP TYPE IF EXISTS formstatus')