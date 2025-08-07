#!/bin/bash

# Arketic Database Restore Script
# This script restores the PostgreSQL database from a backup

set -e

# Configuration
BACKUP_FILE="$1"
POSTGRES_USER="${POSTGRES_USER:-arketic}"
POSTGRES_DB="${POSTGRES_DB:-arketic_prod}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_usage() {
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 arketic_backup_20240105_120000.sql.gz"
    echo "  $0 /path/to/backup.sql"
    echo ""
    echo "Available backups:"
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -la "$BACKUP_DIR"/arketic_backup_*.sql* 2>/dev/null || echo "  No backups found in $BACKUP_DIR"
    else
        echo "  Backup directory not found: $BACKUP_DIR"
    fi
}

# Check if backup file is provided
if [[ -z "$BACKUP_FILE" ]]; then
    print_error "Backup file not specified"
    show_usage
    exit 1
fi

# If backup file doesn't contain path, look in backup directory
if [[ "$BACKUP_FILE" != */* ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# Check if backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    print_error "Backup file not found: $BACKUP_FILE"
    show_usage
    exit 1
fi

print_status "Starting database restore..."
print_status "Database: $POSTGRES_DB"
print_status "User: $POSTGRES_USER"
print_status "Backup file: $BACKUP_FILE"

# Confirm restoration
print_warning "This will REPLACE all data in the database: $POSTGRES_DB"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_status "Restore cancelled"
    exit 0
fi

# Stop the application containers to prevent connections during restore
print_status "Stopping application containers..."
docker-compose stop api web

# Drop existing connections
print_status "Terminating existing database connections..."
docker-compose exec postgres psql -U "$POSTGRES_USER" -d postgres -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
"

# Drop and recreate database
print_status "Recreating database..."
docker-compose exec postgres psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker-compose exec postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DB;"

# Restore the backup
print_status "Restoring backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    # Decompress and restore
    if gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
        print_success "Database restored successfully from compressed backup"
    else
        print_error "Database restore failed"
        exit 1
    fi
else
    # Restore directly
    if docker-compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"; then
        print_success "Database restored successfully"
    else
        print_error "Database restore failed"
        exit 1
    fi
fi

# Run database migrations if available
print_status "Running database migrations..."
if docker-compose run --rm api python -m alembic upgrade head; then
    print_success "Database migrations completed"
else
    print_warning "Database migrations failed or not configured"
fi

# Restart application containers
print_status "Starting application containers..."
docker-compose start api web

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 10

# Verify restore
print_status "Verifying restore..."
if docker-compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"; then
    print_success "Database tables verified"
else
    print_error "Database verification failed"
    exit 1
fi

print_success "Database restore completed successfully!"
print_status "Application should be available shortly"