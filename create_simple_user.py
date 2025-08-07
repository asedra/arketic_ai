#!/usr/bin/env python3
"""
Simple test user creation that bypasses settings configuration
"""
import asyncio
import asyncpg
import bcrypt
import uuid
from datetime import datetime, timezone

async def create_test_user():
    """Create a test user directly in the database"""
    try:
        # Database connection using environment vars (fallback to hardcoded for testing)
        import os
        DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
        DB_PORT = os.getenv('POSTGRES_PORT', '5432') 
        DB_USER = os.getenv('POSTGRES_USER', 'arketic')
        DB_PASS = os.getenv('POSTGRES_PASSWORD', 'arketic_dev_password')
        DB_NAME = os.getenv('POSTGRES_DB', 'arketic_dev')
        
        connection_string = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        print(f"🔗 Connecting to database: {DB_HOST}:{DB_PORT}/{DB_NAME}")
        
        # Connect to database
        conn = await asyncpg.connect(connection_string)
        
        # Check if user already exists
        existing = await conn.fetchrow(
            "SELECT id, email, first_name, last_name FROM users WHERE email = $1",
            "test@arketic.com"
        )
        
        if existing:
            print("✅ Test user already exists:")
            print(f"   ID: {existing['id']}")
            print(f"   Email: {existing['email']}")
            print(f"   Name: {existing['first_name']} {existing['last_name']}")
            await conn.close()
            return True
            
        # Create password hash
        password = "testpass123"
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Create user
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        await conn.execute("""
            INSERT INTO users (
                id, email, first_name, last_name, hashed_password, 
                is_active, is_verified, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, user_id, "test@arketic.com", "Test", "User", hashed_password, 
        True, True, now, now)
        
        print("🎉 Test user created successfully!")
        print(f"   Email: test@arketic.com")
        print(f"   Password: testpass123")
        print(f"   User ID: {user_id}")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error creating test user: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(create_test_user())
        print(f"\n🎯 Result: {'SUCCESS' if result else 'FAILED'}")
        
        if result:
            print("\n📝 Usage:")
            print("1. Go to http://localhost:3000/login")
            print("2. Use credentials:")
            print("   Email: test@arketic.com")
            print("   Password: testpass123")
            print("3. Login and test the authentication system!")
    except Exception as e:
        print(f"❌ Script error: {str(e)}")