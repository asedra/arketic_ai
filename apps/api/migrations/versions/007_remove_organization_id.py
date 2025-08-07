"""Remove organization_id columns from all tables

Revision ID: 007
Revises: 005
Create Date: 2025-08-07 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '005'
branch_labels = None
depends_on = None

def upgrade():
    """Remove organization_id columns from all tables"""
    
    # Drop organization_id column from users table if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'organization_id'
            ) THEN
                -- Drop index first if it exists
                DROP INDEX IF EXISTS idx_user_organization_id;
                
                -- Drop foreign key constraint if it exists
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
                
                -- Drop the column
                ALTER TABLE users DROP COLUMN organization_id;
            END IF;
        END $$;
    """)
    
    # Drop organization_id column from chats table if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'chats' AND column_name = 'organization_id'
            ) THEN
                -- Drop foreign key constraint if it exists
                ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_organization_id_fkey;
                
                -- Drop the column
                ALTER TABLE chats DROP COLUMN organization_id;
            END IF;
        END $$;
    """)
    
    # Drop organization_id from knowledge_bases table if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'knowledge_bases' AND column_name = 'organization_id'
            ) THEN
                -- Drop foreign key constraint if it exists
                ALTER TABLE knowledge_bases DROP CONSTRAINT IF EXISTS knowledge_bases_organization_id_fkey;
                
                -- Drop the column
                ALTER TABLE knowledge_bases DROP COLUMN organization_id;
            END IF;
        END $$;
    """)
    
    # Drop organization_id from people table if it exists
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'people' AND column_name = 'organization_id'
            ) THEN
                -- Drop foreign key constraint if it exists
                ALTER TABLE people DROP CONSTRAINT IF EXISTS people_organization_id_fkey;
                
                -- Drop the column
                ALTER TABLE people DROP COLUMN organization_id;
            END IF;
        END $$;
    """)

def downgrade():
    """Add organization_id columns back (limited restoration)"""
    
    # Note: This is a destructive migration. Data will be lost.
    # We can only restore the schema, not the data.
    
    # Add organization_id back to users table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'organization_id'
            ) THEN
                ALTER TABLE users 
                ADD COLUMN organization_id UUID 
                REFERENCES organizations(id) ON DELETE SET NULL;
                
                -- Add index
                CREATE INDEX idx_user_organization_id 
                ON users(organization_id) 
                WHERE organization_id IS NOT NULL;
            END IF;
        END $$;
    """)
    
    # Add organization_id back to chats table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'chats' AND column_name = 'organization_id'
            ) THEN
                ALTER TABLE chats 
                ADD COLUMN organization_id UUID 
                REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
        END $$;
    """)
    
    # Add organization_id back to knowledge_bases table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'knowledge_bases' AND column_name = 'organization_id'
            ) THEN
                ALTER TABLE knowledge_bases 
                ADD COLUMN organization_id UUID 
                REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
        END $$;
    """)
    
    # Add organization_id back to people table
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'people' AND column_name = 'organization_id'
            ) THEN
                ALTER TABLE people 
                ADD COLUMN organization_id UUID 
                REFERENCES organizations(id) ON DELETE CASCADE;
            END IF;
        END $$;
    """)