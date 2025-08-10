#!/bin/bash

# New Endpoint Validation Script
# 
# This script provides an easy interface for validating new API endpoints
# before integrating them into the main test suite.
# 
# Usage:
#   ./validate_endpoint.sh <config_file> [options]
#
# Author: Claude
# Created: 2025-08-10 (AR-83 Implementation)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
BASE_URL="${BASE_URL:-http://localhost:8000}"
VALIDATOR_SCRIPT="$SCRIPT_DIR/endpoint_validator.py"
CONFIG_DIR="$SCRIPT_DIR/endpoint_configs"
OUTPUT_DIR="$SCRIPT_DIR/validation_reports"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo -e "\n${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' $(seq 1 ${#1}))${NC}\n"
}

# Show help
show_help() {
    cat << EOF
🔍 Endpoint Validation Tool

USAGE:
    ./validate_endpoint.sh <config_file> [options]

ARGUMENTS:
    config_file         YAML configuration file for the endpoint
                       (can be relative to endpoint_configs/ directory)

OPTIONS:
    --base-url URL     Base URL for API testing (default: http://localhost:8000)
    --output FILE      Output file for validation report
    --help, -h         Show this help message

EXAMPLES:
    # Validate using example configuration
    ./validate_endpoint.sh new_endpoint_example.yaml
    
    # Validate with custom base URL
    ./validate_endpoint.sh my_endpoint.yaml --base-url http://localhost:3000
    
    # Save report to specific file
    ./validate_endpoint.sh my_endpoint.yaml --output /tmp/report.json

CONFIGURATION:
    Configuration files should be placed in: $CONFIG_DIR/
    
    Example configuration structure:
    - path: "/api/v1/my-endpoint"
    - method: "POST" 
    - description: "My new endpoint"
    - auth_required: true
    - test_payloads: [...]

WORKFLOW:
    1. Create endpoint configuration YAML file
    2. Run validation: ./validate_endpoint.sh your_config.yaml
    3. Review validation report and fix issues
    4. Re-run validation until success rate >= 75%
    5. Integrate into main test suite

For more details, see: /apps/api/tests/endpoint_configs/new_endpoint_example.yaml

EOF
}

# Check if Docker services are running
check_docker_services() {
    log_info "Checking Docker services..."
    
    if ! docker compose ps | grep -q "Up.*healthy.*arketic-api"; then
        log_error "API service is not running or healthy"
        log_info "Start services with: docker compose up -d"
        return 1
    fi
    
    if ! docker compose ps | grep -q "Up.*healthy.*arketic-postgres"; then
        log_error "PostgreSQL service is not running or healthy"
        log_info "Start services with: docker compose up -d"
        return 1
    fi
    
    log_success "Docker services are running"
    return 0
}

# Test API connectivity
test_api_connectivity() {
    log_info "Testing API connectivity..."
    
    if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
        log_success "API is accessible at $BASE_URL"
        return 0
    else
        log_error "Cannot connect to API at $BASE_URL"
        log_info "Check if services are running: docker compose ps"
        return 1
    fi
}

# Validate configuration file
validate_config_file() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        # Try to find it in the configs directory
        local config_in_dir="$CONFIG_DIR/$config_file"
        if [[ -f "$config_in_dir" ]]; then
            config_file="$config_in_dir"
        else
            log_error "Configuration file not found: $config_file"
            log_info "Available configurations:"
            ls -1 "$CONFIG_DIR"/ 2>/dev/null || log_info "No configurations found in $CONFIG_DIR/"
            return 1
        fi
    fi
    
    # Check if it's a YAML file
    if ! [[ "$config_file" =~ \.(yaml|yml)$ ]]; then
        log_error "Configuration file must be a YAML file (.yaml or .yml)"
        return 1
    fi
    
    # Basic YAML validation (check if python can parse it)
    if ! python3 -c "import yaml; yaml.safe_load(open('$config_file'))" 2>/dev/null; then
        log_error "Invalid YAML syntax in configuration file"
        return 1
    fi
    
    echo "$config_file"
    return 0
}

# Run endpoint validation
run_validation() {
    local config_file="$1"
    local output_file="$2"
    
    log_section "RUNNING ENDPOINT VALIDATION"
    
    # Prepare validation command
    local cmd="python3 \"$VALIDATOR_SCRIPT\" --config \"$config_file\" --base-url \"$BASE_URL\""
    
    if [[ -n "$output_file" ]]; then
        cmd="$cmd --output \"$output_file\""
    else
        # Generate default output file name
        local config_basename=$(basename "$config_file" .yaml)
        config_basename=$(basename "$config_basename" .yml)
        local timestamp=$(date +%Y%m%d_%H%M%S)
        output_file="$OUTPUT_DIR/${config_basename}_validation_${timestamp}.json"
        cmd="$cmd --output \"$output_file\""
    fi
    
    log_info "Running validation command..."
    log_info "Config: $config_file"
    log_info "Output: $output_file"
    
    # Run validation
    if eval "$cmd"; then
        log_success "Validation completed successfully"
        
        # Show report summary if output file exists
        if [[ -f "$output_file" ]]; then
            show_report_summary "$output_file"
        fi
        
        return 0
    else
        local exit_code=$?
        log_error "Validation failed with exit code $exit_code"
        
        # Show report summary even if validation failed
        if [[ -f "$output_file" ]]; then
            show_report_summary "$output_file"
        fi
        
        return $exit_code
    fi
}

