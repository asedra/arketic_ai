#!/bin/bash

# Playwright Test Runner for Arketic Frontend
# Author: Claude
# Created: 2025-01-10

set -e

echo "=================================="
echo "🎭 PLAYWRIGHT TEST RUNNER"
echo "=================================="

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "📦 Running in Docker container"
else
    echo "⚠️  Not running in Docker. Using docker exec..."
    docker exec -it arketic-web-1 bash -c "cd /app && npm run test:e2e"
    exit $?
fi

# Install Playwright browsers if needed
if [ ! -d "/root/.cache/ms-playwright" ]; then
    echo "📥 Installing Playwright browsers..."
    npx playwright install chromium
fi

# Set environment variables
export PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL:-"http://localhost:3000"}
export API_URL=${API_URL:-"http://api:8000"}

# Parse arguments
TEST_FILE=""
HEADED=""
DEBUG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --file)
            TEST_FILE="$2"
            shift 2
            ;;
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run tests
if [ -n "$TEST_FILE" ]; then
    echo "🧪 Running specific test: $TEST_FILE"
    npx playwright test "$TEST_FILE" $HEADED $DEBUG
else
    echo "🧪 Running all Playwright tests..."
    npx playwright test $HEADED $DEBUG
fi

# Generate report
echo ""
echo "📊 Generating test report..."
npx playwright show-report || true

echo ""
echo "✅ Test run complete!"