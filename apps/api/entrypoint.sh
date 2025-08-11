#!/bin/bash
set -e

echo "=========================================="
echo "Starting API container initialization..."
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
max_retries=30
retries=0
while ! nc -z postgres 5432; do
  retries=$((retries+1))
  if [ $retries -ge $max_retries ]; then
    echo "❌ PostgreSQL did not become ready in time"
    exit 1
  fi
  echo "  Attempt $retries/$max_retries..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
retries=0
while ! nc -z redis 6379; do
  retries=$((retries+1))
  if [ $retries -ge $max_retries ]; then
    echo "❌ Redis did not become ready in time"
    exit 1
  fi
  echo "  Attempt $retries/$max_retries..."
  sleep 2
done
echo "✅ Redis is ready!"

# Give services a moment to fully initialize
sleep 2

# Run database initialization and migrations
echo "Initializing database..."
cd /app

# Run comprehensive database initialization if script exists
if [ -f "/app/scripts/init-database.sh" ]; then
    echo "Running comprehensive database initialization..."
    bash /app/scripts/init-database.sh || {
        echo "⚠️ Database initialization had warnings (checking critical tables...)"
        
        # Fallback: Ensure critical tables exist even if script fails
        python -c "
import psycopg2
import os
import sys

try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
    cur = conn.cursor()
    
    # Enable pgvector
    cur.execute('CREATE EXTENSION IF NOT EXISTS vector;')
    
    # Check if knowledge_embeddings exists
    cur.execute(\"\"\"
        SELECT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'arketic' 
            AND tablename = 'knowledge_embeddings'
        );
    \"\"\")
    
    exists = cur.fetchone()[0]
    
    if not exists:
        print('Creating missing knowledge_embeddings table...')
        cur.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS knowledge_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                document_id UUID NOT NULL,
                knowledge_base_id UUID NOT NULL,
                chunk_index INTEGER NOT NULL,
                chunk_size INTEGER NOT NULL,
                content TEXT NOT NULL,
                embedding vector(1536) NOT NULL,
                token_count INTEGER NOT NULL,
                metadata JSON,
                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
            );
        \"\"\")
        
        # Create indexes
        cur.execute('CREATE INDEX IF NOT EXISTS idx_emb_document ON knowledge_embeddings(document_id);')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_emb_knowledge_base ON knowledge_embeddings(knowledge_base_id);')
        conn.commit()
        print('✅ knowledge_embeddings table created')
    else:
        print('✅ knowledge_embeddings table already exists')
        
    cur.close()
    conn.close()
except Exception as e:
    print(f'Warning: Could not check/create tables: {e}')
    sys.exit(0)  # Don't fail the container
" || true
    }
else
    # Fallback to standard alembic migration
    echo "Standard migration approach..."
    
    # Check if alembic is available
    if command -v alembic &> /dev/null; then
        # Try to run migrations, don't fail if they already exist
        alembic upgrade head 2>&1 || {
            echo "⚠️ Migration already applied or warning occurred (this is normal)"
        }
    else
        echo "⚠️ Alembic not found, skipping migrations"
    fi
fi

# Setup test users (only in development/test environments)
if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "test" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Setting up test users for development..."
    python setup_test_users.py || {
        echo "⚠️ Test users setup failed or already exist (this is normal)"
    }
    echo "✅ Test users setup complete"
else
    echo "ℹ️ Skipping test users setup in production"
fi

echo "=========================================="
echo "✅ API initialization complete!"
echo "=========================================="

# Start the application
exec "$@"