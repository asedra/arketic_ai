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
API_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "test@arketic.com",
    "password": "test123456"
}

async def login():
    """Login and get auth token"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/auth/login",
            json=TEST_USER
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
            f"{API_URL}/assistant/assistants",
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
            f"{API_URL}/chat/chats",
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
            f"{API_URL}/chat/chats/{chat_id}/messages",
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
                # Check for the specific transaction error
                if "current transaction is aborted" in text:
                    print("   ⚠️  TRANSACTION ERROR DETECTED - AR-111 BUG IS STILL PRESENT!")
                return False
            data = await response.json()
            print(f"✅ Message sent successfully!")
            print(f"   Response: {json.dumps(data, indent=2)}")
            return True

async def test_ar111_fix():
    """Main test function"""
    print("=" * 60)
    print("AR-111 Transaction Error Fix Test")
    print("Testing at:", datetime.now().isoformat())
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
        print()
        print("=" * 60)
        print("❌ AR-111 BUG STILL PRESENT!")
        print("   The transaction error is still occurring.")
        print("   Message sending failed with an error.")
        print("=" * 60)
        return False
    
    # Wait a bit for the streaming to complete
    await asyncio.sleep(3)
    
    # Step 5: Send another message to be sure
    print()
    print("5. Sending second message to confirm fix...")
    test_message2 = "This is a follow-up message to ensure the fix is stable."
    success2 = await send_message(token, chat_id, test_message2)
    
    if not success2:
        print()
        print("=" * 60)
        print("❌ AR-111 BUG STILL PRESENT!")
        print("   Second message also failed.")
        print("=" * 60)
        return False
    
    print()
    print("=" * 60)
    print("✅ AR-111 FIX VERIFIED!")
    print("   The transaction error has been successfully resolved.")
    print("   Messages can now be sent to Ali assistant without errors.")
    print("   Chat ID:", chat_id)
    print("   Assistant ID:", assistant_id)
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