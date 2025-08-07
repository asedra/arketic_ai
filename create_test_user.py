#!/usr/bin/env python3
"""
Create a test user for authentication testing
"""

import asyncio
import sys
import os

sys.path.append('/home/ali/arketic/apps/api')

async def create_test_user():
    """Create a test user in the database"""
    try:
        from core.database import get_db
        from models.user import User
        from core.security import get_security_manager
        from sqlalchemy import select
        
        async for db in get_db():
            # Check if user already exists
            query = select(User).where(User.email == "test@arketic.com")
            result = await db.execute(query)
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print("✅ Test user already exists: test@arketic.com")
                print(f"   User ID: {existing_user.id}")
                print(f"   Name: {existing_user.first_name} {existing_user.last_name}")
                return True
            
            # Create new test user
            security_manager = get_security_manager()
            hashed_password = security_manager.hash_password("testpass123")
            
            new_user = User(
                email="test@arketic.com",
                first_name="Test",
                last_name="User", 
                hashed_password=hashed_password,
                is_active=True,
                is_verified=True  # Skip email verification for testing
            )
            
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            
            print("🎉 Test user created successfully!")
            print(f"   Email: test@arketic.com")
            print(f"   Password: testpass123")
            print(f"   User ID: {new_user.id}")
            
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
            print("3. Login and test the chat system!")
            
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"❌ Script error: {str(e)}")
        sys.exit(1)