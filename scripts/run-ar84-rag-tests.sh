#!/bin/bash

# AR-84 RAG Integration Test Suite Runner
# Comprehensive test execution script for RAG integration features
# 
# Author: Claude
# Created: 2025-08-10 (AR-84 Implementation)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"
WEB_DIR="$PROJECT_ROOT/apps/web"
DOCS_DIR="$API_DIR/docs"

# Test configuration
DEFAULT_API_URL="http://localhost:8000"
DEFAULT_WEB_URL="http://localhost:3000"
TIMEOUT=30
RETRY_COUNT=3

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ️  ${message}${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "HEADER")
            echo -e "${BLUE}$message${NC}"
            echo -e "${BLUE}$(printf '=%.0s' {1..80})${NC}"
            ;;
    esac
}

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    local attempt=1

    print_status "INFO" "Checking $name service at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url/health" > /dev/null 2>&1; then
            print_status "SUCCESS" "$name service is running"
            return 0
        fi
        
        print_status "WARNING" "$name service not ready (attempt $attempt/$max_attempts)"
        sleep 3
        ((attempt++))
    done
    
    print_status "ERROR" "$name service is not responding after $max_attempts attempts"
    return 1
}

# Function to run backend RAG integration tests
run_backend_rag_tests() {
    print_status "HEADER" "🧪 Running Backend RAG Integration Tests"
    
    cd "$DOCS_DIR"
    
    # Check if API service is running
    if ! check_service "$DEFAULT_API_URL" "API"; then
        print_status "ERROR" "API service is not running. Please start it first."
        return 1
    fi
    
    print_status "INFO" "Starting RAG integration tests..."
    
    # Run RAG integration tests
    if python3 rag_integration_test.py; then
        print_status "SUCCESS" "RAG integration tests completed"
        
        # Check if report was generated
        if [ -f "rag_integration_test_report.json" ]; then
            local success_rate=$(python3 -c "
import json
try:
    with open('rag_integration_test_report.json', 'r') as f:
        data = json.load(f)
    print(data['test_metadata']['success_rate_percent'])
except:
    print('0')
")
            print_status "SUCCESS" "RAG integration success rate: ${success_rate}%"
            
            if (( $(echo "$success_rate >= 90" | bc -l) )); then
                print_status "SUCCESS" "RAG integration tests meet production criteria (≥90%)"
            else
                print_status "WARNING" "RAG integration tests below production criteria (<90%)"
            fi
        else
            print_status "WARNING" "RAG integration test report not generated"
        fi
    else
        print_status "ERROR" "RAG integration tests failed"
        return 1
    fi
    
    return 0
}

# Function to run isolated endpoint tests
run_isolated_endpoint_tests() {
    print_status "HEADER" "🔬 Running Isolated New Endpoint Tests"
    
    cd "$DOCS_DIR"
    
    # Check if API service is running
    if ! check_service "$DEFAULT_API_URL" "API"; then
        print_status "ERROR" "API service is not running. Please start it first."
        return 1
    fi
    
    print_status "INFO" "Starting isolated endpoint tests..."
    
    # Run isolated endpoint tests
    if python3 isolated_endpoint_test.py; then
        print_status "SUCCESS" "Isolated endpoint tests completed"
        
        # Check if report was generated
        if [ -f "isolated_endpoint_test_report.json" ]; then
            local readiness_rate=$(python3 -c "
import json
try:
    with open('isolated_endpoint_test_report.json', 'r') as f:
        data = json.load(f)
    print(data['test_metadata']['integration_readiness_rate'])
except:
    print('0')
")
            print_status "SUCCESS" "Integration readiness rate: ${readiness_rate}%"
            
            # Show ready endpoints
            local ready_endpoints=$(python3 -c "
import json
try:
    with open('isolated_endpoint_test_report.json', 'r') as f:
        data = json.load(f)
    ready = data['integration_summary']['ready_for_integration']
    print(', '.join(ready) if ready else 'None')
except:
    print('None')
")
            print_status "INFO" "Ready endpoints: $ready_endpoints"
            
            if (( $(echo "$readiness_rate >= 80" | bc -l) )); then
                print_status "SUCCESS" "Endpoints meet integration criteria (≥80%)"
            else
                print_status "WARNING" "Endpoints below integration criteria (<80%)"
            fi
        else
            print_status "WARNING" "Isolated endpoint test report not generated"
        fi
    else
        print_status "ERROR" "Isolated endpoint tests failed"
        return 1
    fi
    
    return 0
}

# Function to run frontend Playwright tests
run_frontend_rag_tests() {
    print_status "HEADER" "🎭 Running Frontend RAG Playwright Tests"
    
    cd "$WEB_DIR"
    
    # Check if both services are running
    if ! check_service "$DEFAULT_API_URL" "API" || ! check_service "$DEFAULT_WEB_URL" "Web"; then
        print_status "ERROR" "Required services are not running. Please start API and Web services."
        return 1
    fi
    
    print_status "INFO" "Starting Playwright RAG tests..."
    
    # Check if Playwright is installed
    if ! npm list @playwright/test > /dev/null 2>&1; then
        print_status "WARNING" "Playwright not installed. Installing..."
        npm install
    fi
    
    # Install Playwright browsers if needed
    if ! npx playwright --version > /dev/null 2>&1; then
        print_status "INFO" "Installing Playwright browsers..."
        npx playwright install --with-deps chromium
    fi
    
    # Run RAG-specific Playwright tests
    local test_exit_code=0
    
    print_status "INFO" "Running RAG integration E2E tests..."
    if npx playwright test tests/playwright/chat/rag-integration.spec.ts --reporter=json,html; then
        print_status "SUCCESS" "RAG chat integration tests passed"
    else
        print_status "ERROR" "RAG chat integration tests failed"
        test_exit_code=1
    fi
    
    print_status "INFO" "Running knowledge RAG E2E tests..."
    if npx playwright test tests/playwright/knowledge/knowledge-rag.spec.ts --reporter=json,html; then
        print_status "SUCCESS" "Knowledge RAG tests passed"
    else
        print_status "ERROR" "Knowledge RAG tests failed"
        test_exit_code=1
    fi
    
    # Generate test summary if reports exist
    if [ -f "test-results.json" ]; then
        local total_tests=$(python3 -c "
import json
try:
    with open('test-results.json', 'r') as f:
        data = json.load(f)
    suites = data.get('suites', [])
    total = sum(len(suite.get('specs', [])) for suite in suites)
    print(total)
except:
    print('0')
")
        local passed_tests=$(python3 -c "
import json
try:
    with open('test-results.json', 'r') as f:
        data = json.load(f)
    passed = 0
    for suite in data.get('suites', []):
        for spec in suite.get('specs', []):
            for test in spec.get('tests', []):
                for result in test.get('results', []):
                    if result.get('status') == 'passed':
                        passed += 1
    print(passed)
except:
    print('0')
")
        
        if [ "$total_tests" -gt 0 ]; then
            local success_rate=$((passed_tests * 100 / total_tests))
            print_status "SUCCESS" "Frontend RAG tests: $passed_tests/$total_tests passed (${success_rate}%)"
        fi
    fi
    
    return $test_exit_code
}

# Function to generate consolidated report
generate_consolidated_report() {
    print_status "HEADER" "📊 Generating Consolidated Test Report"
    
    local report_file="$PROJECT_ROOT/ar84_rag_test_summary.json"
    
    python3 << EOF
import json
import os
from datetime import datetime

def safe_load_json(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except:
        return {}

# Load test results
backend_results = safe_load_json('$DOCS_DIR/rag_integration_test_report.json')
isolated_results = safe_load_json('$DOCS_DIR/isolated_endpoint_test_report.json')

# Create consolidated report
consolidated = {
    "test_suite": "AR-84 RAG Integration Test Suite",
    "generated_at": datetime.utcnow().isoformat() + 'Z',
    "test_execution": {
        "backend_rag_integration": {
            "executed": bool(backend_results),
            "success_rate": backend_results.get('test_metadata', {}).get('success_rate_percent', 0),
            "total_tests": backend_results.get('test_metadata', {}).get('total_tests', 0),
            "avg_response_time_ms": backend_results.get('test_metadata', {}).get('average_duration_ms', 0)
        },
        "isolated_endpoint_testing": {
            "executed": bool(isolated_results),
            "integration_readiness_rate": isolated_results.get('test_metadata', {}).get('integration_readiness_rate', 0),
            "total_endpoints": isolated_results.get('test_metadata', {}).get('total_endpoints_tested', 0),
            "ready_endpoints": isolated_results.get('test_metadata', {}).get('integration_ready_endpoints', 0)
        },
        "frontend_playwright": {
            "executed": os.path.exists('$WEB_DIR/test-results.json'),
            "note": "Check Playwright HTML report for detailed results"
        }
    },
    "overall_status": {
        "backend_ready": backend_results.get('test_metadata', {}).get('success_rate_percent', 0) >= 90,
        "endpoints_ready": isolated_results.get('test_metadata', {}).get('integration_readiness_rate', 0) >= 80,
        "production_ready": False
    },
    "recommendations": []
}

# Calculate overall readiness
backend_ready = consolidated["overall_status"]["backend_ready"]
endpoints_ready = consolidated["overall_status"]["endpoints_ready"]
consolidated["overall_status"]["production_ready"] = backend_ready and endpoints_ready

# Generate recommendations
if not backend_ready:
    consolidated["recommendations"].append("Improve backend RAG integration test success rate to ≥90%")
if not endpoints_ready:
    consolidated["recommendations"].append("Address isolated endpoint issues to achieve ≥80% integration readiness")
if backend_ready and endpoints_ready:
    consolidated["recommendations"].append("✅ RAG integration tests pass - ready for production integration")
else:
    consolidated["recommendations"].append("❌ Tests do not meet production criteria - address issues before integration")

# Save report
with open('$report_file', 'w') as f:
    json.dump(consolidated, f, indent=2)

print("Consolidated report generated: $report_file")
print(f"Backend Ready: {backend_ready}")
print(f"Endpoints Ready: {endpoints_ready}")
print(f"Production Ready: {consolidated['overall_status']['production_ready']}")
EOF

    if [ -f "$report_file" ]; then
        print_status "SUCCESS" "Consolidated report generated: $report_file"
        
        # Display summary
        local production_ready=$(python3 -c "
import json
try:
    with open('$report_file', 'r') as f:
        data = json.load(f)
    print(data['overall_status']['production_ready'])
except:
    print('False')
")
        
        if [ "$production_ready" = "True" ]; then
            print_status "SUCCESS" "🎉 All RAG integration tests meet production criteria!"
        else
            print_status "WARNING" "⚠️  Some tests do not meet production criteria. Check recommendations."
        fi
    else
        print_status "ERROR" "Failed to generate consolidated report"
        return 1
    fi
}

# Function to display help
show_help() {
    echo "AR-84 RAG Integration Test Suite Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all                 Run all RAG integration tests (default)"
    echo "  backend             Run only backend RAG integration tests"
    echo "  isolated            Run only isolated endpoint tests"
    echo "  frontend            Run only frontend Playwright tests"
    echo "  report              Generate consolidated report from existing results"
    echo "  clean               Clean up test results and reports"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  --api-url URL       API base URL (default: $DEFAULT_API_URL)"
    echo "  --web-url URL       Web app base URL (default: $DEFAULT_WEB_URL)"
    echo "  --timeout SECONDS   Service check timeout (default: $TIMEOUT)"
    echo "  --no-cleanup        Don't clean up old test results"
    echo ""
    echo "Examples:"
    echo "  $0                              # Run all tests"
    echo "  $0 backend                      # Run only backend tests"
    echo "  $0 --api-url http://localhost:8080 # Use custom API URL"
    echo "  $0 clean                        # Clean up test results"
}

# Function to clean up test results
cleanup_results() {
    print_status "INFO" "Cleaning up old test results..."
    
    # Remove backend test reports
    rm -f "$DOCS_DIR/rag_integration_test_report.json"
    rm -f "$DOCS_DIR/isolated_endpoint_test_report.json"
    
    # Remove frontend test results
    rm -rf "$WEB_DIR/test-results"
    rm -rf "$WEB_DIR/tests/playwright/test-results"
    rm -rf "$WEB_DIR/tests/playwright/reports"
    rm -f "$WEB_DIR/test-results.json"
    
    # Remove consolidated report
    rm -f "$PROJECT_ROOT/ar84_rag_test_summary.json"
    
    print_status "SUCCESS" "Test results cleaned up"
}

# Parse command line arguments
COMMAND="all"
API_URL="$DEFAULT_API_URL"
WEB_URL="$DEFAULT_WEB_URL"
CLEANUP=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --api-url)
            API_URL="$2"
            shift 2
            ;;
        --web-url)
            WEB_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        all|backend|isolated|frontend|report|clean)
            COMMAND="$1"
            shift
            ;;
        *)
            print_status "ERROR" "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Update URLs
DEFAULT_API_URL="$API_URL"
DEFAULT_WEB_URL="$WEB_URL"

# Main execution
print_status "HEADER" "🚀 AR-84 RAG Integration Test Suite"
print_status "INFO" "Command: $COMMAND"
print_status "INFO" "API URL: $API_URL"
print_status "INFO" "Web URL: $WEB_URL"
echo

# Clean up old results if requested
if [ "$CLEANUP" = true ] && [ "$COMMAND" != "clean" ] && [ "$COMMAND" != "report" ]; then
    cleanup_results
    echo
fi

# Check dependencies
if ! command -v python3 &> /dev/null; then
    print_status "ERROR" "Python 3 is required but not installed"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    print_status "ERROR" "curl is required but not installed"
    exit 1
fi

# Execute command
case $COMMAND in
    "all")
        run_backend_rag_tests
        backend_exit=$?
        
        run_isolated_endpoint_tests
        isolated_exit=$?
        
        run_frontend_rag_tests
        frontend_exit=$?
        
        generate_consolidated_report
        report_exit=$?
        
        # Overall exit code
        if [ $backend_exit -eq 0 ] && [ $isolated_exit -eq 0 ] && [ $frontend_exit -eq 0 ] && [ $report_exit -eq 0 ]; then
            print_status "SUCCESS" "🎉 All RAG integration tests completed successfully!"
            exit 0
        else
            print_status "ERROR" "Some tests failed. Check individual test reports for details."
            exit 1
        fi
        ;;
    "backend")
        run_backend_rag_tests
        exit $?
        ;;
    "isolated")
        run_isolated_endpoint_tests
        exit $?
        ;;
    "frontend")
        run_frontend_rag_tests
        exit $?
        ;;
    "report")
        generate_consolidated_report
        exit $?
        ;;
    "clean")
        cleanup_results
        exit 0
        ;;
    *)
        print_status "ERROR" "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac