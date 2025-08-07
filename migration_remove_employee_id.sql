-- Migration: Remove employee_id from people table
-- Date: 2025-08-07
-- Description: Removing employee_id field as it's causing conflicts and not needed

-- Drop the unique constraint if exists
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_employee_id_key;

-- Drop the column
ALTER TABLE people DROP COLUMN IF EXISTS employee_id;

-- Add comment
COMMENT ON TABLE people IS 'People table without employee_id field - simplified version';