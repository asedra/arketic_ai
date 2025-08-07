"""Add authentication token tables

Revision ID: 003_add_auth_tokens
Revises: 002
Create Date: 2024-08-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003_add_auth_tokens'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add authentication token tables"""
    
    # Create refresh_tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, default=False),
        sa.Column('device_info', sa.String(200), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token_hash')
    )
    
    # Create indexes for refresh_tokens
    op.create_index('idx_refresh_token_hash', 'refresh_tokens', ['token_hash'])
    op.create_index('idx_refresh_token_user_active', 'refresh_tokens', ['user_id', 'is_revoked'])
    op.create_index('idx_refresh_token_expires', 'refresh_tokens', ['expires_at'])
    
    # Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token_hash')
    )
    
    # Create indexes for password_reset_tokens
    op.create_index('idx_password_reset_token_hash', 'password_reset_tokens', ['token_hash'])
    op.create_index('idx_password_reset_user', 'password_reset_tokens', ['user_id'])
    op.create_index('idx_password_reset_expires', 'password_reset_tokens', ['expires_at'])
    
    # Create email_verification_tokens table
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token_hash')
    )
    
    # Create indexes for email_verification_tokens
    op.create_index('idx_email_verification_token_hash', 'email_verification_tokens', ['token_hash'])
    op.create_index('idx_email_verification_user', 'email_verification_tokens', ['user_id'])
    op.create_index('idx_email_verification_expires', 'email_verification_tokens', ['expires_at'])
    op.create_index('idx_email_verification_email', 'email_verification_tokens', ['email'])


def downgrade() -> None:
    """Drop authentication token tables"""
    
    # Drop indexes first
    op.drop_index('idx_email_verification_email', 'email_verification_tokens')
    op.drop_index('idx_email_verification_expires', 'email_verification_tokens')
    op.drop_index('idx_email_verification_user', 'email_verification_tokens')
    op.drop_index('idx_email_verification_token_hash', 'email_verification_tokens')
    
    op.drop_index('idx_password_reset_expires', 'password_reset_tokens')
    op.drop_index('idx_password_reset_user', 'password_reset_tokens')
    op.drop_index('idx_password_reset_token_hash', 'password_reset_tokens')
    
    op.drop_index('idx_refresh_token_expires', 'refresh_tokens')
    op.drop_index('idx_refresh_token_user_active', 'refresh_tokens')
    op.drop_index('idx_refresh_token_hash', 'refresh_tokens')
    
    # Drop tables
    op.drop_table('email_verification_tokens')
    op.drop_table('password_reset_tokens')
    op.drop_table('refresh_tokens')