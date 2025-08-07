"""Add assistants tables

Revision ID: 009
Revises: 008
Create Date: 2025-08-07 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008_add_forms_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create assistants table (using strings instead of enums to avoid conflicts)
    op.create_table('assistants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('ai_model', sa.String(50), default='gpt-4o', nullable=False),
        sa.Column('temperature', sa.Float(), default=0.7, nullable=False),
        sa.Column('max_tokens', sa.Integer(), default=2048, nullable=False),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('is_public', sa.Boolean(), default=False, nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
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
    
    # Create assistant_knowledge_bases junction table
    op.create_table('assistant_knowledge_bases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('assistant_id', 'knowledge_base_id', name='unique_assistant_knowledge_base')
    )
    
    # Create assistant_documents junction table
    op.create_table('assistant_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('assistant_id', 'document_id', name='unique_assistant_document')
    )
    
    # Create assistant_usage_logs table
    op.create_table('assistant_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('tokens_used', sa.Integer(), default=0, nullable=False),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
    )
    
    # Create indexes for usage logs table
    op.create_index('idx_usage_assistant_date', 'assistant_usage_logs', ['assistant_id', 'created_at'])
    op.create_index('idx_usage_user_date', 'assistant_usage_logs', ['user_id', 'created_at'])
    op.create_index('idx_usage_action', 'assistant_usage_logs', ['action'])
    
    # Add assistant_id column to chats table to link chats with assistants
    op.add_column('chats', sa.Column('assistant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True))
    op.create_index('idx_chat_assistant', 'chats', ['assistant_id'])


def downgrade() -> None:
    # Remove assistant_id column from chats table
    op.drop_index('idx_chat_assistant', table_name='chats')
    op.drop_column('chats', 'assistant_id')
    
    # Drop usage logs table and indexes
    op.drop_index('idx_usage_action', table_name='assistant_usage_logs')
    op.drop_index('idx_usage_user_date', table_name='assistant_usage_logs')
    op.drop_index('idx_usage_assistant_date', table_name='assistant_usage_logs')
    op.drop_table('assistant_usage_logs')
    
    # Drop junction tables
    op.drop_table('assistant_documents')
    op.drop_table('assistant_knowledge_bases')
    
    # Drop assistants table and indexes
    op.drop_index('idx_assistant_public_status', table_name='assistants')
    op.drop_index('idx_assistant_name', table_name='assistants')
    op.drop_index('idx_assistant_created_at', table_name='assistants')
    op.drop_index('idx_assistant_model', table_name='assistants')
    op.drop_index('idx_assistant_creator_status', table_name='assistants')
    op.drop_table('assistants')
    
    # Note: No enums to drop as we used strings instead