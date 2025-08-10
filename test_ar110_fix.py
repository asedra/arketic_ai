#!/usr/bin/env python3
"""
Test script for AR-110: Frontend Send Chat error fix
Tests that the transaction error in chat system is resolved
"""

import asyncio
import aiohttp
import json
from datetime import datetime

API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@arketic.com"
TEST_PASSWORD = "Test123456!"

async def test_chat_transaction_fix():
    """Test that the chat transaction error is fixed"""
    
    async with aiohttp.ClientSession() as session:
        print("=" * 60)
        print("AR-110 Transaction Error Fix Test")
        print("=" * 60)
        
        # 1. Login
        print("\n1. Logging in...")
        login_response = await session.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status != 200:
            print(f"❌ Login failed: {login_response.status}")
            return False
            
        login_data = await login_response.json()
        token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # 2. Get assistants
        print("\n2. Getting available assistants...")
        assistants_response = await session.get(
            f"{API_BASE_URL}/assistants",
            headers=headers
        )
        
        if assistants_response.status != 200:
            print(f"❌ Failed to get assistants: {assistants_response.status}")
            return False
            
        assistants_data = await assistants_response.json()
        assistants = assistants_data.get("assistants", [])
        
        if not assistants:
            print("❌ No assistants available")
            return False
            
        assistant_id = assistants[0]["id"]
        print(f"✅ Using assistant: {assistants[0]['name']}")
        
        # 3. Create a chat with assistant
        print("\n3. Creating chat with assistant...")
        create_chat_response = await session.post(
            f"{API_BASE_URL}/chat/chats",
            headers=headers,
            json={
                "title": f"AR-110 Test Chat {datetime.now().isoformat()}",
                "description": "Testing transaction error fix",
                "chat_type": "general",
                "assistant_id": assistant_id,
                "is_private": True
            }
        )
        
        if create_chat_response.status != 200:
            print(f"❌ Failed to create chat: {create_chat_response.status}")
            return False
            
        chat_data = await create_chat_response.json()
        chat_id = chat_data["id"]
        print(f"✅ Chat created: {chat_id}")
        
        # 4. Send multiple messages quickly to test transaction handling
        print("\n4. Testing transaction handling with multiple messages...")
        
        test_messages = [
            "Hello, this is test message 1",
            "Can you help me with something?",
            "What is the weather today?"
        ]
        
        success_count = 0
        error_count = 0
        
        for i, message in enumerate(test_messages, 1):
            print(f"\n   Sending message {i}/{len(test_messages)}: '{message}'")
            
            try:
                ai_response = await session.post(
                    f"{API_BASE_URL}/chat/chats/{chat_id}/ai-message",
                    headers=headers,
                    json={
                        "message": message,
                        "save_to_history": True,
                        "stream": True
                    }
                )
                
                if ai_response.status == 200:
                    print(f"   ✅ Message {i} sent successfully")
                    success_count += 1
                    
                    # Wait a bit for streaming to complete
                    await asyncio.sleep(3)
                else:
                    response_text = await ai_response.text()
                    print(f"   ❌ Message {i} failed: {ai_response.status}")
                    print(f"   Error: {response_text}")
                    
                    # Check if it's the transaction error
                    if "InFailedSQLTransactionError" in response_text:
                        print("   ⚠️  TRANSACTION ERROR DETECTED - Fix not working!")
                        error_count += 1
                    else:
                        error_count += 1
                        
            except Exception as e:
                print(f"   ❌ Exception sending message {i}: {e}")
                error_count += 1
        
        # 5. Get chat history to verify messages were saved
        print("\n5. Verifying chat history...")
        history_response = await session.get(
            f"{API_BASE_URL}/chat/chats/{chat_id}/messages",
            headers=headers
        )
        
        if history_response.status == 200:
            history_data = await history_response.json()
            message_count = len(history_data.get("messages", []))
            print(f"✅ Chat history retrieved: {message_count} messages")
        else:
            print(f"❌ Failed to get chat history: {history_response.status}")
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST RESULTS:")
        print(f"✅ Successful messages: {success_count}/{len(test_messages)}")
        print(f"❌ Failed messages: {error_count}/{len(test_messages)}")
        
        if error_count == 0:
            print("\n🎉 SUCCESS: AR-110 fix is working! No transaction errors detected.")
            return True
        else:
            print("\n⚠️  FAILURE: Transaction errors still occurring. Fix needs review.")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_chat_transaction_fix())
    exit(0 if result else 1)