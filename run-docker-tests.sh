#!/bin/bash

# Arketic Docker-First Test Runner
# This script runs the comprehensive Docker-first test suite

set -e  # Exit on any error

echo "🚀 Arketic Docker-First Test Suite"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the Arketic root directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Navigate to docker-tests directory
if [ ! -d "docker-tests" ]; then
    echo "❌ Error: docker-tests directory not found."
    exit 1
fi

cd docker-tests

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing test dependencies..."
    npm install
fi

# Set environment variables
export CLEANUP_AFTER_TESTS=${CLEANUP_AFTER_TESTS:-false}
export TEST_LOG_LEVEL=${TEST_LOG_LEVEL:-info}

echo "🧪 Starting test execution..."
echo "   - Tests will run against fresh Docker containers"
echo "   - First test establishes Docker environment"
echo "   - Subsequent tests use the same environment"
echo "   - Cleanup after tests: $CLEANUP_AFTER_TESTS"
echo ""

# Run the tests
if npm test; then
    echo ""
    echo "🎉 All tests completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   - Review test reports in docker-tests/reports/"
    echo "   - Check logs in docker-tests/logs/"
    echo "   - Docker environment is still running (use 'docker compose ps' to check)"
    
    if [ "$CLEANUP_AFTER_TESTS" != "true" ]; then
        echo "   - To stop Docker environment: docker compose down -v"
    fi
    
    exit 0
else
    echo ""
    echo "❌ Tests failed!"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   - Check failure reports in docker-tests/reports/"
    echo "   - Review debug logs in docker-tests/debug-logs/"
    echo "   - Check Docker container status: docker compose ps"
    echo "   - View container logs: docker compose logs"
    echo ""
    exit 1
fi