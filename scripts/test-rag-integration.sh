#!/bin/bash

# RAG Integration Test Suite Runner
# AR-98: E2E Test Suite - RAG Integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Function to print colored output
print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check if Docker services are running
check_services() {
    print_header "Checking Services"
    
    services=("arketic-api-1" "arketic-postgres-1" "arketic-redis-1" "arketic-web-1" "arketic-langchain-1")
    all_running=true
    
    for service in "${services[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$service"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        print_error "Not all required services are running"
        print_info "Starting services with docker compose..."
        docker compose up -d
        sleep 10
    fi
}

# Run backend RAG integration tests
run_backend_tests() {
    print_header "Running Backend RAG Integration Tests"
    
    echo "Testing RAG Integration..."
    if docker exec arketic-api-1 python /app/tests/integration/test_rag.py; then
        print_success "RAG Integration tests passed"
        ((PASSED_TESTS++))
    else
        print_error "RAG Integration tests failed"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
    
    echo -e "\nTesting RAG Performance..."
    if docker exec arketic-api-1 python /app/tests/integration/test_rag_performance.py; then
        print_success "RAG Performance tests passed"
        ((PASSED_TESTS++))
    else
        print_error "RAG Performance tests failed"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Run Playwright E2E tests
run_playwright_tests() {
    print_header "Running Playwright E2E RAG Tests"
    
    cd apps/web
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "$HOME/.cache/ms-playwright" ]; then
        print_info "Installing Playwright browsers..."
        npx playwright install
    fi
    
    # RAG test files
    test_files=(
        "tests/playwright/rag/test_knowledge_rag_flow.spec.ts"
        "tests/playwright/rag/test_assistant_knowledge.spec.ts"
        "tests/playwright/rag/test_chat_rag_integration.spec.ts"
        "tests/playwright/rag/test_multifile_upload.spec.ts"
    )
    
    for test_file in "${test_files[@]}"; do
        test_name=$(basename "$test_file" .spec.ts)
        echo -e "\nRunning $test_name..."
        
        if npx playwright test "$test_file" --reporter=list; then
            print_success "$test_name passed"
            ((PASSED_TESTS++))
        else
            print_error "$test_name failed"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    done
    
    cd ../..
}

# Run specific test category
run_test_category() {
    case $1 in
        backend)
            run_backend_tests
            ;;
        frontend)
            run_playwright_tests
            ;;
        integration)
            run_backend_tests
            ;;
        performance)
            print_header "Running Performance Tests Only"
            docker exec arketic-api-1 python /app/tests/integration/test_rag_performance.py
            ;;
        *)
            print_error "Unknown test category: $1"
            exit 1
            ;;
    esac
}

# Generate test report
generate_report() {
    print_header "Test Report - AR-98 RAG Integration"
    
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    
    if [ $SKIPPED_TESTS -gt 0 ]; then
        echo -e "${YELLOW}Skipped: $SKIPPED_TESTS${NC}"
    fi
    
    if [ $FAILED_TESTS -eq 0 ]; then
        SUCCESS_RATE=100
    else
        SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "Success Rate: ${SUCCESS_RATE}%"
    
    # Create JSON report
    REPORT_FILE="test-reports/rag-integration-report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p test-reports
    
    cat > "$REPORT_FILE" <<EOF
{
    "test_suite": "RAG Integration Tests",
    "jira_ticket": "AR-98",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "summary": {
        "total": $TOTAL_TESTS,
        "passed": $PASSED_TESTS,
        "failed": $FAILED_TESTS,
        "skipped": $SKIPPED_TESTS,
        "success_rate": $SUCCESS_RATE
    }
}
EOF
    
    print_success "Report saved to $REPORT_FILE"
    
    # Update Jira if all tests pass
    if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
        print_success "All tests passed! ✅"
        
        # Optionally update Jira ticket
        if [ "$UPDATE_JIRA" = "true" ]; then
            print_info "Updating Jira ticket AR-98..."
            # Add Jira update logic here if needed
        fi
    else
        print_error "Some tests failed. Please review the failures."
        exit 1
    fi
}

# Main execution
main() {
    print_header "RAG Integration Test Suite - AR-98"
    
    # Parse arguments
    case "${1:-all}" in
        all)
            check_services
            run_backend_tests
            run_playwright_tests
            ;;
        backend)
            check_services
            run_test_category backend
            ;;
        frontend)
            check_services
            run_test_category frontend
            ;;
        performance)
            check_services
            run_test_category performance
            ;;
        quick)
            # Run only critical tests
            print_info "Running quick test suite..."
            check_services
            docker exec arketic-api-1 python /app/tests/integration/test_rag.py
            ;;
        help|--help|-h)
            echo "Usage: $0 [all|backend|frontend|performance|quick|help]"
            echo ""
            echo "Options:"
            echo "  all         - Run all tests (default)"
            echo "  backend     - Run only backend tests"
            echo "  frontend    - Run only frontend Playwright tests"
            echo "  performance - Run only performance tests"
            echo "  quick       - Run quick smoke tests"
            echo "  help        - Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
    
    # Generate report if tests were run
    if [ $TOTAL_TESTS -gt 0 ]; then
        generate_report
    fi
}

# Handle script interruption
trap 'print_error "Test execution interrupted"; exit 1' INT TERM

# Run main function
main "$@"