"""AI Assistants tables

Revision ID: 006
Revises: 005
Create Date: 2025-08-07 23:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create assistants table
    op.create_table('assistants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('ai_model', sa.Enum(
            'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
            'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku',
            name='aimodel'
        ), default='gpt-4o', nullable=False),
        sa.Column('temperature', sa.Float(), default=0.7, nullable=False),
        sa.Column('max_tokens', sa.Integer(), default=2048, nullable=False),
        sa.Column('status', sa.Enum('active', 'inactive', 'draft', 'archived', name='assistantstatus'), default='active', nullable=False),
        sa.Column('is_public', sa.Boolean(), default=False, nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('total_conversations', sa.Integer(), default=0, nullable=False),
        sa.Column('total_messages', sa.Integer(), default=0, nullable=False),
        sa.Column('total_tokens_used', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('configuration', sa.JSON(), nullable=True),
    )
    
    # Create indexes for assistants table
    op.create_index('idx_assistant_creator_status', 'assistants', ['creator_id', 'status'])
    op.create_index('idx_assistant_model', 'assistants', ['ai_model'])
    op.create_index('idx_assistant_created_at', 'assistants', ['created_at'])
    op.create_index('idx_assistant_name', 'assistants', ['name'])
    op.create_index('idx_assistant_public_status', 'assistants', ['is_public', 'status'])

    # Create assistant_usage_logs table
    op.create_table('assistant_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('tokens_used', sa.Integer(), default=0, nullable=False),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('usage_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
    )
    
    # Create indexes for assistant_usage_logs
    op.create_index('idx_usage_assistant_date', 'assistant_usage_logs', ['assistant_id', 'created_at'])
    op.create_index('idx_usage_user_date', 'assistant_usage_logs', ['user_id', 'created_at'])
    op.create_index('idx_usage_action', 'assistant_usage_logs', ['action'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('assistant_usage_logs')
    op.drop_table('assistants')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS assistantstatus')
    op.execute('DROP TYPE IF EXISTS aimodel')