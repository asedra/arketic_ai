"""Initial setup with PgVector and base tables

Revision ID: 001
Revises: 
Create Date: 2025-08-07 23:30:00.000000

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
    # Enable PgVector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Create enum types if they don't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
                CREATE TYPE userrole AS ENUM ('super_admin', 'admin', 'user', 'viewer');
            END IF;
        END$$;
    """)
    
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
                CREATE TYPE userstatus AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
            END IF;
        END$$;
    """)
    
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('username', sa.String(50), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('role', postgresql.ENUM('super_admin', 'admin', 'user', 'viewer', name='userrole', create_type=False), default='user', nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'suspended', 'pending_verification', name='userstatus', create_type=False), default='pending_verification', nullable=False),
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

    # Create organization enum types if they don't exist
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizationstatus') THEN
                CREATE TYPE organizationstatus AS ENUM ('active', 'inactive', 'suspended', 'trial');
            END IF;
        END$$;
    """)
    
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptiontier') THEN
                CREATE TYPE subscriptiontier AS ENUM ('free', 'starter', 'professional', 'enterprise');
            END IF;
        END$$;
    """)
    
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
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'suspended', 'trial', name='organizationstatus', create_type=False), default='trial', nullable=False),
        sa.Column('subscription_tier', postgresql.ENUM('free', 'starter', 'professional', 'enterprise', name='subscriptiontier', create_type=False), default='free', nullable=False),
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



def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('organizations')
    op.drop_table('user_preferences')
    op.drop_table('user_profiles')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS subscriptiontier')
    op.execute('DROP TYPE IF EXISTS organizationstatus')
    op.execute('DROP TYPE IF EXISTS userstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS vector')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')