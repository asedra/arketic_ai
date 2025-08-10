#!/usr/bin/env python3
"""
Test script for AR-111: Transaction error fix when sending messages with Ali assistant
"""
import asyncio
import aiohttp
import json
from datetime import datetime
import sys

# Test configuration
API_URL = "http://localhost:8000"
TEST_USER = {
    "email": "test@arketic.com",
    "password": "testpass123"
}

async def login():
    """Login and get auth token"""
    async with aiohttp.ClientSession() as session:
        login_data = {
            **TEST_USER,
            "remember_me": False
        }
        async with session.post(
            f"{API_URL}/api/v1/auth/login",
            json=login_data
        ) as response:
            if response.status != 200:
                print(f"❌ Login failed: {response.status}")
                text = await response.text()
                print(f"Response: {text}")
                return None
            data = await response.json()
            return data["access_token"]

async def get_ali_assistant(token):
    """Find Ali assistant"""
    headers = {"Authorization": f"Bearer {token}"}
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{API_URL}/api/v1/assistant/assistants",
            headers=headers
        ) as response:
            if response.status != 200:
                print(f"❌ Failed to get assistants: {response.status}")
                return None
            data = await response.json()
            
            # Find Ali assistant
            for assistant in data.get("assistants", []):
                if assistant["name"] == "Ali":
                    return assistant["id"]
            return None

async def create_chat_with_ali(token, assistant_id):
    """Create a new chat with Ali assistant"""
    headers = {"Authorization": f"Bearer {token}"}
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/api/v1/chat/chats",
            headers=headers,
            json={
                "name": f"AR-111 Test Chat {datetime.now().strftime('%H:%M:%S')}",
                "assistant_id": assistant_id
            }
        ) as response:
            if response.status != 200:
                print(f"❌ Failed to create chat: {response.status}")
                text = await response.text()
                print(f"Response: {text}")
                return None
            data = await response.json()
            return data["id"]

async def send_message(token, chat_id, message):
    """Send a message to the chat"""
    headers = {"Authorization": f"Bearer {token}"}
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/api/v1/chat/chats/{chat_id}/messages",
            headers=headers,
            json={
                "message": message,
                "save_to_history": True,
                "stream": True
            }
        ) as response:
            if response.status != 200:
                print(f"❌ Failed to send message: {response.status}")
                text = await response.text()
                print(f"Response: {text}")
                return False
            data = await response.json()
            print(f"✅ Message sent successfully!")
            print(f"   Response: {json.dumps(data, indent=2)}")
            return True

async def test_ar111_fix():
    """Main test function"""
    print("=" * 60)
    print("AR-111 Transaction Error Fix Test")
    print("=" * 60)
    print()
    
    # Step 1: Login
    print("1. Logging in as test user...")
    token = await login()
    if not token:
        print("❌ Test failed: Could not login")
        return False
    print("✅ Login successful")
    print()
    
    # Step 2: Find Ali assistant
    print("2. Finding Ali assistant...")
    assistant_id = await get_ali_assistant(token)
    if not assistant_id:
        print("❌ Test failed: Ali assistant not found")
        return False
    print(f"✅ Found Ali assistant: {assistant_id}")
    print()
    
    # Step 3: Create chat with Ali
    print("3. Creating chat with Ali assistant...")
    chat_id = await create_chat_with_ali(token, assistant_id)
    if not chat_id:
        print("❌ Test failed: Could not create chat")
        return False
    print(f"✅ Created chat: {chat_id}")
    print()
    
    # Step 4: Send test message
    print("4. Sending test message...")
    test_message = "Hello Ali! This is a test message for AR-111 fix verification."
    success = await send_message(token, chat_id, test_message)
    
    if not success:
        print("❌ Test failed: Message sending failed with error")
        print("   This indicates the AR-111 bug is still present")
        return False
    
    print()
    print("=" * 60)
    print("✅ AR-111 FIX VERIFIED!")
    print("   The transaction error has been successfully resolved.")
    print("   Messages can now be sent to Ali assistant without errors.")
    print("=" * 60)
    return True

async def main():
    """Run the test"""
    try:
        success = await test_ar111_fix()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())