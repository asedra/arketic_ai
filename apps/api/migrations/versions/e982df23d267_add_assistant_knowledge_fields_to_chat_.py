"""Add assistant knowledge fields to chat model

Revision ID: e982df23d267
Revises: 32c808634fc0
Create Date: 2025-08-08 09:10:19.901185

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e982df23d267'
down_revision = '32c808634fc0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add knowledge fields to chats table
    op.add_column('chats', sa.Column('assistant_knowledge_bases', sa.JSON(), nullable=True))
    op.add_column('chats', sa.Column('assistant_documents', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Drop knowledge fields from chats table
    op.drop_column('chats', 'assistant_documents')
    op.drop_column('chats', 'assistant_knowledge_bases')