#!/bin/bash

# =============================================================================
# Arketic Platform - Production Deployment Script
# =============================================================================
# This script handles the complete deployment process for the Arketic platform
# Usage: ./scripts/deploy.sh [environment] [options]

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_HEALTH_CHECKS="${RUN_HEALTH_CHECKS:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handler
error_handler() {
    local line_no=$1
    log_error "Deployment failed at line $line_no"
    log_error "Rolling back changes..."
    rollback_deployment
    exit 1
}

trap 'error_handler $LINENO' ERR

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found. Are you in the project root?"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        log_warning ".env file not found. Copying from .env.example"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        log_warning "Please edit .env file with your configuration before continuing"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate environment configuration
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Source environment variables
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    
    # Check required variables
    local required_vars=(
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "DOMAIN"
        "ADMIN_EMAIL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate SECRET_KEY length
    if [[ ${#SECRET_KEY} -lt 32 ]]; then
        log_error "SECRET_KEY must be at least 32 characters long"
        exit 1
    fi
    
    # Check if OPENAI_API_KEY is set for AI features
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
        log_warning "OPENAI_API_KEY not set. AI features will be disabled"
    fi
    
    log_success "Environment validation passed"
}

# Function to backup existing data
backup_data() {
    if [[ "$BACKUP_BEFORE_DEPLOY" != "true" ]]; then
        log_info "Skipping backup (BACKUP_BEFORE_DEPLOY=false)"
        return
    fi
    
    log_info "Creating backup before deployment..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$PROJECT_ROOT/backups/pre_deploy_$backup_timestamp"
    
    mkdir -p "$backup_dir"
    
    # Backup database if running
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose exec -T postgres pg_dump -U arketic arketic_prod > "$backup_dir/database.sql"
        log_success "Database backup created"
    fi
    
    # Backup uploads directory
    if [[ -d "$PROJECT_ROOT/data/uploads" ]]; then
        log_info "Backing up uploads..."
        tar -czf "$backup_dir/uploads.tar.gz" -C "$PROJECT_ROOT/data" uploads/
        log_success "Uploads backup created"
    fi
    
    # Backup configuration
    cp "$PROJECT_ROOT/.env" "$backup_dir/.env.backup"
    
    echo "$backup_timestamp" > "$PROJECT_ROOT/.last_backup"
    log_success "Backup completed: $backup_dir"
}

# Function to pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    
    cd "$PROJECT_ROOT"
    docker-compose pull
    
    log_success "Images pulled successfully"
}

# Function to build custom images
build_images() {
    log_info "Building application images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    log_info "Building backend image..."
    docker-compose build backend
    
    # Build frontend image
    log_info "Building frontend image..."
    docker-compose build frontend
    
    log_success "Images built successfully"
}

# Function to stop services gracefully
stop_services() {
    log_info "Stopping services gracefully..."
    
    cd "$PROJECT_ROOT"
    
    # Stop application services first
    docker-compose stop frontend backend
    
    # Wait a moment for graceful shutdown
    sleep 5
    
    log_success "Services stopped"
}

# Function to start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    # Start infrastructure services first
    log_info "Starting infrastructure services..."
    docker-compose up -d postgres redis qdrant
    
    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    sleep 30
    
    # Check database health
    local retries=0
    local max_retries=30
    while ! docker-compose exec postgres pg_isready -U arketic >/dev/null 2>&1; do
        retries=$((retries + 1))
        if [[ $retries -ge $max_retries ]]; then
            log_error "Database failed to start after $max_retries attempts"
            exit 1
        fi
        log_info "Waiting for database... ($retries/$max_retries)"
        sleep 2
    done
    
    # Start application services
    log_info "Starting application services..."
    docker-compose up -d backend frontend
    
    # Start proxy
    log_info "Starting reverse proxy..."
    docker-compose up -d traefik
    
    log_success "All services started"
}

# Function to run database migrations
run_migrations() {
    if [[ "$RUN_MIGRATIONS" != "true" ]]; then
        log_info "Skipping migrations (RUN_MIGRATIONS=false)"
        return
    fi
    
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Wait for backend to be ready
    local retries=0
    local max_retries=30
    while ! docker-compose exec backend curl -f http://localhost:8000/health >/dev/null 2>&1; do
        retries=$((retries + 1))
        if [[ $retries -ge $max_retries ]]; then
            log_error "Backend failed to start after $max_retries attempts"
            exit 1
        fi
        log_info "Waiting for backend... ($retries/$max_retries)"
        sleep 2
    done
    
    # Run migrations
    docker-compose exec backend alembic upgrade head
    
    log_success "Database migrations completed"
}

# Function to run health checks
run_health_checks() {
    if [[ "$RUN_HEALTH_CHECKS" != "true" ]]; then
        log_info "Skipping health checks (RUN_HEALTH_CHECKS=false)"
        return
    fi
    
    log_info "Running health checks..."
    
    local services=(
        "postgres:5432"
        "redis:6379"
        "qdrant:6333"
        "backend:8000"
        "frontend:3000"
    )
    
    cd "$PROJECT_ROOT"
    
    for service in "${services[@]}"; do
        local service_name=$(echo "$service" | cut -d: -f1)
        local port=$(echo "$service" | cut -d: -f2)
        
        log_info "Checking $service_name..."
        
        local retries=0
        local max_retries=30
        while ! docker-compose exec "$service_name" nc -z localhost "$port" >/dev/null 2>&1; do
            retries=$((retries + 1))
            if [[ $retries -ge $max_retries ]]; then
                log_error "$service_name health check failed"
                exit 1
            fi
            sleep 2
        done
        
        log_success "$service_name is healthy"
    done
    
    # Test HTTP endpoints
    log_info "Testing HTTP endpoints..."
    
    # Wait for services to be fully ready
    sleep 10
    
    # Test backend health endpoint
    if docker-compose exec backend curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Backend health endpoint is responding"
    else
        log_error "Backend health endpoint failed"
        exit 1
    fi
    
    # Test API documentation
    if docker-compose exec backend curl -f http://localhost:8000/docs >/dev/null 2>&1; then
        log_success "API documentation is accessible"
    else
        log_warning "API documentation is not accessible (may be disabled in production)"
    fi
    
    log_success "All health checks passed"
}

# Function to cleanup old resources
cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Clean up old backups (keep last 10)
    if [[ -d "$PROJECT_ROOT/backups" ]]; then
        find "$PROJECT_ROOT/backups" -type d -name "pre_deploy_*" | sort -r | tail -n +11 | xargs rm -rf
    fi
    
    log_success "Cleanup completed"
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop current services
    docker-compose down
    
    # Check if we have a backup to restore
    if [[ -f "$PROJECT_ROOT/.last_backup" ]]; then
        local backup_timestamp=$(cat "$PROJECT_ROOT/.last_backup")
        local backup_dir="$PROJECT_ROOT/backups/pre_deploy_$backup_timestamp"
        
        if [[ -d "$backup_dir" ]]; then
            log_info "Restoring from backup: $backup_timestamp"
            
            # Restore environment
            if [[ -f "$backup_dir/.env.backup" ]]; then
                cp "$backup_dir/.env.backup" "$PROJECT_ROOT/.env"
            fi
            
            # Start infrastructure
            docker-compose up -d postgres redis
            sleep 10
            
            # Restore database
            if [[ -f "$backup_dir/database.sql" ]]; then
                docker-compose exec -T postgres psql -U arketic arketic_prod < "$backup_dir/database.sql"
            fi
            
            # Restore uploads
            if [[ -f "$backup_dir/uploads.tar.gz" ]]; then
                tar -xzf "$backup_dir/uploads.tar.gz" -C "$PROJECT_ROOT/data/"
            fi
            
            # Start services
            docker-compose up -d
            
            log_success "Rollback completed"
        else
            log_error "Backup directory not found: $backup_dir"
        fi
    else
        log_error "No backup information found"
    fi
}

