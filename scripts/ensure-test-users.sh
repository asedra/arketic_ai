#!/bin/bash

# Ensure test users exist in the database
# This script runs after the API container starts and migrations are applied

set -e

echo "=========================================="
echo "Ensuring test users exist in the database"
echo "=========================================="

# Wait for API container to be ready
echo "Waiting for API container to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker compose ps api | grep -q "running\|Up"; then
        echo "API container is running"
        break
    fi
    echo "Waiting for API container... (attempt $((attempt+1))/$max_attempts)"
    sleep 2
    attempt=$((attempt+1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "Error: API container did not start within expected time"
    exit 1
fi

# Give API a bit more time to fully initialize
sleep 5

# Run the setup script inside the API container
echo "Running test user setup script..."
docker compose exec -T api python /app/setup_test_users.py

# Verify users were created
echo ""
echo "Verifying test users..."
docker compose exec -T postgres psql -U arketic -d arketic_dev -c "
SELECT email, username, role, status, is_active, is_verified 
FROM users 
WHERE email IN ('test@arketic.com', 'admin@arketic.com', 'playwright@arketic.com')
ORDER BY email;"

echo ""
echo "=========================================="
echo "Test users setup completed!"
echo "=========================================="
echo ""
echo "Available test accounts:"
echo "  - test@arketic.com / testpass123 (user role)"
echo "  - admin@arketic.com / testpass123 (admin role)"
echo "  - playwright@arketic.com / Playwright123! (for automated tests)"
echo ""