#!/bin/bash

echo "========================================="
echo "Arketic Migration Fix Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking current migration status...${NC}"
docker compose exec api alembic current 2>/dev/null || {
    echo -e "${RED}No migrations applied yet or database not initialized${NC}"
}

echo -e "\n${YELLOW}Step 2: Checking for existing enum types...${NC}"
docker compose exec postgres psql -U arketic arketic_dev -c "
SELECT typname FROM pg_type 
WHERE typname IN ('userrole', 'userstatus', 'organizationstatus', 'subscriptiontier')
ORDER BY typname;
" 2>/dev/null || {
    echo -e "${RED}Could not check enum types${NC}"
}

echo -e "\n${YELLOW}Step 3: Attempting to fix enum types if they exist...${NC}"
docker compose exec postgres psql -U arketic arketic_dev << 'EOF'
-- Drop existing enum types if they exist (with cascade to handle dependencies)
DO $$
BEGIN
    -- Drop userrole if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        DROP TYPE userrole CASCADE;
        RAISE NOTICE 'Dropped existing userrole enum';
    END IF;
    
    -- Drop userstatus if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userstatus') THEN
        DROP TYPE userstatus CASCADE;
        RAISE NOTICE 'Dropped existing userstatus enum';
    END IF;
    
    -- Drop organizationstatus if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizationstatus') THEN
        DROP TYPE organizationstatus CASCADE;
        RAISE NOTICE 'Dropped existing organizationstatus enum';
    END IF;
    
    -- Drop subscriptiontier if exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptiontier') THEN
        DROP TYPE subscriptiontier CASCADE;
        RAISE NOTICE 'Dropped existing subscriptiontier enum';
    END IF;
END$$;
EOF

echo -e "\n${YELLOW}Step 4: Resetting Alembic migration history...${NC}"
docker compose exec postgres psql -U arketic arketic_dev -c "
DROP TABLE IF EXISTS alembic_version CASCADE;
" 2>/dev/null || {
    echo -e "${RED}Could not reset alembic_version table${NC}"
}

echo -e "\n${YELLOW}Step 5: Running migrations from scratch...${NC}"
docker compose exec api alembic upgrade head || {
    echo -e "${RED}Migration failed!${NC}"
    echo -e "${YELLOW}Trying alternative approach...${NC}"
    
    # Alternative: Drop all and recreate
    echo -e "\n${YELLOW}Alternative: Dropping all database objects...${NC}"
    docker compose exec postgres psql -U arketic arketic_dev -c "
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO arketic;
    GRANT ALL ON SCHEMA public TO public;
    " 2>/dev/null
    
    echo -e "\n${YELLOW}Retrying migrations...${NC}"
    docker compose exec api alembic upgrade head || {
        echo -e "${RED}Migration still failed. Manual intervention required.${NC}"
        exit 1
    }
}

echo -e "\n${GREEN}Step 6: Verifying migration success...${NC}"
docker compose exec api alembic current

echo -e "\n${YELLOW}Step 7: Checking user table...${NC}"
docker compose exec postgres psql -U arketic arketic_dev -c "
SELECT email, first_name, last_name, role, is_active 
FROM users 
LIMIT 5;
" 2>/dev/null || {
    echo -e "${RED}Could not query users table${NC}"
}

echo -e "\n${YELLOW}Step 8: Testing login endpoint...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@arketic.com", "password": "TestPassword123!", "remember_me": false}')

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Login endpoint working correctly (HTTP 200)${NC}"
elif [ "$response" = "422" ]; then
    echo -e "${YELLOW}⚠ Login endpoint returning validation error (HTTP 422)${NC}"
    echo "This might be due to invalid credentials or missing user data"
elif [ "$response" = "401" ]; then
    echo -e "${YELLOW}⚠ Login endpoint returning unauthorized (HTTP 401)${NC}"
    echo "This is expected if the password is incorrect"
else
    echo -e "${RED}✗ Login endpoint returned unexpected status: $response${NC}"
fi

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Migration fix script completed!${NC}"
echo -e "${GREEN}=========================================${NC}"

echo -e "\n${YELLOW}If you're still experiencing issues:${NC}"
echo "1. Check docker logs: docker compose logs api"
echo "2. Verify database connection: docker compose exec api python -c 'from core.database import test_connection; test_connection()'"
echo "3. Check if default users exist: docker compose exec postgres psql -U arketic arketic_dev -c 'SELECT * FROM users;'"
echo "4. Manually run specific migration: docker compose exec api alembic upgrade <revision_id>"