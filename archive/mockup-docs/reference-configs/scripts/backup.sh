#!/bin/bash

# =============================================================================
# Arketic Platform - Backup Script
# =============================================================================
# This script creates backups of the Arketic platform data
# Usage: ./scripts/backup.sh [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/backup_$BACKUP_TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to backup database
backup_database() {
    log_info "Backing up database..."
    
    cd "$PROJECT_ROOT"
    
    # Check if postgres container is running
    if ! docker-compose ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create database backup
    docker-compose exec -T postgres pg_dump -U arketic arketic_prod > "$BACKUP_DIR/database.sql"
    
    # Compress the backup
    gzip "$BACKUP_DIR/database.sql"
    
    log_success "Database backup created: database.sql.gz"
}

# Function to backup uploads
backup_uploads() {
    log_info "Backing up uploads..."
    
    if [[ -d "$PROJECT_ROOT/data/uploads" ]]; then
        tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$PROJECT_ROOT/data" uploads/
        log_success "Uploads backup created: uploads.tar.gz"
    else
        log_warning "Uploads directory not found"
    fi
}

# Function to backup configuration
backup_configuration() {
    log_info "Backing up configuration..."
    
    # Backup environment file
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/.env.backup"
        log_success "Environment file backed up"
    fi
    
    # Backup docker-compose file
    cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml.backup"
    
    # Backup any custom configurations
    if [[ -d "$PROJECT_ROOT/config" ]]; then
        cp -r "$PROJECT_ROOT/config" "$BACKUP_DIR/config_backup"
        log_success "Configuration files backed up"
    fi
}

# Function to backup certificates
backup_certificates() {
    log_info "Backing up SSL certificates..."
    
    if [[ -d "$PROJECT_ROOT/data/letsencrypt" ]]; then
        tar -czf "$BACKUP_DIR/certificates.tar.gz" -C "$PROJECT_ROOT/data" letsencrypt/
        log_success "SSL certificates backed up"
    else
        log_warning "SSL certificates directory not found"
    fi
}

# Function to create backup metadata
create_metadata() {
    log_info "Creating backup metadata..."
    
    cat > "$BACKUP_DIR/metadata.json" << EOF
{
    "backup_timestamp": "$BACKUP_TIMESTAMP",
    "backup_date": "$(date -Iseconds)",
    "git_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
    "docker_compose_version": "$(docker-compose version --short 2>/dev/null || echo 'unknown')",
    "platform_version": "1.0.0",
    "backup_type": "full",
    "files": [
        "database.sql.gz",
        "uploads.tar.gz",
        "certificates.tar.gz",
        ".env.backup",
        "docker-compose.yml.backup"
    ]
}
EOF
    
    log_success "Backup metadata created"
}

