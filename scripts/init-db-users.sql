-- Arketic Test Users Initialization Script
-- This script creates default test users for development and testing

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to hash passwords using bcrypt
-- Note: This creates a simple bcrypt-like hash for testing
-- In production, passwords should be hashed by the application
CREATE OR REPLACE FUNCTION hash_password(password TEXT) RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - actual bcrypt hashing should be done by the application
    -- For testing purposes, we'll store a known bcrypt hash
    RETURN '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY4VADCr2q.F6vS'; -- testpass123
END;
$$ LANGUAGE plpgsql;

-- Wait for tables to be created by migrations
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Users table does not exist yet, skipping user creation';
        RETURN;
    END IF;
    
    -- Insert test users if they don't exist
    -- User 1: test@arketic.com
    INSERT INTO users (
        id,
        email,
        username,
        password_hash,
        first_name,
        last_name,
        role,
        status,
        is_verified,
        is_active,
        email_verified_at,
        created_at,
        updated_at,
        failed_login_attempts,
        two_factor_enabled
    ) VALUES (
        gen_random_uuid(),
        'test@arketic.com',
        'testuser',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY4VADCr2q.F6vS', -- testpass123
        'Test',
        'User',
        'user',
        'active',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0,
        false
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        status = 'active',
        is_verified = true,
        is_active = true,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP;
    
    -- User 2: admin@arketic.com  
    INSERT INTO users (
        id,
        email,
        username,
        password_hash,
        first_name,
        last_name,
        role,
        status,
        is_verified,
        is_active,
        email_verified_at,
        created_at,
        updated_at,
        failed_login_attempts,
        two_factor_enabled
    ) VALUES (
        gen_random_uuid(),
        'admin@arketic.com',
        'adminuser',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY4VADCr2q.F6vS', -- testpass123
        'Admin',
        'User',
        'admin',
        'active',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0,
        false
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        status = 'active',
        is_verified = true,
        is_active = true,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP;
    
    -- User 3: playwright@arketic.com
    INSERT INTO users (
        id,
        email,
        username,
        password_hash,
        first_name,
        last_name,
        role,
        status,
        is_verified,
        is_active,
        email_verified_at,
        created_at,
        updated_at,
        failed_login_attempts,
        two_factor_enabled
    ) VALUES (
        gen_random_uuid(),
        'playwright@arketic.com',
        'playwright',
        '$2b$12$k.0HwpsVDDaIDpXLNWDhQOaU1Y6c4yFE/N5WCtdYNjmZ0bU6hLHWa', -- Playwright123!
        'Playwright',
        'Test',
        'user',
        'active',
        true,
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        0,
        false
    ) ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        status = 'active',
        is_verified = true,
        is_active = true,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Test users created/updated successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test users: %', SQLERRM;
END;
$$;

-- Clean up function
DROP FUNCTION IF EXISTS hash_password(TEXT);

-- List created users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== Test Users Created ===';
        FOR user_record IN 
            SELECT email, role, status 
            FROM users 
            WHERE email IN ('test@arketic.com', 'admin@arketic.com', 'playwright@arketic.com')
        LOOP
            RAISE NOTICE 'Email: %, Role: %, Status: %', user_record.email, user_record.role, user_record.status;
        END LOOP;
        RAISE NOTICE '=========================';
    END IF;
END;
$$;