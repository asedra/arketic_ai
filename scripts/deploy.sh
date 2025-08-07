#!/bin/bash

# Arketic Enterprise Deployment Script
# This script handles both development and production deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
COMPOSE_FILE="docker-compose.yml"
BUILD_CACHE="--no-cache"
PULL_IMAGES="true"
BACKUP_DB="false"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENVIRONMENT    Set environment (development|production) [default: development]"
    echo "  -f, --file FILE          Docker compose file [default: docker-compose.yml]"
    echo "  --cache                  Use build cache [default: --no-cache]"
    echo "  --no-pull               Don't pull latest images"
    echo "  --backup                Backup database before deployment (production only)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy development environment"
    echo "  $0 -e production -f docker-compose.prod.yml --backup"
    echo "  $0 --env development --cache"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --cache)
            BUILD_CACHE=""
            shift
            ;;
        --no-pull)
            PULL_IMAGES="false"
            shift
            ;;
        --backup)
            BACKUP_DB="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set compose file based on environment if not explicitly set
if [[ "$ENVIRONMENT" == "production" && "$COMPOSE_FILE" == "docker-compose.yml" ]]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
    exit 1
fi

# Check if compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    print_error "Docker compose file not found: $COMPOSE_FILE"
    exit 1
fi

print_status "Starting Arketic deployment..."
print_status "Environment: $ENVIRONMENT"
print_status "Compose file: $COMPOSE_FILE"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed or not in PATH"
    exit 1
fi

# Load environment variables
if [[ -f ".env" ]]; then
    print_status "Loading environment variables from .env file"
    set -a
    source .env
    set +a
elif [[ "$ENVIRONMENT" == "production" ]]; then
    print_warning "No .env file found. Make sure all required environment variables are set."
fi

# Database backup for production
if [[ "$ENVIRONMENT" == "production" && "$BACKUP_DB" == "true" ]]; then
    print_status "Creating database backup..."
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/arketic_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-arketic}" "${POSTGRES_DB:-arketic}" > "$BACKUP_FILE" 2>/dev/null; then
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_warning "Database backup failed (database might not be running)"
    fi
fi

# Pull latest images
if [[ "$PULL_IMAGES" == "true" ]]; then
    print_status "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f "$COMPOSE_FILE" up --build $BUILD_CACHE -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
print_status "Checking service health..."
services=("postgres" "redis" "api" "web")

for service in "${services[@]}"; do
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy\|Up"; then
            print_success "$service is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            print_error "$service failed to become healthy"
            docker-compose -f "$COMPOSE_FILE" logs "$service"
            exit 1
        fi
        
        print_status "Waiting for $service to be healthy (attempt $attempt/$max_attempts)..."
        sleep 5
        ((attempt++))
    done
done

# Run database migrations (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    print_status "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec api python -m alembic upgrade head || print_warning "Migration failed or not configured"
fi

# Show deployment status
print_status "Deployment completed successfully!"
print_status "Service URLs:"

if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "  - Web Application: http://localhost:3000"
    echo "  - API Backend: http://localhost:8000"
    echo "  - API Documentation: http://localhost:8000/api/docs"
    echo "  - Database: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - Nginx: http://localhost"
else
    echo "  - Web Application: https://arketic.com"
    echo "  - API Backend: https://arketic.com/api"
    echo "  - Monitoring (Grafana): http://localhost:3001"
    echo "  - Metrics (Prometheus): http://localhost:9090"
fi

print_status "Useful commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
echo "  - Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  - Restart service: docker-compose -f $COMPOSE_FILE restart [service]"
echo "  - Scale service: docker-compose -f $COMPOSE_FILE up -d --scale api=3"

print_success "Arketic deployment completed successfully!"