# Function to upload backup to cloud storage (optional)
upload_to_cloud() {
    # Source environment variables
    set -a
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
    
    if [[ -n "${BACKUP_S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        log_info "Uploading backup to S3..."
        
        # Create archive
        tar -czf "$PROJECT_ROOT/backups/arketic_backup_$BACKUP_TIMESTAMP.tar.gz" -C "$BACKUP_DIR" .
        
        # Upload to S3
        aws s3 cp "$PROJECT_ROOT/backups/arketic_backup_$BACKUP_TIMESTAMP.tar.gz" \
            "s3://$BACKUP_S3_BUCKET/backups/arketic_backup_$BACKUP_TIMESTAMP.tar.gz"
        
        # Clean up local archive
        rm "$PROJECT_ROOT/backups/arketic_backup_$BACKUP_TIMESTAMP.tar.gz"
        
        log_success "Backup uploaded to S3"
    else
        log_info "Cloud backup not configured or AWS CLI not available"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Source environment variables for retention settings
    set -a
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
    
    local retention_days=${BACKUP_RETENTION_DAYS:-30}
    
    # Remove local backups older than retention period
    find "$PROJECT_ROOT/backups" -name "backup_*" -type d -mtime +$retention_days -exec rm -rf {} + 2>/dev/null || true
    
    log_success "Old backups cleaned up (retention: $retention_days days)"
}

# Function to verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    local errors=0
    
    # Check if database backup exists and is not empty
    if [[ -f "$BACKUP_DIR/database.sql.gz" ]]; then
        if [[ -s "$BACKUP_DIR/database.sql.gz" ]]; then
            # Test if gzip file is valid
            if gzip -t "$BACKUP_DIR/database.sql.gz"; then
                log_success "Database backup is valid"
            else
                log_error "Database backup is corrupted"
                errors=$((errors + 1))
            fi
        else
            log_error "Database backup is empty"
            errors=$((errors + 1))
        fi
    else
        log_error "Database backup file not found"
        errors=$((errors + 1))
    fi
    
    # Check uploads backup
    if [[ -f "$BACKUP_DIR/uploads.tar.gz" ]]; then
        if tar -tzf "$BACKUP_DIR/uploads.tar.gz" >/dev/null 2>&1; then
            log_success "Uploads backup is valid"
        else
            log_error "Uploads backup is corrupted"
            errors=$((errors + 1))
        fi
    fi
    
    # Check metadata
    if [[ -f "$BACKUP_DIR/metadata.json" ]]; then
        if python3 -m json.tool "$BACKUP_DIR/metadata.json" >/dev/null 2>&1; then
            log_success "Metadata is valid JSON"
        else
            log_error "Metadata is invalid JSON"
            errors=$((errors + 1))
        fi
    fi
    
    if [[ $errors -eq 0 ]]; then
        log_success "Backup verification passed"
        return 0
    else
        log_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# Function to display backup size
show_backup_size() {
    local size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log_info "Backup size: $size"
}

# Main backup function
main() {
    log_info "Starting Arketic Platform backup..."
    log_info "Backup timestamp: $BACKUP_TIMESTAMP"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Perform backup steps
    backup_database
    backup_uploads
    backup_configuration
    backup_certificates
    create_metadata
    
    # Verify backup
    if verify_backup; then
        show_backup_size
        upload_to_cloud
        cleanup_old_backups
        
        log_success "Backup completed successfully!"
        log_info "Backup location: $BACKUP_DIR"
    else
        log_error "Backup verification failed. Please check the backup manually."
        exit 1
    fi
}

# Function to show help
show_help() {
    cat << EOF
Arketic Platform Backup Script

Usage: $0 [options]

Options:
    -h, --help          Show this help message
    --database-only     Backup only database
    --uploads-only      Backup only uploads
    --config-only       Backup only configuration
    --no-cloud          Skip cloud upload
    --verify-only       Only verify existing backup

Examples:
    $0                  # Full backup
    $0 --database-only  # Database backup only
    $0 --no-cloud       # Skip cloud upload
EOF
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --database-only)
        log_info "Database-only backup mode"
        mkdir -p "$BACKUP_DIR"
        backup_database
        create_metadata
        verify_backup
        ;;
    --uploads-only)
        log_info "Uploads-only backup mode"
        mkdir -p "$BACKUP_DIR"
        backup_uploads
        create_metadata
        verify_backup
        ;;
    --config-only)
        log_info "Configuration-only backup mode"
        mkdir -p "$BACKUP_DIR"
        backup_configuration
        create_metadata
        verify_backup
        ;;
    --no-cloud)
        log_info "Backup without cloud upload"
        mkdir -p "$BACKUP_DIR"
        cd "$PROJECT_ROOT"
        backup_database
        backup_uploads
        backup_configuration
        backup_certificates
        create_metadata
        verify_backup
        show_backup_size
        cleanup_old_backups
        ;;
    --verify-only)
        if [[ -n "${2:-}" ]]; then
            BACKUP_DIR="$PROJECT_ROOT/backups/$2"
            if [[ -d "$BACKUP_DIR" ]]; then
                verify_backup
            else
                log_error "Backup directory not found: $BACKUP_DIR"
                exit 1
            fi
        else
            log_error "Please specify backup directory name"
            exit 1
        fi
        ;;
    *)
        main "$@"
        ;;
esac