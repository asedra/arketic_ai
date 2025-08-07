"""Add default user for development and testing

Revision ID: 009
Revises: 008
Create Date: 2025-08-07 23:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime
import uuid
from passlib.context import CryptContext

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def upgrade() -> None:
    # Create a connection and metadata
    connection = op.get_bind()
    
    # Default user details
    default_user_id = uuid.uuid4()
    email = "test@arketic.com"
    password = "testpass123"
    password_hash = pwd_context.hash(password)
    
    now = datetime.utcnow()
    
    # Check if user already exists
    result = connection.execute(
        sa.text("SELECT id FROM users WHERE email = :email"),
        {"email": email}
    )
    
    if result.fetchone() is None:
        # Insert default user
        connection.execute(
            sa.text("""
                INSERT INTO users (
                    id, email, username, password_hash, first_name, last_name,
                    role, status, is_verified, is_active, created_at, updated_at,
                    password_changed_at, failed_login_attempts, two_factor_enabled,
                    email_verified_at
                ) VALUES (
                    :id, :email, :username, :password_hash, :first_name, :last_name,
                    :role, :status, :is_verified, :is_active, :created_at, :updated_at,
                    :password_changed_at, :failed_login_attempts, :two_factor_enabled,
                    :email_verified_at
                )
            """),
            {
                "id": default_user_id,
                "email": email,
                "username": "test_user",
                "password_hash": password_hash,
                "first_name": "Test",
                "last_name": "User",
                "role": "user",
                "status": "active",
                "is_verified": True,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "password_changed_at": now,
                "failed_login_attempts": 0,
                "two_factor_enabled": False,
                "email_verified_at": now
            }
        )
        
        # Create user profile for the default user
        connection.execute(
            sa.text("""
                INSERT INTO user_profiles (
                    id, user_id, timezone, language, created_at, updated_at
                ) VALUES (
                    :profile_id, :user_id, :timezone, :language, :created_at, :updated_at
                )
            """),
            {
                "profile_id": uuid.uuid4(),
                "user_id": default_user_id,
                "timezone": "UTC",
                "language": "en",
                "created_at": now,
                "updated_at": now
            }
        )
        
        # Create user preferences for the default user
        connection.execute(
            sa.text("""
                INSERT INTO user_preferences (
                    id, user_id, theme, sidebar_collapsed, notifications_enabled,
                    email_notifications, push_notifications, default_ai_model,
                    ai_response_style, ai_creativity_level, enable_ai_suggestions,
                    profile_visibility, show_online_status, allow_data_collection,
                    default_workflow_timeout, auto_save_interval, enable_keyboard_shortcuts,
                    created_at, updated_at
                ) VALUES (
                    :prefs_id, :user_id, :theme, :sidebar_collapsed, :notifications_enabled,
                    :email_notifications, :push_notifications, :default_ai_model,
                    :ai_response_style, :ai_creativity_level, :enable_ai_suggestions,
                    :profile_visibility, :show_online_status, :allow_data_collection,
                    :default_workflow_timeout, :auto_save_interval, :enable_keyboard_shortcuts,
                    :created_at, :updated_at
                )
            """),
            {
                "prefs_id": uuid.uuid4(),
                "user_id": default_user_id,
                "theme": "light",
                "sidebar_collapsed": False,
                "notifications_enabled": True,
                "email_notifications": True,
                "push_notifications": True,
                "default_ai_model": "gpt-4o",
                "ai_response_style": "balanced",
                "ai_creativity_level": 5,
                "enable_ai_suggestions": True,
                "profile_visibility": "organization",
                "show_online_status": True,
                "allow_data_collection": True,
                "default_workflow_timeout": 3600,
                "auto_save_interval": 300,
                "enable_keyboard_shortcuts": True,
                "created_at": now,
                "updated_at": now
            }
        )
        
        print(f"✅ Default user created successfully:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   User ID: {default_user_id}")
    else:
        print(f"ℹ️  Default user with email {email} already exists, skipping...")


def downgrade() -> None:
    # Remove the default user and related data
    connection = op.get_bind()
    
    # Delete user and all related data will cascade
    connection.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": "test@arketic.com"}
    )
    
    print("🗑️  Default user removed")