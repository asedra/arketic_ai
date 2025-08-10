#!/usr/bin/env python3
"""
Setup script to create test users for AR-112
Ensures test users exist in the database for authentication testing
"""

import asyncio
import sys
import os
sys.path.insert(0, '/app')

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db_session, init_database
from models.user import User, UserStatus, UserRole
from core.security import get_security_manager
from datetime import datetime
import uuid

# Test users to create
TEST_USERS = [
    {
        "email": "test@arketic.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
        "username": "testuser",
        "role": UserRole.USER
    },
    {
        "email": "playwright@arketic.com",
        "password": "Playwright123!",
        "first_name": "Playwright",
        "last_name": "Test",
        "username": "playwright",
        "role": UserRole.USER
    }
]

async def create_or_update_test_user(session: AsyncSession, user_data: dict):
    """Create or update a test user"""
    security_manager = get_security_manager()
    
    # Check if user exists
    result = await session.execute(
        select(User).where(User.email == user_data["email"])
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        print(f"  User exists: {user_data['email']}")
        # Update password to ensure it's correct
        existing_user.password_hash = security_manager.hash_password(user_data["password"])
        existing_user.status = UserStatus.ACTIVE
        existing_user.is_verified = True
        existing_user.is_active = True
        existing_user.failed_login_attempts = 0
        existing_user.locked_until = None
        existing_user.email_verified_at = datetime.utcnow()
        existing_user.updated_at = datetime.utcnow()
        await session.commit()
        print(f"  ✅ Updated password and status for: {user_data['email']}")
    else:
        # Create new user
        new_user = User(
            id=uuid.uuid4(),
            email=user_data["email"],
            username=user_data["username"],
            password_hash=security_manager.hash_password(user_data["password"]),
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            role=user_data["role"],
            status=UserStatus.ACTIVE,
            is_verified=True,  # Pre-verify for testing
            is_active=True,
            email_verified_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(new_user)
        await session.commit()
        print(f"  ✅ Created user: {user_data['email']}")

async def main():
    """Main setup function"""
    print("=" * 60)
    print("Setting up test users for AR-112")
    print("=" * 60)
    
    success = True
    
    try:
        # Initialize database first
        await init_database()
        
        async with get_db_session() as session:
            for user_data in TEST_USERS:
                try:
                    await create_or_update_test_user(session, user_data)
                except Exception as e:
                    print(f"  ❌ Error creating/updating {user_data['email']}: {str(e)}")
                    success = False
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Test users setup completed successfully!")
    else:
        print("❌ Some users could not be created/updated")
    print("=" * 60)
    
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)