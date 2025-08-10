"""Add SystemSettings table for configurable security settings

Revision ID: 011_add_system_settings
Revises: e982df23d267
Create Date: 2025-01-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '011_add_system_settings'
down_revision = 'e982df23d267'
branch_labels = None
depends_on = None


def upgrade():
    # Create system_settings table
    op.create_table('system_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        
        # Security Settings
        sa.Column('enable_account_lockout', sa.Boolean(), nullable=False, default=False),
        sa.Column('max_failed_login_attempts', sa.Integer(), nullable=False, default=5),
        sa.Column('lockout_duration_minutes', sa.Integer(), nullable=False, default=30),
        
        # Password Policy
        sa.Column('min_password_length', sa.Integer(), nullable=False, default=8),
        sa.Column('require_uppercase', sa.Boolean(), nullable=False, default=True),
        sa.Column('require_lowercase', sa.Boolean(), nullable=False, default=True),
        sa.Column('require_numbers', sa.Boolean(), nullable=False, default=True),
        sa.Column('require_special_chars', sa.Boolean(), nullable=False, default=False),
        sa.Column('password_expiry_days', sa.Integer(), nullable=True),
        
        # Session Settings
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=False, default=60),
        sa.Column('max_sessions_per_user', sa.Integer(), nullable=False, default=5),
        
        # Rate Limiting
        sa.Column('enable_rate_limiting', sa.Boolean(), nullable=False, default=True),
        sa.Column('rate_limit_requests_per_minute', sa.Integer(), nullable=False, default=60),
        
        # Two-Factor Authentication
        sa.Column('require_2fa_for_admins', sa.Boolean(), nullable=False, default=False),
        sa.Column('allow_2fa_for_users', sa.Boolean(), nullable=False, default=True),
        
        # Email Verification
        sa.Column('require_email_verification', sa.Boolean(), nullable=False, default=True),
        sa.Column('email_verification_expiry_hours', sa.Integer(), nullable=False, default=24),
        
        # IP Security
        sa.Column('enable_ip_whitelist', sa.Boolean(), nullable=False, default=False),
        sa.Column('ip_whitelist', sa.JSON(), nullable=True),
        sa.Column('enable_ip_blacklist', sa.Boolean(), nullable=False, default=False),
        sa.Column('ip_blacklist', sa.JSON(), nullable=True),
        
        # Audit Settings
        sa.Column('enable_audit_logging', sa.Boolean(), nullable=False, default=True),
        sa.Column('audit_retention_days', sa.Integer(), nullable=False, default=90),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    
    # Create index
    op.create_index('idx_system_settings_updated', 'system_settings', ['updated_at'])
    
    # Insert default system settings with lockout disabled by default
    op.execute("""
        INSERT INTO system_settings (
            id,
            enable_account_lockout,
            max_failed_login_attempts,
            lockout_duration_minutes,
            min_password_length,
            require_uppercase,
            require_lowercase,
            require_numbers,
            require_special_chars,
            password_expiry_days,
            session_timeout_minutes,
            max_sessions_per_user,
            enable_rate_limiting,
            rate_limit_requests_per_minute,
            require_2fa_for_admins,
            allow_2fa_for_users,
            require_email_verification,
            email_verification_expiry_hours,
            enable_ip_whitelist,
            ip_whitelist,
            enable_ip_blacklist,
            ip_blacklist,
            enable_audit_logging,
            audit_retention_days,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            FALSE,  -- Account lockout disabled by default
            5,
            30,
            8,
            TRUE,
            TRUE,
            TRUE,
            FALSE,
            NULL,
            60,
            5,
            TRUE,
            60,
            FALSE,
            TRUE,
            TRUE,
            24,
            FALSE,
            NULL,
            FALSE,
            NULL,
            TRUE,
            90,
            NOW(),
            NOW()
        )
    """)


def downgrade():
    # Drop index
    op.drop_index('idx_system_settings_updated', table_name='system_settings')
    
    # Drop table
    op.drop_table('system_settings')