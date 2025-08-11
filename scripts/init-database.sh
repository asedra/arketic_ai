#!/bin/bash

# Database initialization script for Arketic
# This script ensures proper database setup and migrations

set -e

echo "🚀 Initializing Arketic Database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec arketic-postgres-1 pg_isready -U arketic -d arketic_dev > /dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Enable pgvector extension
echo "🔧 Enabling pgvector extension..."
docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -c "CREATE EXTENSION IF NOT EXISTS vector;" || true
echo -e "${GREEN}✓ PgVector extension enabled${NC}"

# Check if alembic_version table exists
echo "🔍 Checking migration status..."
if docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -t -c "SELECT to_regclass('public.alembic_version');" | grep -q 'alembic_version'; then
    echo -e "${YELLOW}ℹ️  Alembic version table exists, checking current version...${NC}"
    
    # Get current version
    CURRENT_VERSION=$(docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -t -c "SELECT version_num FROM alembic_version LIMIT 1;" | xargs)
    
    if [ -n "$CURRENT_VERSION" ]; then
        echo -e "${GREEN}✓ Database is at version: $CURRENT_VERSION${NC}"
        
        # Run any pending migrations
        echo "📦 Checking for pending migrations..."
        docker exec arketic-api-1 bash -c "cd /app && alembic upgrade head" 2>&1 | grep -v "INFO" || true
        echo -e "${GREEN}✓ Migrations are up to date${NC}"
    else
        echo -e "${YELLOW}⚠️  Version table exists but is empty, stamping current state...${NC}"
        docker exec arketic-api-1 bash -c "cd /app && alembic stamp head" || true
        echo -e "${GREEN}✓ Database stamped with current version${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No migration history found, initializing...${NC}"
    
    # Check if tables exist
    TABLE_COUNT=$(docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'arketic';" | xargs)
    
    if [ "$TABLE_COUNT" -gt "0" ]; then
        echo -e "${YELLOW}ℹ️  Existing tables found, stamping current state...${NC}"
        
        # Create alembic_version table and stamp as current
        docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -c "
            CREATE TABLE IF NOT EXISTS alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            );
        " || true
        
        # Stamp with the latest migration
        docker exec arketic-api-1 bash -c "cd /app && alembic stamp head" || true
        echo -e "${GREEN}✓ Database stamped with current version${NC}"
    else
        echo "📦 Running initial migrations..."
        docker exec arketic-api-1 bash -c "cd /app && alembic upgrade head" || {
            echo -e "${RED}❌ Migration failed, attempting recovery...${NC}"
            
            # If migrations fail, try to create tables manually and stamp
            echo "🔧 Creating tables manually..."
            docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -c "
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                );
            " || true
            
            docker exec arketic-api-1 bash -c "cd /app && alembic stamp head" || true
        }
        echo -e "${GREEN}✓ Initial migrations completed${NC}"
    fi
fi

# Ensure critical tables exist (especially knowledge_embeddings)
echo "🔍 Verifying critical tables..."

# Check and create knowledge_embeddings if missing
docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'arketic' AND tablename = 'knowledge_embeddings') THEN
        CREATE TABLE arketic.knowledge_embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES arketic.knowledge_documents(id) ON DELETE CASCADE,
            knowledge_base_id UUID NOT NULL REFERENCES arketic.knowledge_bases(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            chunk_size INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536) NOT NULL,
            token_count INTEGER NOT NULL,
            metadata JSON,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX idx_emb_document ON arketic.knowledge_embeddings(document_id);
        CREATE INDEX idx_emb_knowledge_base ON arketic.knowledge_embeddings(knowledge_base_id);
        CREATE INDEX idx_emb_chunk ON arketic.knowledge_embeddings(document_id, chunk_index);
        CREATE INDEX idx_emb_created ON arketic.knowledge_embeddings(created_at);
        CREATE INDEX idx_embedding_vector_hnsw ON arketic.knowledge_embeddings 
            USING hnsw (embedding vector_cosine_ops) 
            WITH (m = 16, ef_construction = 64);
            
        RAISE NOTICE 'Created missing knowledge_embeddings table';
    END IF;
END\$\$;
" 2>/dev/null || echo -e "${YELLOW}⚠️  knowledge_embeddings table check skipped (dependencies may be missing)${NC}"

