"""Settings and configuration tables

Revision ID: 008
Revises: 007
Create Date: 2025-08-07 23:37:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_settings table
    op.create_table('user_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('setting_key', sa.String(100), nullable=False),
        sa.Column('setting_value', sa.Text(), nullable=True),
        sa.Column('is_encrypted', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes and constraints for user_settings
    op.create_index('idx_user_settings_user_category', 'user_settings', ['user_id', 'category'])
    op.create_index('idx_user_settings_updated', 'user_settings', ['updated_at'])
    op.create_unique_constraint('uk_user_settings_key', 'user_settings', ['user_id', 'category', 'setting_key'])

    # Create openai_settings table
    op.create_table('openai_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('api_key_encrypted', sa.Text(), nullable=True),
        sa.Column('model', sa.String(50), default='gpt-3.5-turbo', nullable=False),
        sa.Column('max_tokens', sa.Integer(), default=1000, nullable=False),
        sa.Column('temperature', sa.Float(), default=0.7, nullable=False),
        sa.Column('total_requests', sa.Integer(), default=0, nullable=False),
        sa.Column('total_tokens_used', sa.Integer(), default=0, nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('is_connection_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('last_connection_test_at', sa.DateTime(), nullable=True),
        sa.Column('connection_test_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for openai_settings
    op.create_index('idx_openai_settings_user', 'openai_settings', ['user_id'])
    op.create_index('idx_openai_settings_updated', 'openai_settings', ['updated_at'])
    op.create_index('idx_openai_settings_last_used', 'openai_settings', ['last_used_at'])

    # Create platform_settings table
    op.create_table('platform_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('theme', sa.String(20), default='light', nullable=False),
        sa.Column('language', sa.String(10), default='en', nullable=False),
        sa.Column('timezone', sa.String(50), default='UTC', nullable=False),
        sa.Column('date_format', sa.String(20), default='YYYY-MM-DD', nullable=False),
        sa.Column('email_notifications', sa.Boolean(), default=True, nullable=False),
        sa.Column('push_notifications', sa.Boolean(), default=True, nullable=False),
        sa.Column('marketing_emails', sa.Boolean(), default=False, nullable=False),
        sa.Column('data_collection_consent', sa.Boolean(), default=True, nullable=False),
        sa.Column('analytics_consent', sa.Boolean(), default=True, nullable=False),
        sa.Column('beta_features_enabled', sa.Boolean(), default=False, nullable=False),
        sa.Column('advanced_mode', sa.Boolean(), default=False, nullable=False),
        sa.Column('custom_settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for platform_settings
    op.create_index('idx_platform_settings_user', 'platform_settings', ['user_id'])
    op.create_index('idx_platform_settings_updated', 'platform_settings', ['updated_at'])


    # Insert test user after all tables are created
    from datetime import datetime
    from passlib.context import CryptContext
    
    # Generate a UUID for the test user
    test_user_id = str(uuid.uuid4())
    
    # Create password context (same as the application uses)
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash('testpass123')
    
    # Insert test user into users table
    op.execute(f"""
        INSERT INTO users (
            id, 
            email, 
            username, 
            password_hash, 
            first_name, 
            last_name, 
            role, 
            status, 
            is_active, 
            is_verified,
            password_changed_at,
            failed_login_attempts,
            two_factor_enabled,
            created_at, 
            updated_at
        ) VALUES (
            '{test_user_id}',
            'test@arketic.com',
            'testuser',
            '{password_hash}',
            'Test',
            'User',
            'user',
            'active',
            true,
            true,
            NOW(),
            0,
            false,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING
    """)
    
    # Insert default profile for test user
    op.execute(f"""
        INSERT INTO user_profiles (
            id,
            user_id,
            bio,
            timezone,
            language,
            created_at,
            updated_at
        ) VALUES (
            '{str(uuid.uuid4())}',
            '{test_user_id}',
            'Test user profile',
            'UTC',
            'en',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING
    """)
    
    # Insert default preferences for test user
    op.execute(f"""
        INSERT INTO user_preferences (
            id,
            user_id,
            theme,
            sidebar_collapsed,
            notifications_enabled,
            email_notifications,
            push_notifications,
            default_ai_model,
            ai_response_style,
            ai_creativity_level,
            enable_ai_suggestions,
            profile_visibility,
            show_online_status,
            allow_data_collection,
            default_workflow_timeout,
            auto_save_interval,
            enable_keyboard_shortcuts,
            created_at,
            updated_at
        ) VALUES (
            '{str(uuid.uuid4())}',
            '{test_user_id}',
            'light',
            false,
            true,
            true,
            true,
            'gpt-3.5-turbo',
            'balanced',
            5,
            true,
            'public',
            true,
            true,
            300,
            30,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING
    """)


def downgrade() -> None:
    # Remove test user and related data
    op.execute("DELETE FROM users WHERE email = 'test@arketic.com'")
    
    # Drop tables in reverse order
    op.drop_table('platform_settings')
    op.drop_table('openai_settings')
    op.drop_table('user_settings')