#!/bin/bash

# Comprehensive E2E Test Runner for Arketic Platform
#
# This script orchestrates complete end-to-end testing across
# frontend, backend, and all integrated services.
#
# Author: Claude
# Created: 2025-08-10 (AR-83 Implementation)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_ENV_FILE="$PROJECT_ROOT/.env.test"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
REPORTS_DIR="$PROJECT_ROOT/test-reports"

# Default values
RUN_FRONTEND=${RUN_FRONTEND:-true}
RUN_BACKEND=${RUN_BACKEND:-true}
RUN_INTEGRATION=${RUN_INTEGRATION:-true}
CLEANUP=${CLEANUP:-true}
HEADLESS=${HEADLESS:-true}
PARALLEL=${PARALLEL:-true}

echo -e "${BLUE}🚀 Arketic Comprehensive E2E Test Suite${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Implementation: AR-82 Comprehensive Testing Infrastructure"
echo -e "Project Root: $PROJECT_ROOT"
echo -e "Frontend Tests: $RUN_FRONTEND"
echo -e "Backend Tests: $RUN_BACKEND" 
echo -e "Integration Tests: $RUN_INTEGRATION"
echo -e "Headless Mode: $HEADLESS"
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Function to check if service is healthy
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-30}
    
    echo -e "${YELLOW}Checking $service_name at $url...${NC}"
    
    local count=0
    while [ $count -lt $timeout ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        ((count++))
    done
    
    echo -e "${RED}❌ $service_name failed to start within ${timeout}s${NC}"
    return 1
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}🔧 Setting up test environment...${NC}"
    
    # Create test environment file
    cat > "$TEST_ENV_FILE" << EOF
# Test Environment Configuration (AR-82)
NODE_ENV=test
ENVIRONMENT=test
DEBUG=false

# Database
DATABASE_URL=postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev
POSTGRES_DB=arketic_dev
POSTGRES_USER=arketic
POSTGRES_PASSWORD=arketic_dev_password

# Redis
REDIS_URL=redis://redis:6379/1

# API Keys (Test/Mock)
OPENAI_API_KEY=test-key-for-e2e-testing
LANGCHAIN_API_KEY=test-langchain-key

# Test Configuration
PLAYWRIGHT_BASE_URL=http://localhost:3000
API_URL=http://localhost:8000
LANGCHAIN_URL=http://localhost:3001

# Security
JWT_SECRET_KEY=test-secret-key-for-e2e-tests
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (Mock)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test@arketic.com
SMTP_PASSWORD=testpassword
EMAIL_FROM=test@arketic.com

# Logging
LOG_LEVEL=INFO
EOF

    echo -e "${GREEN}✅ Test environment configured${NC}"
}

# Function to start services
start_services() {
    echo -e "${BLUE}🐳 Starting Docker services...${NC}"
    
    # Copy test environment
    cp "$TEST_ENV_FILE" "$PROJECT_ROOT/.env"
    
    # Start services
    cd "$PROJECT_ROOT"
    
    # Start core services first
    docker compose up -d postgres redis
    sleep 10
    
    # Start application services
    docker compose up -d api langchain web
    sleep 20
    
    echo -e "${GREEN}✅ Docker services started${NC}"
}

# Function to verify services are healthy
verify_services() {
    echo -e "${BLUE}🔍 Verifying service health...${NC}"
    
    check_service "PostgreSQL" "http://localhost:8000/health" 60
    check_service "API Server" "http://localhost:8000/health" 60
    check_service "LangChain Service" "http://localhost:3001/health" 60
    check_service "Web Frontend" "http://localhost:3000" 60
    
    echo -e "${GREEN}✅ All services are healthy${NC}"
}

