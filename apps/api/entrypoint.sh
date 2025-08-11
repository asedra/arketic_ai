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

# Run database migrations
echo "Running database migrations..."
cd /app

# Check if alembic is available
if command -v alembic &> /dev/null; then
    # Try to run migrations, don't fail if they already exist
    alembic upgrade head 2>&1 || {
        echo "⚠️ Migration already applied or warning occurred (this is normal)"
    }
else
    echo "⚠️ Alembic not found, skipping migrations"
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