# Function to display deployment summary
display_summary() {
    log_info "Deployment Summary"
    echo "==================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Services Status:"
    docker-compose ps
    echo ""
    echo "Access URLs:"
    
    # Source environment to get domain info
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    
    if [[ -n "${DOMAIN:-}" ]]; then
        echo "Web App: https://$DOMAIN"
        echo "API: https://api.$DOMAIN"
        echo "API Docs: https://api.$DOMAIN/docs"
        echo "Health Check: https://api.$DOMAIN/health"
    else
        echo "Web App: http://localhost:3000"
        echo "API: http://localhost:8000"
        echo "API Docs: http://localhost:8000/docs"
        echo "Health Check: http://localhost:8000/health"
    fi
    
    echo ""
    log_success "Deployment completed successfully!"
}

# Main deployment function
main() {
    log_info "Starting Arketic Platform deployment..."
    log_info "Environment: $ENVIRONMENT"
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    backup_data
    pull_images
    build_images
    stop_services
    start_services
    run_migrations
    run_health_checks
    cleanup_old_resources
    display_summary
    
    log_success "Deployment completed successfully!"
}

# Function to display help
show_help() {
    cat << EOF
Arketic Platform Deployment Script

Usage: $0 [environment] [options]

Arguments:
    environment     Deployment environment (default: production)

Environment Variables:
    BACKUP_BEFORE_DEPLOY    Create backup before deployment (default: true)
    RUN_MIGRATIONS         Run database migrations (default: true)
    RUN_HEALTH_CHECKS      Run health checks after deployment (default: true)

Examples:
    $0                      # Deploy to production with defaults
    $0 production           # Deploy to production
    $0 staging              # Deploy to staging environment
    
    # Deploy without backup
    BACKUP_BEFORE_DEPLOY=false $0
    
    # Deploy without migrations
    RUN_MIGRATIONS=false $0
    
Options:
    -h, --help             Show this help message
    --rollback             Rollback to last backup
    --status               Show current deployment status
    --logs                 Show service logs

Examples:
    $0 --help
    $0 --rollback
    $0 --status
    $0 --logs
EOF
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --rollback)
        rollback_deployment
        exit 0
        ;;
    --status)
        cd "$PROJECT_ROOT"
        docker-compose ps
        exit 0
        ;;
    --logs)
        cd "$PROJECT_ROOT"
        docker-compose logs -f
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac