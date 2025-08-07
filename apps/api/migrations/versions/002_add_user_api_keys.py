"""Add user_api_keys table for encrypted API key storage

Revision ID: 002
Revises: 001
Create Date: 2025-08-06 10:00:00.000000

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
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('key_name', sa.String(100), nullable=False),
        sa.Column('encrypted_key', sa.LargeBinary(), nullable=False),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        
        # Foreign key constraint
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        
        # Unique constraint for user + provider + key_name
        sa.UniqueConstraint('user_id', 'provider', 'key_name', name='unique_user_provider_key'),
    )
    
    # Create indexes for user_api_keys table
    op.create_index('idx_user_api_key_provider', 'user_api_keys', ['user_id', 'provider'])
    op.create_index('idx_api_key_active', 'user_api_keys', ['is_active'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_api_key_active', table_name='user_api_keys')
    op.drop_index('idx_user_api_key_provider', table_name='user_api_keys')
    
    # Drop table
    op.drop_table('user_api_keys')