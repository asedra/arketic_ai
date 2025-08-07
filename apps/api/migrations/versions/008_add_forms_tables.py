"""Add forms tables for Adaptive Cards Designer

Revision ID: 008_add_forms_tables
Revises: 007_remove_organization_id
Create Date: 2025-08-07 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '008_add_forms_tables'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    """Create forms-related tables"""
    
    # Create enums (check if exists first)
    connection = op.get_bind()
    
    # Check if enums exist before creating them
    result = connection.execute(sa.text("SELECT typname FROM pg_type WHERE typname IN ('formstatus', 'formvisibility', 'formsharepermission')"))
    existing_types = {row[0] for row in result.fetchall()}
    
    # Create FormStatus enum only if it doesn't exist
    if 'formstatus' not in existing_types:
        try:
            connection.execute(sa.text("CREATE TYPE formstatus AS ENUM ('draft', 'published', 'archived', 'deleted');"))
        except Exception:
            pass
    
    # Create FormVisibility enum only if it doesn't exist
    if 'formvisibility' not in existing_types:
        try:
            connection.execute(sa.text("CREATE TYPE formvisibility AS ENUM ('private', 'organization', 'public');"))
        except Exception:
            pass
    
    # Create FormSharePermission enum only if it doesn't exist
    if 'formsharepermission' not in existing_types:
        try:
            connection.execute(sa.text("CREATE TYPE formsharepermission AS ENUM ('view', 'edit', 'admin');"))
        except Exception:
            pass
    
    # Create forms table
    op.create_table(
        'forms',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('schema_version', sa.String(10), nullable=False, default='1.5'),
        sa.Column('adaptive_card_json', sa.JSON, nullable=False),
        sa.Column('elements_json', sa.JSON, nullable=True),
        sa.Column('status', sa.Enum('draft', 'published', 'archived', 'deleted', name='formstatus'), nullable=False, default='draft'),
        sa.Column('visibility', sa.Enum('private', 'organization', 'public', name='formvisibility'), nullable=False, default='private'),
        sa.Column('is_template', sa.Boolean, nullable=False, default=False),
        sa.Column('allow_anonymous', sa.Boolean, nullable=False, default=False),
        sa.Column('submit_message', sa.Text, nullable=True),
        sa.Column('redirect_url', sa.String(500), nullable=True),
        sa.Column('email_notifications', sa.JSON, nullable=True),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('max_submissions', sa.Integer, nullable=True),
        sa.Column('submission_count', sa.Integer, nullable=False, default=0),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('created_by', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('version', sa.Integer, nullable=False, default=1),
        sa.Column('parent_form_id', sa.UUID(as_uuid=True), sa.ForeignKey('forms.id'), nullable=True),
        sa.Column('tags', sa.JSON, nullable=True),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('view_count', sa.Integer, nullable=False, default=0),
        sa.Column('last_submitted_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('published_at', sa.DateTime, nullable=True),
    )
    
    # Create form_templates table
    op.create_table(
        'form_templates',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('adaptive_card_json', sa.JSON, nullable=False),
        sa.Column('elements_json', sa.JSON, nullable=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('tags', sa.JSON, nullable=True),
        sa.Column('is_public', sa.Boolean, nullable=False, default=True),
        sa.Column('is_featured', sa.Boolean, nullable=False, default=False),
        sa.Column('usage_count', sa.Integer, nullable=False, default=0),
        sa.Column('created_by', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create form_submissions table
    op.create_table(
        'form_submissions',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('form_id', sa.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('data', sa.JSON, nullable=False),
        sa.Column('submitter_ip', sa.String(45), nullable=True),
        sa.Column('submitter_user_agent', sa.String(500), nullable=True),
        sa.Column('submitter_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_processed', sa.Boolean, nullable=False, default=False),
        sa.Column('processing_error', sa.Text, nullable=True),
        sa.Column('submitted_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime, nullable=True),
    )
    
    # Create form_versions table
    op.create_table(
        'form_versions',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('form_id', sa.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer, nullable=False),
        sa.Column('change_description', sa.Text, nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('adaptive_card_json', sa.JSON, nullable=False),
        sa.Column('elements_json', sa.JSON, nullable=True),
        sa.Column('created_by', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    
    # Create form_shares table
    op.create_table(
        'form_shares',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('form_id', sa.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_with_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_by_user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('permission', sa.Enum('view', 'edit', 'admin', name='formsharepermission'), nullable=False, default='view'),
        sa.Column('can_reshare', sa.Boolean, nullable=False, default=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('shared_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('last_accessed_at', sa.DateTime, nullable=True),
    )
    
    # Create form_collaborators table
    op.create_table(
        'form_collaborators',
        sa.Column('form_id', sa.UUID(as_uuid=True), sa.ForeignKey('forms.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission', sa.Enum('view', 'edit', 'admin', name='formsharepermission'), nullable=False, default='view'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('created_by', sa.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
    )
    
    # Create indexes for forms table
    op.create_index('idx_form_title', 'forms', ['title'])
    op.create_index('idx_form_status', 'forms', ['status'])
    op.create_index('idx_form_is_template', 'forms', ['is_template'])
    op.create_index('idx_form_created_by', 'forms', ['created_by'])
    op.create_index('idx_form_category', 'forms', ['category'])
    op.create_index('idx_form_created_at', 'forms', ['created_at'])
    op.create_index('idx_form_creator_status', 'forms', ['created_by', 'status'])
    op.create_index('idx_form_template_status', 'forms', ['is_template', 'status'])
    op.create_index('idx_form_visibility_status', 'forms', ['visibility', 'status'])
    op.create_index('idx_form_created_at_desc', 'forms', ['created_at'])
    op.create_index('idx_form_updated_at_desc', 'forms', ['updated_at'])
    
    # Create indexes for form_templates table
    op.create_index('idx_template_name', 'form_templates', ['name'])
    op.create_index('idx_template_category', 'form_templates', ['category'])
    op.create_index('idx_template_category_public', 'form_templates', ['category', 'is_public'])
    op.create_index('idx_template_featured_public', 'form_templates', ['is_featured', 'is_public'])
    op.create_index('idx_template_usage_count', 'form_templates', ['usage_count'])
    
    # Create indexes for form_submissions table
    op.create_index('idx_submission_form_id', 'form_submissions', ['form_id'])
    op.create_index('idx_submission_submitted_at', 'form_submissions', ['submitted_at'])
    op.create_index('idx_submission_form_submitted', 'form_submissions', ['form_id', 'submitted_at'])
    op.create_index('idx_submission_user_submitted', 'form_submissions', ['submitter_user_id', 'submitted_at'])
    op.create_index('idx_submission_processed', 'form_submissions', ['is_processed'])
    
    # Create indexes for form_versions table
    op.create_index('idx_version_form_id', 'form_versions', ['form_id'])
    op.create_index('idx_version_form_number', 'form_versions', ['form_id', 'version_number'])
    op.create_index('idx_version_created_at', 'form_versions', ['created_at'])
    
    # Create indexes for form_shares table
    op.create_index('idx_share_form_id', 'form_shares', ['form_id'])
    op.create_index('idx_share_shared_with_user_id', 'form_shares', ['shared_with_user_id'])
    op.create_index('idx_share_form_permission', 'form_shares', ['form_id', 'permission'])
    op.create_index('idx_share_user_permission', 'form_shares', ['shared_with_user_id', 'permission'])
    op.create_index('idx_share_expires', 'form_shares', ['expires_at'])
    
    # Create indexes for form_collaborators table
    op.create_index('idx_form_collaborators_form', 'form_collaborators', ['form_id'])
    op.create_index('idx_form_collaborators_user', 'form_collaborators', ['user_id'])
    
    # Create unique constraints
    op.create_unique_constraint('unique_form_version', 'form_versions', ['form_id', 'version_number'])
    op.create_unique_constraint('unique_form_user_share', 'form_shares', ['form_id', 'shared_with_user_id'])


def downgrade():
    """Drop forms-related tables"""
    
    # Drop tables in reverse order
    op.drop_table('form_collaborators')
    op.drop_table('form_shares')
    op.drop_table('form_versions')
    op.drop_table('form_submissions')
    op.drop_table('form_templates')
    op.drop_table('forms')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS formsharepermission')
    op.execute('DROP TYPE IF EXISTS formvisibility')
    op.execute('DROP TYPE IF EXISTS formstatus')