#!/bin/bash

# Arketic Docker Development Environment Script
set -e

echo "🐳 Arketic Docker Development Environment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check dependencies
check_dependencies() {
    print_status "Checking Docker dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check for docker compose (v2) or docker-compose (v1)
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    print_success "Docker dependencies check passed"
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # Root environment
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    fi
    
    # Web environment for Docker
    cat > apps/web/.env.local << 'EOF'
# API Configuration for Docker
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development

# Docker-specific settings
DOCKER_ENV=true
WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true

# Next.js settings
NEXT_TELEMETRY_DISABLED=1

# Feature flags
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Development optimizations
FAST_REFRESH=true
EOF
    
    print_success "Updated apps/web/.env.local for Docker"
}

# Start services
start_services() {
    print_status "Starting Docker services..."
    
    # Stop any existing containers
    docker compose down --remove-orphans 2>/dev/null || true
    
    # Build and start services
    docker compose up --build -d
    
    print_success "Docker services started"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    # Wait for PostgreSQL
    print_status "⏳ Waiting for PostgreSQL..."
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U arketic -d arketic_dev &>/dev/null; then
            print_success "✅ PostgreSQL is ready"
            break
        fi
        sleep 2
        ((attempt++))
    done
    
    # Wait for Redis
    print_status "⏳ Waiting for Redis..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T redis redis-cli ping &>/dev/null; then
            print_success "✅ Redis is ready"
            break
        fi
        sleep 2
        ((attempt++))
    done
    
    # Wait for API
    print_status "⏳ Waiting for API..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:8000/health &>/dev/null; then
            print_success "✅ API is ready"
            break
        fi
        sleep 2
        ((attempt++))
    done
    
    # Wait for Web
    print_status "⏳ Waiting for Web frontend..."
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000/api/health &>/dev/null; then
            print_success "✅ Web frontend is ready"
            break
        fi
        sleep 2
        ((attempt++))
    done
}

# Show service status
show_status() {
    echo ""
    print_status "Docker container status:"
    docker compose ps
    
    echo ""
    print_success "🌐 Services are available at:"
    echo "  🌐 Frontend:    http://localhost:3000"
    echo "  🔧 Backend API: http://localhost:8000"
    echo "  📚 API Docs:    http://localhost:8000/docs"
    echo "  🗄️  PostgreSQL:  localhost:5432"
    echo "  🚀 Redis:       localhost:6379"
    
    echo ""
    print_status "💡 Useful commands:"
    echo "  📋 View all logs:      docker compose logs -f"
    echo "  📋 View web logs:      docker compose logs -f web"
    echo "  📋 View API logs:      docker compose logs -f api"
    echo "  🔄 Restart services:   docker compose restart"
    echo "  🛑 Stop services:      docker compose down"
    echo "  🧹 Clean everything:   $0 clean"
}

# Clean up function
cleanup() {
    print_status "Cleaning up Docker environment..."
    docker compose down --remove-orphans --volumes
    docker system prune -f
    print_success "Environment cleaned up"
}

# Main execution
main() {
    check_dependencies
    setup_env_files
    start_services
    wait_for_services
    show_status
    
    echo ""
    print_success "🎉 Docker development environment is ready!"
    echo ""
    print_status "Happy coding! 🚀"
}

# Handle script arguments
case "${1:-}" in
    "clean")
        cleanup
        ;;
    "logs")
        if [ -n "${2:-}" ]; then
            docker compose logs -f "$2"
        else
            docker compose logs -f
        fi
        ;;
    "restart")
        print_status "Restarting services..."
        docker compose restart
        wait_for_services
        show_status
        ;;
    "rebuild")
        print_status "Rebuilding services..."
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        wait_for_services
        show_status
        ;;
    "stop")
        print_status "Stopping services..."
        docker compose down
        print_success "Services stopped"
        ;;
    *)
        main
        ;;
esac