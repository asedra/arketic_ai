"""Authentication and token management tables

Revision ID: 002
Revises: 001
Create Date: 2025-08-07 23:31:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_api_keys table
    op.create_table('user_api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('key_name', sa.String(100), nullable=False),
        sa.Column('encrypted_key', sa.LargeBinary(), nullable=False),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes and constraints for user_api_keys
    op.create_index('idx_user_api_key_provider', 'user_api_keys', ['user_id', 'provider'])
    op.create_index('idx_api_key_active', 'user_api_keys', ['is_active'])
    op.create_unique_constraint('unique_user_provider_key', 'user_api_keys', ['user_id', 'provider', 'key_name'])

    # Create refresh_tokens table
    op.create_table('refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), default=False, nullable=False),
        sa.Column('device_info', sa.String(200), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for refresh_tokens
    op.create_index('idx_refresh_token_user_active', 'refresh_tokens', ['user_id', 'is_revoked'])
    op.create_index('idx_refresh_token_expires', 'refresh_tokens', ['expires_at'])
    op.create_index('idx_refresh_token_hash', 'refresh_tokens', ['token_hash'])

    # Create password_reset_tokens table
    op.create_table('password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), default=False, nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for password_reset_tokens
    op.create_index('idx_password_reset_user', 'password_reset_tokens', ['user_id'])
    op.create_index('idx_password_reset_expires', 'password_reset_tokens', ['expires_at'])
    op.create_index('idx_password_reset_hash', 'password_reset_tokens', ['token_hash'])

    # Create email_verification_tokens table
    op.create_table('email_verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), default=False, nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for email_verification_tokens
    op.create_index('idx_email_verification_user', 'email_verification_tokens', ['user_id'])
    op.create_index('idx_email_verification_expires', 'email_verification_tokens', ['expires_at'])
    op.create_index('idx_email_verification_email', 'email_verification_tokens', ['email'])
    op.create_index('idx_email_verification_hash', 'email_verification_tokens', ['token_hash'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('email_verification_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_table('refresh_tokens')
    op.drop_table('user_api_keys')