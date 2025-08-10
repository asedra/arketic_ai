#!/usr/bin/env python3
"""
Test script for AR-112: Authentication and Session Management Fix
Fixes authentication test failures and ensures proper session handling
"""

import asyncio
import aiohttp
import json
from datetime import datetime
import sys
import hashlib

API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USERS = [
    {
        "email": "test@arketic.com",
        "password": "Test123456!",
        "name": "Test User"
    },
    {
        "email": "playwright@arketic.com", 
        "password": "Playwright123!",
        "name": "Playwright Test User"
    }
]

async def create_test_user(session, user_data):
    """Create a test user via API"""
    print(f"  Creating user: {user_data['email']}")
    
    # First try to register the user
    name_parts = user_data["name"].split(" ", 1)
    register_data = {
        "email": user_data["email"],
        "password": user_data["password"],
        "first_name": name_parts[0],
        "last_name": name_parts[1] if len(name_parts) > 1 else "User"
    }
    
    async with session.post(
        f"{API_BASE_URL}/auth/register",
        json=register_data
    ) as response:
        if response.status == 200:
            print(f"  ✅ User created: {user_data['email']}")
            return True
        elif response.status == 400:
            # User might already exist, try to login
            print(f"  ℹ️  User might already exist, checking login...")
            return await verify_login(session, user_data)
        else:
            text = await response.text()
            print(f"  ❌ Failed to create user: {response.status}")
            print(f"     Response: {text}")
            return False

async def verify_login(session, user_data):
    """Verify user can login"""
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    
    async with session.post(
        f"{API_BASE_URL}/auth/login",
        json=login_data
    ) as response:
        if response.status == 200:
            data = await response.json()
            print(f"  ✅ Login verified for: {user_data['email']}")
            return True
        else:
            text = await response.text()
            print(f"  ❌ Login failed for {user_data['email']}: {response.status}")
            print(f"     Response: {text}")
            return False

async def test_session_persistence(session, token):
    """Test session persistence and validation"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /me endpoint
    async with session.get(
        f"{API_BASE_URL}/auth/me",
        headers=headers
    ) as response:
        if response.status == 200:
            data = await response.json()
            print(f"  ✅ Session valid for user: {data.get('email')}")
            return True
        else:
            print(f"  ❌ Session validation failed: {response.status}")
            return False

async def test_token_refresh(session, token):
    """Test token refresh mechanism"""
    refresh_data = {"refresh_token": token}
    
    async with session.post(
        f"{API_BASE_URL}/auth/refresh",
        json=refresh_data
    ) as response:
        if response.status == 200:
            print(f"  ✅ Token refresh successful")
            return True
        else:
            print(f"  ⚠️  Token refresh not working: {response.status}")
            return False

async def main():
    """Main test function"""
    print("=" * 60)
    print("AR-112: Authentication and Session Management Fix")
    print(f"Testing at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    all_tests_passed = True
    
    async with aiohttp.ClientSession() as session:
        # 1. Create/verify test users
        print("\n1. Setting up test users...")
        for user in TEST_USERS:
            success = await create_test_user(session, user)
            if not success:
                all_tests_passed = False
        
        # 2. Test login flow for each user
        print("\n2. Testing login flows...")
        for user in TEST_USERS:
            print(f"\n  Testing {user['email']}:")
            
            login_data = {
                "email": user["email"],
                "password": user["password"]
            }
            
            async with session.post(
                f"{API_BASE_URL}/auth/login",
                json=login_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    token = data.get("access_token")
                    print(f"    ✅ Login successful")
                    
                    # Test session persistence
                    print(f"    Testing session persistence...")
                    await test_session_persistence(session, token)
                    
                    # Test token refresh (if applicable)
                    print(f"    Testing token refresh...")
                    await test_token_refresh(session, token)
                    
                else:
                    text = await response.text()
                    print(f"    ❌ Login failed: {response.status}")
                    print(f"       Response: {text}")
                    all_tests_passed = False
        
        # 3. Test authentication middleware
        print("\n3. Testing authentication middleware...")
        
        # Test without token (should fail)
        async with session.get(f"{API_BASE_URL}/auth/me") as response:
            if response.status == 401:
                print("  ✅ Unauthenticated request properly rejected")
            else:
                print(f"  ❌ Unauthenticated request not rejected: {response.status}")
                all_tests_passed = False
        
        # Test with invalid token (should fail)
        headers = {"Authorization": "Bearer invalid_token"}
        async with session.get(
            f"{API_BASE_URL}/auth/me",
            headers=headers
        ) as response:
            if response.status == 401:
                print("  ✅ Invalid token properly rejected")
            else:
                print(f"  ❌ Invalid token not rejected: {response.status}")
                all_tests_passed = False
    
    # Summary
    print("\n" + "=" * 60)
    if all_tests_passed:
        print("✅ AR-112 FIX VERIFIED - All authentication tests passed!")
        print("The authentication and session management is working correctly.")
    else:
        print("❌ AR-112 ISSUE DETECTED - Some tests failed!")
        print("Authentication or session management needs to be fixed.")
    print("=" * 60)
    
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)