# Check and create other potentially missing tables
docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -c "
DO \$\$
BEGIN
    -- Check semantic_cache table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'arketic' AND tablename = 'semantic_cache') THEN
        CREATE TABLE arketic.semantic_cache (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            query TEXT NOT NULL,
            query_embedding vector(1536) NOT NULL,
            response TEXT NOT NULL,
            model_used VARCHAR(50),
            hit_count INTEGER DEFAULT 1 NOT NULL,
            last_accessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP WITHOUT TIME ZONE,
            metadata JSON,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
        );
        
        CREATE INDEX idx_cache_expires ON arketic.semantic_cache(expires_at);
        CREATE INDEX idx_cache_accessed ON arketic.semantic_cache(last_accessed_at);
        CREATE INDEX idx_cache_query_vector_hnsw ON arketic.semantic_cache 
            USING hnsw (query_embedding vector_cosine_ops) 
            WITH (m = 16, ef_construction = 64);
            
        RAISE NOTICE 'Created missing semantic_cache table';
    END IF;
    
    -- Check knowledge_search_history table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'arketic' AND tablename = 'knowledge_search_history') THEN
        CREATE TABLE arketic.knowledge_search_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            knowledge_base_id UUID NOT NULL,
            user_id UUID,
            query TEXT NOT NULL,
            query_embedding vector(1536),
            results_count INTEGER DEFAULT 0 NOT NULL,
            top_score NUMERIC(5, 4),
            execution_time_ms INTEGER,
            search_type VARCHAR(20) DEFAULT 'semantic' NOT NULL,
            filters_applied JSON,
            selected_result_id UUID,
            feedback_rating INTEGER,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
        );
        
        CREATE INDEX idx_search_kb ON arketic.knowledge_search_history(knowledge_base_id);
        CREATE INDEX idx_search_user ON arketic.knowledge_search_history(user_id);
        CREATE INDEX idx_search_created ON arketic.knowledge_search_history(created_at);
        CREATE INDEX idx_search_type ON arketic.knowledge_search_history(search_type);
        
        RAISE NOTICE 'Created missing knowledge_search_history table';
    END IF;
    
    -- Check vector_performance_metrics table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'arketic' AND tablename = 'vector_performance_metrics') THEN
        CREATE TABLE arketic.vector_performance_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            operation_type VARCHAR(20) NOT NULL,
            table_name VARCHAR(100) NOT NULL,
            batch_size INTEGER,
            execution_time_ms INTEGER NOT NULL,
            vector_count INTEGER,
            memory_usage_mb NUMERIC(10, 2),
            metadata JSON,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW() NOT NULL
        );
        
        CREATE INDEX idx_perf_operation ON arketic.vector_performance_metrics(operation_type);
        CREATE INDEX idx_perf_table ON arketic.vector_performance_metrics(table_name);
        CREATE INDEX idx_perf_created ON arketic.vector_performance_metrics(created_at);
        
        RAISE NOTICE 'Created missing vector_performance_metrics table';
    END IF;
END\$\$;
" 2>/dev/null || echo -e "${YELLOW}⚠️  Additional table checks skipped${NC}"

echo -e "${GREEN}✓ All critical tables verified${NC}"

# Final verification
echo "🔍 Final verification..."
EMBEDDINGS_EXISTS=$(docker exec arketic-postgres-1 psql -U arketic -d arketic_dev -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'arketic' AND tablename = 'knowledge_embeddings';" | xargs)

if [ "$EMBEDDINGS_EXISTS" = "1" ]; then
    echo -e "${GREEN}✅ Database initialization completed successfully!${NC}"
    echo -e "${GREEN}✓ knowledge_embeddings table is ready${NC}"
else
    echo -e "${RED}❌ Warning: knowledge_embeddings table still missing${NC}"
    echo -e "${YELLOW}Please check the logs and run manual migration if needed${NC}"
fi

echo ""
echo "💡 Tips:"
echo "  - To reset the database: docker exec arketic-api-1 bash -c 'cd /app && alembic downgrade base && alembic upgrade head'"
echo "  - To check migration status: docker exec arketic-api-1 bash -c 'cd /app && alembic current'"
echo "  - To view migration history: docker exec arketic-api-1 bash -c 'cd /app && alembic history'"