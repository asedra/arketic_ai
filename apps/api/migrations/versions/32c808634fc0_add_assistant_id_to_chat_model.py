"""Add assistant_id to chat model

Revision ID: 32c808634fc0
Revises: 010
Create Date: 2025-08-08 08:45:12.832941

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '32c808634fc0'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add assistant_id column to chats table
    op.add_column('chats', sa.Column('assistant_id', sa.UUID(), nullable=True))
    
    # Create foreign key constraint
    op.create_foreign_key(
        'fk_chats_assistant_id', 
        'chats', 
        'assistants', 
        ['assistant_id'], 
        ['id'],
        ondelete='SET NULL'
    )
    
    # Create index for better query performance
    op.create_index('idx_chat_assistant', 'chats', ['assistant_id'])


def downgrade() -> None:
    # Drop index
    op.drop_index('idx_chat_assistant', table_name='chats')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_chats_assistant_id', 'chats', type_='foreignkey')
    
    # Drop column
    op.drop_column('chats', 'assistant_id')