# Show validation report summary
show_report_summary() {
    local report_file="$1"
    
    if [[ ! -f "$report_file" ]]; then
        return 1
    fi
    
    log_section "VALIDATION REPORT SUMMARY"
    
    # Extract key metrics from JSON report
    local success_rate=$(python3 -c "import json; print(json.load(open('$report_file')).get('success_rate', 0))" 2>/dev/null || echo "0")
    local recommendation=$(python3 -c "import json; print(json.load(open('$report_file')).get('recommendation', 'Unknown'))" 2>/dev/null || echo "Unknown")
    local total_tests=$(python3 -c "import json; print(json.load(open('$report_file')).get('total_tests', 0))" 2>/dev/null || echo "0")
    local passed_tests=$(python3 -c "import json; print(json.load(open('$report_file')).get('passed_tests', 0))" 2>/dev/null || echo "0")
    
    echo -e "📊 ${MAGENTA}Success Rate:${NC} $success_rate%"
    echo -e "🧪 ${MAGENTA}Tests:${NC} $passed_tests/$total_tests passed"
    echo -e "📝 ${MAGENTA}Recommendation:${NC} $recommendation"
    echo -e "📄 ${MAGENTA}Full Report:${NC} $report_file"
    
    # Next steps based on success rate
    if (( $(echo "$success_rate >= 90" | bc -l) )); then
        log_success "Endpoint is ready for integration!"
        echo -e "\n${GREEN}Next Steps:${NC}"
        echo "1. Add endpoint tests to main test suite"
        echo "2. Update API documentation"
        echo "3. Create integration tests if needed"
    elif (( $(echo "$success_rate >= 75" | bc -l) )); then
        log_warning "Endpoint needs minor fixes before integration"
        echo -e "\n${YELLOW}Next Steps:${NC}"
        echo "1. Review failed tests in the report"
        echo "2. Fix identified issues"
        echo "3. Re-run validation"
    else
        log_error "Endpoint needs significant work before integration"
        echo -e "\n${RED}Next Steps:${NC}"
        echo "1. Review all failed tests in the report"
        echo "2. Fix critical issues (authentication, validation, etc.)"
        echo "3. Re-run validation"
        echo "4. Consider refactoring the endpoint implementation"
    fi
    
    echo ""
}

# List available configurations
list_configurations() {
    log_section "AVAILABLE ENDPOINT CONFIGURATIONS"
    
    if [[ -d "$CONFIG_DIR" ]] && [[ -n "$(ls -A "$CONFIG_DIR")" ]]; then
        for config in "$CONFIG_DIR"/*.{yaml,yml}; do
            if [[ -f "$config" ]]; then
                local basename=$(basename "$config")
                local description=$(python3 -c "
import yaml
try:
    with open('$config') as f:
        data = yaml.safe_load(f)
        print(data.get('description', 'No description'))
except:
    print('Invalid YAML')
" 2>/dev/null)
                
                echo -e "📄 ${CYAN}$basename${NC}"
                echo -e "   Description: $description"
                echo ""
            fi
        done
    else
        log_info "No configuration files found in $CONFIG_DIR/"
        log_info "Create a new configuration based on: new_endpoint_example.yaml"
    fi
}

# Main function
main() {
    local config_file=""
    local output_file=""
    local base_url="$BASE_URL"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --base-url)
                base_url="$2"
                shift 2
                ;;
            --output)
                output_file="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --list)
                list_configurations
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$config_file" ]]; then
                    config_file="$1"
                else
                    log_error "Multiple configuration files specified"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Check if configuration file is provided
    if [[ -z "$config_file" ]]; then
        log_error "Configuration file is required"
        echo ""
        show_help
        exit 1
    fi
    
    # Update base URL
    BASE_URL="$base_url"
    
    log_section "ENDPOINT VALIDATION WORKFLOW"
    log_info "Configuration: $config_file"
    log_info "Base URL: $BASE_URL"
    log_info "Output Directory: $OUTPUT_DIR"
    
    # Pre-flight checks
    if ! check_docker_services; then
        exit 1
    fi
    
    if ! test_api_connectivity; then
        exit 1
    fi
    
    # Validate configuration
    config_file=$(validate_config_file "$config_file")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
    
    # Run validation
    if run_validation "$config_file" "$output_file"; then
        log_success "Endpoint validation workflow completed"
        exit 0
    else
        log_error "Endpoint validation workflow failed"
        exit 1
    fi
}

# Handle special case for listing configurations
if [[ "$1" == "--list" ]]; then
    list_configurations
    exit 0
fi

# Run main function
main "$@"