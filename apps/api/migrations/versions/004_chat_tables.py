"""Chat and messaging tables

Revision ID: 004
Revises: 003
Create Date: 2025-08-07 23:33:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create chats table
    op.create_table('chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
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
    op.create_index('idx_chat_creator_type', 'chats', ['creator_id', 'chat_type'])
    op.create_index('idx_chat_creator', 'chats', ['creator_id'])
    op.create_index('idx_chat_activity', 'chats', ['last_activity_at', 'is_archived'])
    op.create_index('idx_chat_archived', 'chats', ['is_archived'])
    op.create_index('idx_chat_private', 'chats', ['is_private'])
    op.create_index('idx_chat_ai_model', 'chats', ['ai_model'])
    op.create_index('idx_chat_created_at', 'chats', ['created_at'])

    # Create chat_messages table
    op.create_table('chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chats.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reply_to_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id', ondelete='SET NULL'), nullable=True),
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
    op.create_index('idx_message_chat_created', 'chat_messages', ['chat_id', 'created_at', 'is_deleted'])
    op.create_index('idx_message_chat_type', 'chat_messages', ['chat_id', 'message_type'])
    op.create_index('idx_message_sender', 'chat_messages', ['sender_id', 'created_at'])
    op.create_index('idx_message_type', 'chat_messages', ['message_type'])
    op.create_index('idx_message_status', 'chat_messages', ['status'])
    op.create_index('idx_message_deleted', 'chat_messages', ['is_deleted'])
    op.create_index('idx_message_reply', 'chat_messages', ['reply_to_id'])
    op.create_index('idx_message_ai_model', 'chat_messages', ['ai_model_used'])

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
        sa.Column('last_read_message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('last_read_at', sa.DateTime(), nullable=True),
        sa.Column('message_count', sa.Integer(), default=0, nullable=False),
        sa.Column('joined_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('left_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for chat_participants
    op.create_index('idx_participant_chat_user', 'chat_participants', ['chat_id', 'user_id'], unique=True)
    op.create_index('idx_participant_chat_active', 'chat_participants', ['chat_id', 'is_active'])
    op.create_index('idx_participant_user_active', 'chat_participants', ['user_id', 'is_active'])
    op.create_index('idx_participant_role', 'chat_participants', ['role'])
    op.create_index('idx_participant_permissions', 'chat_participants', ['can_send_messages', 'can_upload_files'])
    op.create_index('idx_participant_joined', 'chat_participants', ['joined_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('chat_participants')
    op.drop_table('chat_messages')
    op.drop_table('chats')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS participantrole')
    op.execute('DROP TYPE IF EXISTS messagestatus')
    op.execute('DROP TYPE IF EXISTS messagetype')
    op.execute('DROP TYPE IF EXISTS chattype')