"""Knowledge management and vector search tables

Revision ID: 007
Revises: 006
Create Date: 2025-08-07 23:36:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector
import uuid

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create knowledge_bases table
    op.create_table('knowledge_bases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.Enum('documentation', 'faq', 'product', 'general', 'custom', name='knowledgebasetype'), default='general', nullable=False),
        sa.Column('is_public', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('embedding_model', sa.String(100), default='text-embedding-3-small', nullable=False),
        sa.Column('embedding_dimensions', sa.Integer(), default=1536, nullable=False),
        sa.Column('total_documents', sa.Integer(), default=0, nullable=False),
        sa.Column('total_chunks', sa.Integer(), default=0, nullable=False),
        sa.Column('total_tokens', sa.Integer(), default=0, nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for knowledge_bases
    op.create_index('idx_kb_creator', 'knowledge_bases', ['creator_id'])
    op.create_index('idx_kb_type', 'knowledge_bases', ['type'])
    op.create_index('idx_kb_active', 'knowledge_bases', ['is_active'])

    # Create knowledge_documents table
    op.create_table('knowledge_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('uploader_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('source_type', sa.Enum('file', 'url', 'text', 'api', name='documentsourcetype'), default='file', nullable=False),
        sa.Column('source_url', sa.String(1000), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('chunk_count', sa.Integer(), default=0, nullable=False),
        sa.Column('token_count', sa.Integer(), default=0, nullable=False),
        sa.Column('processing_status', sa.Enum('pending', 'processing', 'completed', 'failed', name='documentprocessingstatus'), default='pending', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes for knowledge_documents
    op.create_index('idx_doc_knowledge_base', 'knowledge_documents', ['knowledge_base_id'])
    op.create_index('idx_doc_uploader', 'knowledge_documents', ['uploader_id'])
    op.create_index('idx_doc_status', 'knowledge_documents', ['processing_status'])
    op.create_index('idx_doc_source_type', 'knowledge_documents', ['source_type'])
    op.create_index('idx_doc_file_hash', 'knowledge_documents', ['file_hash'])

    # Create knowledge_embeddings table with PgVector
    op.create_table('knowledge_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_size', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for knowledge_embeddings
    op.create_index('idx_emb_document', 'knowledge_embeddings', ['document_id'])
    op.create_index('idx_emb_knowledge_base', 'knowledge_embeddings', ['knowledge_base_id'])
    op.create_index('idx_emb_chunk', 'knowledge_embeddings', ['document_id', 'chunk_index'])
    op.create_index('idx_emb_created', 'knowledge_embeddings', ['created_at'])
    
    # Create HNSW index for vector search
    op.execute("""
        CREATE INDEX idx_embedding_vector_hnsw 
        ON knowledge_embeddings 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)
    
    # Create GIN index for metadata (jsonb supports gin, json doesn't)
    # op.create_index('idx_emb_metadata_gin', 'knowledge_embeddings', ['metadata'], postgresql_using='gin')

    # Create knowledge_search_history table
    op.create_table('knowledge_search_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('query_embedding', Vector(1536), nullable=True),
        sa.Column('results_count', sa.Integer(), default=0, nullable=False),
        sa.Column('top_score', sa.Numeric(5, 4), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('search_type', sa.Enum('semantic', 'keyword', 'hybrid', name='searchtype'), default='semantic', nullable=False),
        sa.Column('filters_applied', sa.JSON(), nullable=True),
        sa.Column('selected_result_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('feedback_rating', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
    )
    
    # Create indexes for knowledge_search_history
    op.create_index('idx_search_kb', 'knowledge_search_history', ['knowledge_base_id'])
    op.create_index('idx_search_user', 'knowledge_search_history', ['user_id'])
    op.create_index('idx_search_created', 'knowledge_search_history', ['created_at'])
    op.create_index('idx_search_type', 'knowledge_search_history', ['search_type'])

    # Create semantic_cache table
    op.create_table('semantic_cache',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('query_embedding', Vector(1536), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('hit_count', sa.Integer(), default=1, nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for semantic_cache
    op.create_index('idx_cache_expires', 'semantic_cache', ['expires_at'])
    op.create_index('idx_cache_accessed', 'semantic_cache', ['last_accessed_at'])
    
    # Create HNSW index for semantic cache
    op.execute("""
        CREATE INDEX idx_cache_query_vector_hnsw 
        ON semantic_cache 
        USING hnsw (query_embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # Create vector_performance_metrics table
    op.create_table('vector_performance_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('operation_type', sa.Enum('insert', 'search', 'update', 'delete', name='vectoroperationtype'), nullable=False),
        sa.Column('table_name', sa.String(100), nullable=False),
        sa.Column('batch_size', sa.Integer(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=False),
        sa.Column('vector_count', sa.Integer(), nullable=True),
        sa.Column('memory_usage_mb', sa.Numeric(10, 2), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
    )
    
    # Create indexes for vector_performance_metrics
    op.create_index('idx_perf_operation', 'vector_performance_metrics', ['operation_type'])
    op.create_index('idx_perf_table', 'vector_performance_metrics', ['table_name'])
    op.create_index('idx_perf_created', 'vector_performance_metrics', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('vector_performance_metrics')
    op.drop_table('semantic_cache')
    op.drop_table('knowledge_search_history')
    op.drop_table('knowledge_embeddings')
    op.drop_table('knowledge_documents')
    op.drop_table('knowledge_bases')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS vectoroperationtype')
    op.execute('DROP TYPE IF EXISTS searchtype')
    op.execute('DROP TYPE IF EXISTS documentprocessingstatus')
    op.execute('DROP TYPE IF EXISTS documentsourcetype')
    op.execute('DROP TYPE IF EXISTS knowledgebasetype')