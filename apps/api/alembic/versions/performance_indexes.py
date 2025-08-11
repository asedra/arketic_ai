"""Add performance indexes for query optimization

Revision ID: performance_indexes_001
Revises: 
Create Date: 2025-01-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'performance_indexes_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Add indexes for frequently queried columns"""
    
    # Users table indexes
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_username', 'users', ['username'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    
    # Chat messages table indexes
    op.create_index('idx_chat_messages_chat_id', 'chat_messages', ['chat_id'])
    op.create_index('idx_chat_messages_user_id', 'chat_messages', ['user_id'])
    op.create_index('idx_chat_messages_created_at', 'chat_messages', ['created_at'])
    op.create_index('idx_chat_messages_chat_user', 'chat_messages', ['chat_id', 'user_id'])
    
    # Chats table indexes
    op.create_index('idx_chats_user_id', 'chats', ['user_id'])
    op.create_index('idx_chats_created_at', 'chats', ['created_at'])
    op.create_index('idx_chats_updated_at', 'chats', ['updated_at'])
    
    # Knowledge documents table indexes
    op.create_index('idx_knowledge_documents_user_id', 'knowledge_documents', ['user_id'])
    op.create_index('idx_knowledge_documents_created_at', 'knowledge_documents', ['created_at'])
    op.create_index('idx_knowledge_documents_file_type', 'knowledge_documents', ['file_type'])
    op.create_index('idx_knowledge_documents_status', 'knowledge_documents', ['status'])
    
    # Document embeddings table indexes (for pgvector)
    op.create_index('idx_document_embeddings_document_id', 'document_embeddings', ['document_id'])
    op.create_index('idx_document_embeddings_chunk_index', 'document_embeddings', ['chunk_index'])
    
    # Create a GiST index for vector similarity search (pgvector)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector 
        ON document_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    """)
    
    # Assistants table indexes
    op.create_index('idx_assistants_user_id', 'assistants', ['user_id'])
    op.create_index('idx_assistants_created_at', 'assistants', ['created_at'])
    op.create_index('idx_assistants_is_active', 'assistants', ['is_active'])
    
    # Assistant messages table indexes
    op.create_index('idx_assistant_messages_assistant_id', 'assistant_messages', ['assistant_id'])
    op.create_index('idx_assistant_messages_user_id', 'assistant_messages', ['user_id'])
    op.create_index('idx_assistant_messages_created_at', 'assistant_messages', ['created_at'])
    
    # People table indexes
    op.create_index('idx_people_user_id', 'people', ['user_id'])
    op.create_index('idx_people_created_at', 'people', ['created_at'])
    op.create_index('idx_people_email', 'people', ['email'])
    op.create_index('idx_people_organization_id', 'people', ['organization_id'])
    
    # Organizations table indexes  
    op.create_index('idx_organizations_created_at', 'organizations', ['created_at'])
    op.create_index('idx_organizations_name', 'organizations', ['name'])
    
    # Compliance records table indexes
    op.create_index('idx_compliance_records_organization_id', 'compliance_records', ['organization_id'])
    op.create_index('idx_compliance_records_created_at', 'compliance_records', ['created_at'])
    op.create_index('idx_compliance_records_status', 'compliance_records', ['status'])
    op.create_index('idx_compliance_records_compliance_type', 'compliance_records', ['compliance_type'])
    
    # Forms table indexes
    op.create_index('idx_forms_organization_id', 'forms', ['organization_id'])
    op.create_index('idx_forms_created_at', 'forms', ['created_at'])
    op.create_index('idx_forms_form_type', 'forms', ['form_type'])
    op.create_index('idx_forms_status', 'forms', ['status'])
    
    # User preferences table indexes
    op.create_index('idx_user_preferences_user_id', 'user_preferences', ['user_id'])
    
    # API keys table indexes
    op.create_index('idx_api_keys_user_id', 'api_keys', ['user_id'])
    op.create_index('idx_api_keys_key_hash', 'api_keys', ['key_hash'])
    op.create_index('idx_api_keys_is_active', 'api_keys', ['is_active'])
    
    print("Performance indexes created successfully")


def downgrade():
    """Remove performance indexes"""
    
    # Drop all indexes in reverse order
    op.drop_index('idx_api_keys_is_active', 'api_keys')
    op.drop_index('idx_api_keys_key_hash', 'api_keys')
    op.drop_index('idx_api_keys_user_id', 'api_keys')
    
    op.drop_index('idx_user_preferences_user_id', 'user_preferences')
    
    op.drop_index('idx_forms_status', 'forms')
    op.drop_index('idx_forms_form_type', 'forms')
    op.drop_index('idx_forms_created_at', 'forms')
    op.drop_index('idx_forms_organization_id', 'forms')
    
    op.drop_index('idx_compliance_records_compliance_type', 'compliance_records')
    op.drop_index('idx_compliance_records_status', 'compliance_records')
    op.drop_index('idx_compliance_records_created_at', 'compliance_records')
    op.drop_index('idx_compliance_records_organization_id', 'compliance_records')
    
    op.drop_index('idx_organizations_name', 'organizations')
    op.drop_index('idx_organizations_created_at', 'organizations')
    
    op.drop_index('idx_people_organization_id', 'people')
    op.drop_index('idx_people_email', 'people')
    op.drop_index('idx_people_created_at', 'people')
    op.drop_index('idx_people_user_id', 'people')
    
    op.drop_index('idx_assistant_messages_created_at', 'assistant_messages')
    op.drop_index('idx_assistant_messages_user_id', 'assistant_messages')
    op.drop_index('idx_assistant_messages_assistant_id', 'assistant_messages')
    
    op.drop_index('idx_assistants_is_active', 'assistants')
    op.drop_index('idx_assistants_created_at', 'assistants')
    op.drop_index('idx_assistants_user_id', 'assistants')
    
    # Drop pgvector index
    op.execute("DROP INDEX IF EXISTS idx_document_embeddings_vector;")
    
    op.drop_index('idx_document_embeddings_chunk_index', 'document_embeddings')
    op.drop_index('idx_document_embeddings_document_id', 'document_embeddings')
    
    op.drop_index('idx_knowledge_documents_status', 'knowledge_documents')
    op.drop_index('idx_knowledge_documents_file_type', 'knowledge_documents')
    op.drop_index('idx_knowledge_documents_created_at', 'knowledge_documents')
    op.drop_index('idx_knowledge_documents_user_id', 'knowledge_documents')
    
    op.drop_index('idx_chats_updated_at', 'chats')
    op.drop_index('idx_chats_created_at', 'chats')
    op.drop_index('idx_chats_user_id', 'chats')
    
    op.drop_index('idx_chat_messages_chat_user', 'chat_messages')
    op.drop_index('idx_chat_messages_created_at', 'chat_messages')
    op.drop_index('idx_chat_messages_user_id', 'chat_messages')
    op.drop_index('idx_chat_messages_chat_id', 'chat_messages')
    
    op.drop_index('idx_users_is_active', 'users')
    op.drop_index('idx_users_created_at', 'users')
    op.drop_index('idx_users_username', 'users')
    op.drop_index('idx_users_email', 'users')
    
    print("Performance indexes removed")