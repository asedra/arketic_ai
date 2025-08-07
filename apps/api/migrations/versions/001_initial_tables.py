"""Initial database tables

Revision ID: 001
Revises: 
Create Date: 2025-08-05 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('username', sa.String(50), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('role', sa.Enum('super_admin', 'admin', 'user', 'viewer', name='userrole'), default='user', nullable=False),
        sa.Column('status', sa.Enum('active', 'inactive', 'suspended', 'pending_verification', name='userstatus'), default='pending_verification', nullable=False),
        sa.Column('is_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('email_verified_at', sa.DateTime(), nullable=True),
        sa.Column('password_changed_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), default=0, nullable=False),
        sa.Column('locked_until', sa.DateTime(), nullable=True),
        sa.Column('two_factor_enabled', sa.Boolean(), default=False, nullable=False),
        sa.Column('two_factor_secret', sa.String(32), nullable=True),
    )
    
    # Create indexes for users table
    op.create_index('idx_user_email_status', 'users', ['email', 'status'])
    op.create_index('idx_user_created_at', 'users', ['created_at'])
    op.create_index('idx_user_role_status', 'users', ['role', 'status'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])

    # Create user_profiles table
    op.create_table('user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('job_title', sa.String(100), nullable=True),
        sa.Column('company', sa.String(100), nullable=True),
        sa.Column('location', sa.String(100), nullable=True),
        sa.Column('timezone', sa.String(50), default='UTC', nullable=False),
        sa.Column('language', sa.String(10), default='en', nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('website', sa.String(200), nullable=True),
        sa.Column('linkedin_url', sa.String(200), nullable=True),
        sa.Column('github_url', sa.String(200), nullable=True),
        sa.Column('skills', sa.JSON(), nullable=True),
        sa.Column('certifications', sa.JSON(), nullable=True),
        sa.Column('experience_years', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create user_preferences table
    op.create_table('user_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('theme', sa.String(20), default='light', nullable=False),
        sa.Column('sidebar_collapsed', sa.Boolean(), default=False, nullable=False),
        sa.Column('notifications_enabled', sa.Boolean(), default=True, nullable=False),
        sa.Column('email_notifications', sa.Boolean(), default=True, nullable=False),
        sa.Column('push_notifications', sa.Boolean(), default=True, nullable=False),
        sa.Column('default_ai_model', sa.String(50), default='gpt-4o', nullable=False),
        sa.Column('ai_response_style', sa.String(20), default='balanced', nullable=False),
        sa.Column('ai_creativity_level', sa.Integer(), default=5, nullable=False),
        sa.Column('enable_ai_suggestions', sa.Boolean(), default=True, nullable=False),
        sa.Column('profile_visibility', sa.String(20), default='organization', nullable=False),
        sa.Column('show_online_status', sa.Boolean(), default=True, nullable=False),
        sa.Column('allow_data_collection', sa.Boolean(), default=True, nullable=False),
        sa.Column('default_workflow_timeout', sa.Integer(), default=3600, nullable=False),
        sa.Column('auto_save_interval', sa.Integer(), default=300, nullable=False),
        sa.Column('enable_keyboard_shortcuts', sa.Boolean(), default=True, nullable=False),
        sa.Column('custom_settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Create organizations table
    op.create_table('organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('website', sa.String(200), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('address_line1', sa.String(200), nullable=True),
        sa.Column('address_line2', sa.String(200), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('postal_code', sa.String(20), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('timezone', sa.String(50), default='UTC', nullable=False),
        sa.Column('default_language', sa.String(10), default='en', nullable=False),
        sa.Column('status', sa.Enum('active', 'inactive', 'suspended', 'trial', name='organizationstatus'), default='trial', nullable=False),
        sa.Column('subscription_tier', sa.Enum('free', 'starter', 'professional', 'enterprise', name='subscriptiontier'), default='free', nullable=False),
        sa.Column('max_members', sa.Integer(), default=5, nullable=False),
        sa.Column('max_storage_gb', sa.Integer(), default=1, nullable=False),
        sa.Column('max_ai_requests_per_month', sa.Integer(), default=1000, nullable=False),
        sa.Column('current_members', sa.Integer(), default=0, nullable=False),
        sa.Column('current_storage_mb', sa.Integer(), default=0, nullable=False),
        sa.Column('ai_requests_this_month', sa.Integer(), default=0, nullable=False),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('tax_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('subscription_ends_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for organizations table
    op.create_index('idx_org_status', 'organizations', ['status'])
    op.create_index('idx_org_subscription', 'organizations', ['subscription_tier'])
    op.create_index('idx_org_created', 'organizations', ['created_at'])
    op.create_index('ix_organizations_slug', 'organizations', ['slug'])

    # Create organization_members table
    op.create_table('organization_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('owner', 'admin', 'manager', 'member', 'guest', name='organizationrole'), default='member', nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('invited_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('invitation_token', sa.String(100), nullable=True, unique=True),
        sa.Column('invitation_expires_at', sa.DateTime(), nullable=True),
        sa.Column('invitation_accepted_at', sa.DateTime(), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('left_at', sa.DateTime(), nullable=True),
    )
    
    # Create unique constraint and indexes for organization_members
    op.create_unique_constraint('uq_org_member', 'organization_members', ['organization_id', 'user_id'])
    op.create_index('idx_member_org', 'organization_members', ['organization_id'])
    op.create_index('idx_member_user', 'organization_members', ['user_id'])
    op.create_index('idx_member_role', 'organization_members', ['role'])
    op.create_index('idx_member_active', 'organization_members', ['is_active'])

    # Create chats table
    op.create_table('chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('chat_type', sa.Enum('direct', 'group', 'channel', name='chattype'), default='direct', nullable=False),
        sa.Column('ai_model', sa.String(50), nullable=True),
        sa.Column('ai_persona', sa.String(100), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('temperature', sa.Numeric(3, 2), default=0.7, nullable=False),
        sa.Column('max_tokens', sa.Integer(), default=2048, nullable=False),
        sa.Column('is_private', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_archived', sa.Boolean(), default=False, nullable=False),
        sa.Column('allow_file_uploads', sa.Boolean(), default=True, nullable=False),
        sa.Column('enable_ai_responses', sa.Boolean(), default=True, nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('chat_metadata', sa.JSON(), nullable=True),
        sa.Column('message_count', sa.Integer(), default=0, nullable=False),
        sa.Column('total_tokens_used', sa.Integer(), default=0, nullable=False),
        sa.Column('last_activity_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for chats table
    op.create_index('idx_chat_org_type', 'chats', ['organization_id', 'chat_type'])
    op.create_index('idx_chat_creator', 'chats', ['creator_id'])
    op.create_index('idx_chat_activity', 'chats', ['last_activity_at'])
    op.create_index('idx_chat_archived', 'chats', ['is_archived'])

    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reply_to_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id'), nullable=True),
        sa.Column('message_type', sa.Enum('user', 'ai', 'system', 'file', 'image', 'audio', name='messagetype'), default='user', nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('ai_model_used', sa.String(50), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('ai_confidence_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('status', sa.Enum('sent', 'delivered', 'read', 'failed', name='messagestatus'), default='sent', nullable=False),
        sa.Column('is_edited', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_deleted', sa.Boolean(), default=False, nullable=False),
        sa.Column('message_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for chat_messages table
    op.create_index('idx_message_chat_created', 'chat_messages', ['chat_id', 'created_at'])
    op.create_index('idx_message_sender', 'chat_messages', ['sender_id'])
    op.create_index('idx_message_type', 'chat_messages', ['message_type'])
    op.create_index('idx_message_status', 'chat_messages', ['status'])

    # Create chat_participants table
    op.create_table('chat_participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('owner', 'admin', 'member', 'viewer', name='participantrole'), default='member', nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_muted', sa.Boolean(), default=False, nullable=False),
        sa.Column('can_send_messages', sa.Boolean(), default=True, nullable=False),
        sa.Column('can_upload_files', sa.Boolean(), default=True, nullable=False),
        sa.Column('can_invite_others', sa.Boolean(), default=False, nullable=False),
        sa.Column('last_read_message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id'), nullable=True),
        sa.Column('last_read_at', sa.DateTime(), nullable=True),
        sa.Column('message_count', sa.Integer(), default=0, nullable=False),
        sa.Column('joined_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('left_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create unique index and other indexes for chat_participants
    op.create_index('idx_participant_chat_user', 'chat_participants', ['chat_id', 'user_id'], unique=True)
    op.create_index('idx_participant_role', 'chat_participants', ['role'])
    op.create_index('idx_participant_active', 'chat_participants', ['is_active'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('chat_participants')
    op.drop_table('chat_messages')
    op.drop_table('chats')
    op.drop_table('organization_members')
    op.drop_table('organizations')
    op.drop_table('user_preferences')
    op.drop_table('user_profiles')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS participantrole')
    op.execute('DROP TYPE IF EXISTS messagestatus')
    op.execute('DROP TYPE IF EXISTS messagetype')
    op.execute('DROP TYPE IF EXISTS chattype')
    op.execute('DROP TYPE IF EXISTS organizationrole')
    op.execute('DROP TYPE IF EXISTS subscriptiontier')
    op.execute('DROP TYPE IF EXISTS organizationstatus')
    op.execute('DROP TYPE IF EXISTS userstatus')
    op.execute('DROP TYPE IF EXISTS userrole')