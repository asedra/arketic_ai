#!/bin/bash

# Arketic Development Docker Management Script
# This script provides easy commands for managing the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="arketic"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_OVERRIDE="docker-compose.override.yml"

# Helper functions
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

# Check if Docker and Docker Compose are available
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
}

# Build services
build() {
    log_info "Building Docker images..."
    docker-compose build --parallel
    log_success "Build completed successfully"
}

# Start services
up() {
    log_info "Starting development environment..."
    docker-compose up -d
    
    log_info "Waiting for services to be healthy..."
    sleep 5
    
    # Wait for health checks
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "unhealthy"; then
            log_warning "Some services are still starting... (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        else
            break
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Services failed to start within expected time"
        docker-compose ps
        exit 1
    fi
    
    log_success "Development environment is ready!"
    status
}

# Stop services
down() {
    log_info "Stopping development environment..."
    docker-compose down
    log_success "Development environment stopped"
}

# Restart services
restart() {
    log_info "Restarting development environment..."
    docker-compose restart
    log_success "Development environment restarted"
}

# Show status
status() {
    log_info "Service Status:"
    docker-compose ps
    
    echo ""
    log_info "Service URLs:"
    echo "  🌐 Frontend:    http://localhost:3000"
    echo "  🔧 API:         http://localhost:8000"
    echo "  🗄️  Database:    localhost:5432"
    echo "  🔴 Redis:       localhost:6379"
    echo "  🌐 Nginx:       http://localhost:80"
    
    echo ""
    log_info "Health Status:"
    docker-compose exec api python healthcheck.py 2>/dev/null || log_warning "API health check failed"
}

# Show logs
logs() {
    local service=$1
    if [ -z "$service" ]; then
        log_info "Showing logs for all services..."
        docker-compose logs -f --tail=100
    else
        log_info "Showing logs for $service..."
        docker-compose logs -f --tail=100 "$service"
    fi
}

# Clean up everything
clean() {
    log_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Cleaning up development environment..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        docker volume prune -f
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Reset environment (down, clean, build, up)
reset() {
    log_info "Resetting development environment..."
    down
    clean
    build
    up
}

# Execute command in service
exec_cmd() {
    local service=$1
    shift
    local cmd="$@"
    
    if [ -z "$service" ] || [ -z "$cmd" ]; then
        log_error "Usage: $0 exec <service> <command>"
        exit 1
    fi
    
    log_info "Executing '$cmd' in $service..."
    docker-compose exec "$service" $cmd
}

# Database management
db_migrate() {
    log_info "Running database migrations..."
    docker-compose exec api python -m alembic upgrade head
    log_success "Database migrations completed"
}

db_seed() {
    log_info "Seeding database with test data..."
    docker-compose exec api python scripts/seed_db.py
    log_success "Database seeded successfully"
}

# Show help
show_help() {
    echo "Arketic Development Docker Management"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build                 Build all Docker images"
    echo "  up                    Start the development environment"
    echo "  down                  Stop the development environment"
    echo "  restart               Restart all services"
    echo "  status                Show service status and URLs"
    echo "  logs [service]        Show logs (all services or specific service)"
    echo "  clean                 Remove all containers, volumes, and images"
    echo "  reset                 Complete reset (down, clean, build, up)"
    echo "  exec <service> <cmd>  Execute command in service container"
    echo "  db:migrate           Run database migrations"
    echo "  db:seed              Seed database with test data"
    echo "  help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up                    # Start development environment"
    echo "  $0 logs api              # Show API logs"
    echo "  $0 exec api bash         # Open bash in API container"
    echo "  $0 exec web npm install  # Install npm packages in web container"
}

# Main command handling
main() {
    check_dependencies
    
    case "${1:-help}" in
        build)
            build
            ;;
        up)
            up
            ;;
        down)
            down
            ;;
        restart)
            restart
            ;;
        status)
            status
            ;;
        logs)
            logs "$2"
            ;;
        clean)
            clean
            ;;
        reset)
            reset
            ;;
        exec)
            shift
            exec_cmd "$@"
            ;;
        db:migrate)
            db_migrate
            ;;
        db:seed)
            db_seed
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"