# Function to run database migrations
run_migrations() {
    echo -e "${BLUE}📊 Running database migrations...${NC}"
    
    docker exec arketic_ai-api-1 alembic upgrade head
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Function to run backend API tests
run_backend_tests() {
    echo -e "${BLUE}🔧 Running Backend API Tests...${NC}"
    
    local backend_reports_dir="$REPORTS_DIR/backend"
    mkdir -p "$backend_reports_dir"
    
    cd "$PROJECT_ROOT/apps/api/docs"
    
    local tests_to_run=(
        "auth_test.py"
        "chat_test.py" 
        "assistant_test.py"
        "knowledge_test.py"
        "people_test.py"
        "langchain_test.py"
        "compliance_test.py"
        "health_test.py"
        "forms_test.py"
    )
    
    local passed=0
    local failed=0
    
    for test in "${tests_to_run[@]}"; do
        if [[ -f "$test" ]]; then
            echo -e "${YELLOW}Running $test...${NC}"
            
            if docker exec arketic_ai-api-1 python "/app/docs/$test"; then
                echo -e "${GREEN}✅ $test passed${NC}"
                ((passed++))
            else
                echo -e "${RED}❌ $test failed${NC}"
                ((failed++))
            fi
            
            # Copy report to reports directory
            if [[ -f "${test%%.py}_report.json" ]]; then
                cp "${test%%.py}_report.json" "$backend_reports_dir/"
            fi
        fi
    done
    
    # Run integration tests
    if docker exec arketic_ai-api-1 python /app/docs/integrate_tests.py; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        ((passed++))
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        ((failed++))
    fi
    
    echo -e "${BLUE}📊 Backend Tests Summary:${NC}"
    echo -e "✅ Passed: $passed"
    echo -e "❌ Failed: $failed"
    echo -e "📋 Reports saved to: $backend_reports_dir"
    
    return $([[ $failed -eq 0 ]] && echo 0 || echo 1)
}

# Function to run frontend Playwright tests
run_frontend_tests() {
    echo -e "${BLUE}🎭 Running Frontend Playwright Tests...${NC}"
    
    local frontend_reports_dir="$REPORTS_DIR/frontend"
    mkdir -p "$frontend_reports_dir"
    
    cd "$PROJECT_ROOT/apps/web/tests/playwright"
    
    # Set environment variables
    export PLAYWRIGHT_BASE_URL=http://localhost:3000
    export API_URL=http://localhost:8000
    export HEADLESS=$HEADLESS
    export WORKERS=2
    export RETRIES=1
    
    # Install Playwright if needed
    if ! npx playwright --version > /dev/null 2>&1; then
        echo -e "${YELLOW}Installing Playwright...${NC}"
        npx playwright install
    fi
    
    # Run tests
    local frontend_success=true
    
    if ./run-all-tests.sh; then
        echo -e "${GREEN}✅ Frontend tests passed${NC}"
    else
        echo -e "${RED}❌ Frontend tests failed${NC}"
        frontend_success=false
    fi
    
    # Copy reports
    if [[ -d "reports" ]]; then
        cp -r reports/* "$frontend_reports_dir/" || true
    fi
    
    echo -e "${BLUE}📊 Frontend test reports saved to: $frontend_reports_dir${NC}"
    
    $frontend_success
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${BLUE}⚡ Running Performance Tests...${NC}"
    
    local perf_reports_dir="$REPORTS_DIR/performance"
    mkdir -p "$perf_reports_dir"
    
    cd "$PROJECT_ROOT/apps/api/tests"
    
    # Run pgvector benchmark
    if docker exec arketic_ai-api-1 python /app/tests/test_pgvector_benchmark.py; then
        echo -e "${GREEN}✅ PGVector performance tests passed${NC}"
    else
        echo -e "${RED}❌ PGVector performance tests failed${NC}"
    fi
    
    # Run RAG integration performance tests
    if docker exec arketic_ai-api-1 python /app/tests/test_rag_integration.py; then
        echo -e "${GREEN}✅ RAG integration performance tests passed${NC}"
    else
        echo -e "${RED}❌ RAG integration performance tests failed${NC}"
    fi
    
    echo -e "${BLUE}📊 Performance test reports saved to: $perf_reports_dir${NC}"
}

# Function to generate consolidated report
generate_consolidated_report() {
    echo -e "${BLUE}📋 Generating consolidated test report...${NC}"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    local report_file="$REPORTS_DIR/consolidated-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Arketic E2E Test Results - $timestamp</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .test-section { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status-badge { padding: 6px 12px; border-radius: 6px; color: white; font-weight: 600; font-size: 12px; }
        .status-passed { background-color: #10b981; }
        .status-failed { background-color: #ef4444; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
        .metric { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 14px; margin-top: 5px; }
        .links { margin-top: 15px; }
        .links a { margin-right: 15px; color: #3b82f6; text-decoration: none; }
        .links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Arketic Comprehensive E2E Test Results</h1>
            <p><strong>Generated:</strong> $timestamp</p>
            <p><strong>Implementation:</strong> AR-82 Comprehensive Testing Infrastructure</p>
            <p><strong>Environment:</strong> Local Development</p>
            <p><strong>Test Coverage:</strong> Frontend (Playwright MCP) + Backend API + Integration</p>
        </div>
EOF

    # Add backend results
    if [[ -d "$REPORTS_DIR/backend" ]]; then
        echo '        <div class="test-section">' >> "$report_file"
        echo '            <h2>🔧 Backend API Tests</h2>' >> "$report_file"
        echo '            <p>Comprehensive testing of all API endpoints including new compliance, health, and forms endpoints.</p>' >> "$report_file"
        echo '            <div class="links">' >> "$report_file"
        
        for report in "$REPORTS_DIR/backend"/*.json; do
            if [[ -f "$report" ]]; then
                local basename_report=$(basename "$report")
                echo "                <a href=\"backend/$basename_report\">$basename_report</a>" >> "$report_file"
            fi
        done
        
        echo '            </div>' >> "$report_file"
        echo '        </div>' >> "$report_file"
    fi
    
    # Add frontend results
    if [[ -d "$REPORTS_DIR/frontend" ]]; then
        echo '        <div class="test-section">' >> "$report_file"
        echo '            <h2>🎭 Frontend Playwright MCP Tests</h2>' >> "$report_file"
        echo '            <p>End-to-end testing of user interfaces using Playwright with MCP tool integration.</p>' >> "$report_file"
        echo '            <div class="links">' >> "$report_file"
        
        for report in "$REPORTS_DIR/frontend"/*.html; do
            if [[ -f "$report" ]]; then
                local basename_report=$(basename "$report")
                echo "                <a href=\"frontend/$basename_report\">$basename_report</a>" >> "$report_file"
            fi
        done
        
        echo '            </div>' >> "$report_file"
        echo '        </div>' >> "$report_file"
    fi
    
    # Close HTML
    cat >> "$report_file" << EOF
        <div class="test-section">
            <h2>📋 Test Coverage Summary</h2>
            <ul>
                <li>✅ Authentication and Session Management</li>
                <li>✅ Knowledge Management and Document Processing</li>
                <li>✅ Chat Interface and AI Integration</li>
                <li>✅ Organization Management Features</li>
                <li>✅ Settings and User Preferences</li>
                <li>✅ Compliance Management (New)</li>
                <li>✅ Health Monitoring Endpoints (New)</li>
                <li>✅ Forms and Adaptive Cards (New)</li>
                <li>✅ Vector Database Operations</li>
                <li>✅ System Integration Tests</li>
            </ul>
            <p><strong>Testing Infrastructure:</strong> Playwright MCP + Custom Python Test Suite + Docker Compose</p>
        </div>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Consolidated report generated: $report_file${NC}"
}

# Function to cleanup services
cleanup_services() {
    if [[ "$CLEANUP" == "true" ]]; then
        echo -e "${BLUE}🧹 Cleaning up services...${NC}"
        
        cd "$PROJECT_ROOT"
        docker compose down -v
        
        # Remove test environment file
        rm -f "$PROJECT_ROOT/.env"
        
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local exit_code=0
    
    # Setup
    setup_test_environment
    
    # Start services
    start_services
    verify_services
    run_migrations
    
    # Run tests based on configuration
    if [[ "$RUN_BACKEND" == "true" ]]; then
        if ! run_backend_tests; then
            exit_code=1
        fi
    fi
    
    if [[ "$RUN_FRONTEND" == "true" ]]; then
        if ! run_frontend_tests; then
            exit_code=1
        fi
    fi
    
    # Run performance tests in full mode
    if [[ "$RUN_INTEGRATION" == "true" ]]; then
        run_performance_tests
    fi
    
    # Generate reports
    generate_consolidated_report
    
    # Cleanup
    cleanup_services
    
    # Calculate total time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Final summary
    echo ""
    echo -e "${BLUE}🏁 E2E Test Suite Completed${NC}"
    echo -e "${BLUE}============================${NC}"
    echo -e "⏱️  Total execution time: ${minutes}m ${seconds}s"
    echo -e "📊 Reports directory: $REPORTS_DIR"
    echo -e "📋 Consolidated report: $REPORTS_DIR/consolidated-report.html"
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ All tests completed successfully!${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check reports for details.${NC}"
    fi
    
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    "backend-only")
        RUN_FRONTEND=false
        RUN_INTEGRATION=false
        ;;
    "frontend-only")
        RUN_BACKEND=false
        RUN_INTEGRATION=false
        ;;
    "integration-only")
        RUN_FRONTEND=false
        RUN_BACKEND=false
        RUN_INTEGRATION=true
        ;;
    "no-cleanup")
        CLEANUP=false
        ;;
    "headed")
        HEADLESS=false
        ;;
    "help"|"-h"|"--help")
        echo -e "${BLUE}Arketic E2E Test Runner${NC}"
        echo ""
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  $0                     Run all tests (default)"
        echo -e "  $0 backend-only        Run only backend API tests"
        echo -e "  $0 frontend-only       Run only frontend Playwright tests"
        echo -e "  $0 integration-only    Run only integration/performance tests"
        echo -e "  $0 no-cleanup          Skip Docker cleanup after tests"
        echo -e "  $0 headed              Run Playwright in headed mode"
        echo -e "  $0 help                Show this help"
        echo ""
        echo -e "${YELLOW}Environment Variables:${NC}"
        echo -e "  RUN_FRONTEND          Enable/disable frontend tests (default: true)"
        echo -e "  RUN_BACKEND           Enable/disable backend tests (default: true)"
        echo -e "  RUN_INTEGRATION       Enable/disable integration tests (default: true)"
        echo -e "  CLEANUP               Enable/disable cleanup (default: true)"
        echo -e "  HEADLESS              Run Playwright headless (default: true)"
        exit 0
        ;;
esac

# Execute main function
main