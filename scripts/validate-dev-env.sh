#!/bin/bash

# Arketic Development Environment Validation Script
# This script validates that all services are properly configured and running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

# Check if service is running
check_service_running() {
    local service=$1
    local container_name="${PWD##*/}_${service}_1"
    
    if docker ps --format "table {{.Names}}" | grep -q "$service"; then
        log_success "$service container is running"
        return 0
    else
        log_error "$service container is not running"
        return 1
    fi
}

# Check service health
check_service_health() {
    local service=$1
    local health_status=$(docker-compose ps -q "$service" | xargs docker inspect --format "{{.State.Health.Status}}" 2>/dev/null || echo "no-healthcheck")
    
    case $health_status in
        "healthy")
            log_success "$service is healthy"
            return 0
            ;;
        "unhealthy")
            log_error "$service is unhealthy"
            return 1
            ;;
        "starting")
            log_warning "$service is still starting"
            return 1
            ;;
        "no-healthcheck")
            log_warning "$service has no health check configured"
            return 0
            ;;
        *)
            log_error "$service health status unknown: $health_status"
            return 1
            ;;
    esac
}

# Check HTTP endpoint
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$name endpoint is responding ($url)"
        return 0
    else
        log_error "$name endpoint is not responding - Status: $status_code ($url)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    local result=$(docker-compose exec -T postgres pg_isready -U arketic -d arketic_dev 2>/dev/null || echo "failed")
    
    if echo "$result" | grep -q "accepting connections"; then
        log_success "PostgreSQL database is accepting connections"
        return 0
    else
        log_error "PostgreSQL database is not accepting connections"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    local result=$(docker-compose exec -T redis redis-cli ping 2>/dev/null || echo "failed")
    
    if [ "$result" = "PONG" ]; then
        log_success "Redis is responding to ping"
        return 0
    else
        log_error "Redis is not responding to ping"
        return 1
    fi
}

# Check environment variables
check_environment_variables() {
    local required_vars=("POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD" "DATABASE_URL" "REDIS_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] && ! grep -q "^$var=" .env 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        log_success "All required environment variables are set"
        return 0
    else
        log_error "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
}

# Check Docker Compose files
check_compose_files() {
    local files=("docker-compose.yml" "docker-compose.override.yml")
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            # Check for version field (should be removed)
            if grep -q "^version:" "$file"; then
                log_warning "$file contains obsolete version field"
            else
                log_success "$file is properly formatted (no version field)"
            fi
            
            # Validate YAML syntax
            if docker-compose -f "$file" config >/dev/null 2>&1; then
                log_success "$file has valid YAML syntax"
            else
                log_error "$file has invalid YAML syntax"
            fi
        else
            if [ "$file" = "docker-compose.yml" ]; then
                log_error "$file is missing (required)"
            else
                log_warning "$file is missing (optional)"
            fi
        fi
    done
}

# Check Dockerfiles
check_dockerfiles() {
    local dockerfiles=("apps/api/Dockerfile" "apps/web/Dockerfile")
    
    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$dockerfile" ]; then
            log_success "$dockerfile exists"
            
            # Check for multi-stage build
            if grep -q "FROM.*AS" "$dockerfile"; then
                log_success "$dockerfile uses multi-stage build"
            else
                log_warning "$dockerfile does not use multi-stage build"
            fi
            
            # Check for health check
            if grep -q "HEALTHCHECK" "$dockerfile"; then
                log_success "$dockerfile includes health check"
            else
                log_warning "$dockerfile does not include health check"
            fi
        else
            log_error "$dockerfile is missing"
        fi
    done
}

# Check .dockerignore files
check_dockerignore() {
    local dockerignore_files=("apps/api/.dockerignore" "apps/web/.dockerignore")
    
    for ignore_file in "${dockerignore_files[@]}"; do
        if [ -f "$ignore_file" ]; then
            log_success "$ignore_file exists"
            
            # Check for common patterns
            local patterns=("node_modules" "__pycache__" ".git" "*.log")
            for pattern in "${patterns[@]}"; do
                if grep -q "$pattern" "$ignore_file"; then
                    log_success "$ignore_file includes $pattern pattern"
                else
                    log_warning "$ignore_file missing $pattern pattern"
                fi
            done
        else
            log_error "$ignore_file is missing"
        fi
    done
}

# Check volumes
check_volumes() {
    local volumes=$(docker volume ls --format "{{.Name}}" | grep "arketic" || true)
    
    if [ -n "$volumes" ]; then
        log_success "Docker volumes are created:"
        echo "$volumes" | while read -r volume; do
            echo "  - $volume"
        done
    else
        log_warning "No Docker volumes found (may be first run)"
    fi
}

# Main validation function
main() {
    echo "🔍 Arketic Development Environment Validation"
    echo "============================================="
    echo ""
    
    log_info "Checking Docker Compose configuration..."
    check_compose_files
    echo ""
    
    log_info "Checking Dockerfiles..."
    check_dockerfiles
    echo ""
    
    log_info "Checking .dockerignore files..."
    check_dockerignore
    echo ""
    
    log_info "Checking environment variables..."
    check_environment_variables
    echo ""
    
    log_info "Checking Docker volumes..."
    check_volumes
    echo ""
    
    log_info "Checking service containers..."
    local services=("postgres" "redis" "api" "web" "nginx")
    for service in "${services[@]}"; do
        check_service_running "$service"
    done
    echo ""
    
    log_info "Checking service health..."
    for service in "${services[@]}"; do
        check_service_health "$service"
    done
    echo ""
    
    log_info "Checking database connectivity..."
    check_database
    echo ""
    
    log_info "Checking Redis connectivity..."
    check_redis
    echo ""
    
    log_info "Checking HTTP endpoints..."
    check_http_endpoint "API Health" "http://localhost:8000/health"
    check_http_endpoint "Frontend" "http://localhost:3000"
    check_http_endpoint "Nginx Proxy" "http://localhost:80"
    echo ""
    
    # Summary
    echo "🎯 Validation Summary"
    echo "===================="
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "${GREEN}✅ Development environment is fully validated!${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Development environment is functional with warnings${NC}"
            exit 0
        fi
    else
        echo -e "${RED}❌ Development environment has issues that need attention${NC}"
        exit 1
    fi
}

# Run validation
main "$@"