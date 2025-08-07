#!/bin/bash

# Arketic Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
POSTGRES_USER="${POSTGRES_USER:-arketic}"
POSTGRES_DB="${POSTGRES_DB:-arketic_prod}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="arketic_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

print_status "Starting database backup..."
print_status "Database: $POSTGRES_DB"
print_status "User: $POSTGRES_USER"
print_status "Backup file: $BACKUP_PATH"

# Create the backup
if docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_PATH"; then
    print_success "Database backup created successfully"
    
    # Compress the backup
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"
    print_success "Backup compressed: $BACKUP_PATH"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    print_status "Backup size: $BACKUP_SIZE"
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" && -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        print_status "Uploading backup to S3..."
        if aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/database/$(basename "$BACKUP_PATH")"; then
            print_success "Backup uploaded to S3 successfully"
        else
            print_error "Failed to upload backup to S3"
        fi
    fi
    
else
    print_error "Database backup failed"
    exit 1
fi

# Clean up old backups
print_status "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "arketic_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
print_success "Old backups cleaned up"

# Clean up old S3 backups if configured
if [[ -n "$S3_BUCKET" && -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
    print_status "Cleaning up old S3 backups..."
    CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "database/" --query "Contents[?LastModified<'$CUTOFF_DATE'].Key" --output text | \
    while read -r key; do
        if [[ -n "$key" ]]; then
            aws s3 rm "s3://$S3_BUCKET/$key"
            print_status "Deleted old S3 backup: $key"
        fi
    done
    print_success "Old S3 backups cleaned up"
fi

print_success "Backup process completed successfully!"
print_status "Latest backup: $BACKUP_PATH"