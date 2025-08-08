"""Add assistant knowledge association tables

Revision ID: 010
Revises: 009
Create Date: 2025-01-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create association tables for assistants and knowledge"""
    
    # Create assistant_knowledge_bases association table
    op.create_table(
        'assistant_knowledge_bases',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assistant_id', 'knowledge_base_id', name='unique_assistant_knowledge_base')
    )
    
    # Create indexes for assistant_knowledge_bases
    op.create_index('idx_assistant_kb_assistant', 'assistant_knowledge_bases', ['assistant_id'])
    op.create_index('idx_assistant_kb_knowledge', 'assistant_knowledge_bases', ['knowledge_base_id'])
    op.create_index('idx_assistant_kb_created', 'assistant_knowledge_bases', ['created_at'])
    
    # Create assistant_documents association table
    op.create_table(
        'assistant_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('assistant_id', 'document_id', name='unique_assistant_document')
    )
    
    # Create indexes for assistant_documents
    op.create_index('idx_assistant_doc_assistant', 'assistant_documents', ['assistant_id'])
    op.create_index('idx_assistant_doc_document', 'assistant_documents', ['document_id'])
    op.create_index('idx_assistant_doc_created', 'assistant_documents', ['created_at'])


def downgrade() -> None:
    """Drop association tables"""
    
    # Drop indexes for assistant_documents
    op.drop_index('idx_assistant_doc_created', table_name='assistant_documents')
    op.drop_index('idx_assistant_doc_document', table_name='assistant_documents')
    op.drop_index('idx_assistant_doc_assistant', table_name='assistant_documents')
    
    # Drop assistant_documents table
    op.drop_table('assistant_documents')
    
    # Drop indexes for assistant_knowledge_bases
    op.drop_index('idx_assistant_kb_created', table_name='assistant_knowledge_bases')
    op.drop_index('idx_assistant_kb_knowledge', table_name='assistant_knowledge_bases')
    op.drop_index('idx_assistant_kb_assistant', table_name='assistant_knowledge_bases')
    
    # Drop assistant_knowledge_bases table
    op.drop_table('assistant_knowledge_bases')