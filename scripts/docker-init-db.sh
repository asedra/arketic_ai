#!/bin/bash

# Docker initialization wrapper script
# This script is called from within the API container on startup

set -e

echo "🔍 Checking if database initialization is needed..."

# Check if AUTO_INIT_DB is set
if [ "$AUTO_INIT_DB" = "true" ]; then
    echo "🚀 AUTO_INIT_DB is enabled, running database initialization..."
    
    # Wait a bit for PostgreSQL to be fully ready
    sleep 3
    
    # Run the initialization script
    if [ -f "/app/scripts/init-database.sh" ]; then
        bash /app/scripts/init-database.sh
    else
        echo "⚠️  init-database.sh not found, skipping auto-initialization"
    fi
else
    echo "ℹ️  AUTO_INIT_DB is not enabled, skipping automatic initialization"
    echo "   To enable, set AUTO_INIT_DB=true in your environment"
fi

echo "✅ Database initialization check completed"