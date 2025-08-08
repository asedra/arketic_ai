#!/usr/bin/env python3
"""
Test script for AI message endpoint with assistant requirement
Tests that the /api/v1/chat/chats/{chat_id}/ai-message endpoint requires an assistant
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# Test credentials
TEST_USER = {
    "email": "test@arketic.com",
    "password": "Test123!@#"
}

class AIMessageAssistantTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_prefix = API_PREFIX
        self.token = None
        self.headers = {}
        self.test_results = []
        
    async def login(self) -> bool:
        """Login and get access token"""
        async with aiohttp.ClientSession() as session:
            login_url = f"{self.base_url}{self.api_prefix}/auth/login"
            
            async with session.post(login_url, json=TEST_USER) as response:
                if response.status == 200:
                    data = await response.json()
                    self.token = data.get("access_token")
                    self.headers = {
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/json"
                    }
                    print("✅ Login successful")
                    return True
                else:
                    print(f"❌ Login failed: {response.status}")
                    return False
    
    async def create_assistant(self) -> Optional[str]:
        """Create a test assistant with knowledge bases"""
        async with aiohttp.ClientSession() as session:
            assistant_data = {
                "name": f"Test Assistant {datetime.now().isoformat()}",
                "description": "Test assistant for AI message testing",
                "system_prompt": "You are a helpful test assistant. Always be concise.",
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 2048,
                "is_public": False
            }
            
            url = f"{self.base_url}{self.api_prefix}/assistants/"
            async with session.post(url, json=assistant_data, headers=self.headers) as response:
                if response.status == 200:
                    data = await response.json()
                    assistant_id = data.get("id")
                    print(f"✅ Created assistant: {assistant_id}")
                    return assistant_id
                else:
                    error = await response.text()
                    print(f"❌ Failed to create assistant: {error}")
                    return None
    
    async def create_chat_with_assistant(self, assistant_id: str) -> Optional[str]:
        """Create a chat with an assistant"""
        async with aiohttp.ClientSession() as session:
            chat_data = {
                "title": f"Test Chat with Assistant {datetime.now().isoformat()}",
                "description": "Testing AI message with assistant",
                "chat_type": "DIRECT",
                "assistant_id": assistant_id,
                "is_private": False
            }
            
            url = f"{self.base_url}{self.api_prefix}/chat/chats"
            async with session.post(url, json=chat_data, headers=self.headers) as response:
                if response.status == 200:
                    data = await response.json()
                    chat_id = data.get("id")
                    print(f"✅ Created chat with assistant: {chat_id}")
                    return chat_id
                else:
                    error = await response.text()
                    print(f"❌ Failed to create chat with assistant: {error}")
                    return None
    
    async def create_chat_without_assistant(self) -> Optional[str]:
        """Create a chat without an assistant"""
        async with aiohttp.ClientSession() as session:
            chat_data = {
                "title": f"Test Chat without Assistant {datetime.now().isoformat()}",
                "description": "Testing AI message without assistant",
                "chat_type": "DIRECT",
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "is_private": False
            }
            
            url = f"{self.base_url}{self.api_prefix}/chat/chats"
            async with session.post(url, json=chat_data, headers=self.headers) as response:
                if response.status == 200:
                    data = await response.json()
                    chat_id = data.get("id")
                    print(f"✅ Created chat without assistant: {chat_id}")
                    return chat_id
                else:
                    error = await response.text()
                    print(f"❌ Failed to create chat without assistant: {error}")
                    return None
    
    async def test_ai_message(self, chat_id: str, test_name: str) -> Dict[str, Any]:
        """Test sending an AI message to a chat"""
        async with aiohttp.ClientSession() as session:
            message_data = {
                "message": "Hello, can you help me with Python?",
                "stream": False,
                "save_to_history": True
            }
            
            url = f"{self.base_url}{self.api_prefix}/chat/chats/{chat_id}/ai-message"
            async with session.post(url, json=message_data, headers=self.headers) as response:
                result = {
                    "test_name": test_name,
                    "chat_id": chat_id,
                    "status_code": response.status,
                    "success": False,
                    "message": ""
                }
                
                response_text = await response.text()
                try:
                    response_data = json.loads(response_text)
                except:
                    response_data = {"detail": response_text}
                
                if response.status == 200:
                    result["success"] = True
                    result["message"] = "AI message sent successfully"
                    result["response_data"] = response_data
                elif response.status == 400:
                    # Expected for chats without assistant
                    detail = response_data.get("detail", "")
                    if "assistant" in detail.lower():
                        result["message"] = f"Expected error: {detail}"
                    else:
                        result["message"] = f"Unexpected error: {detail}"
                else:
                    result["message"] = f"Unexpected status: {response_data}"
                
                return result
    
    async def deactivate_assistant(self, assistant_id: str) -> bool:
        """Deactivate an assistant"""
        async with aiohttp.ClientSession() as session:
            update_data = {
                "status": "inactive"
            }
            
            url = f"{self.base_url}{self.api_prefix}/assistants/{assistant_id}"
            async with session.put(url, json=update_data, headers=self.headers) as response:
                if response.status == 200:
                    print(f"✅ Deactivated assistant: {assistant_id}")
                    return True
                else:
                    error = await response.text()
                    print(f"❌ Failed to deactivate assistant: {error}")
                    return False
    
    async def run_tests(self):
        """Run all test scenarios"""
        print("\n" + "="*60)
        print("AI MESSAGE ASSISTANT REQUIREMENT TESTS")
        print("="*60 + "\n")
        
        # Login
        if not await self.login():
            print("❌ Cannot proceed without login")
            return
        
        # Test 1: Chat without assistant
        print("\n📝 Test 1: AI message to chat WITHOUT assistant")
        print("-" * 40)
        chat_no_assistant = await self.create_chat_without_assistant()
        if chat_no_assistant:
            result = await self.test_ai_message(chat_no_assistant, "Chat without assistant")
            self.test_results.append(result)
            if result["status_code"] == 400 and "assistant" in result["message"].lower():
                print(f"✅ PASS: {result['message']}")
            else:
                print(f"❌ FAIL: Expected 400 with assistant error, got: {result['message']}")
        
        # Test 2: Chat with active assistant
        print("\n📝 Test 2: AI message to chat WITH active assistant")
        print("-" * 40)
        assistant_id = await self.create_assistant()
        if assistant_id:
            chat_with_assistant = await self.create_chat_with_assistant(assistant_id)
            if chat_with_assistant:
                result = await self.test_ai_message(chat_with_assistant, "Chat with active assistant")
                self.test_results.append(result)
                if result["success"]:
                    print(f"✅ PASS: {result['message']}")
                else:
                    print(f"⚠️  {result['message']}")
        
        # Test 3: Chat with inactive assistant
        print("\n📝 Test 3: AI message to chat WITH inactive assistant")
        print("-" * 40)
        inactive_assistant_id = await self.create_assistant()
        if inactive_assistant_id:
            chat_with_inactive = await self.create_chat_with_assistant(inactive_assistant_id)
            if chat_with_inactive:
                # Deactivate the assistant
                await self.deactivate_assistant(inactive_assistant_id)
                result = await self.test_ai_message(chat_with_inactive, "Chat with inactive assistant")
                self.test_results.append(result)
                if result["status_code"] == 400 and ("not active" in result["message"].lower() or "inactive" in result["message"].lower()):
                    print(f"✅ PASS: {result['message']}")
                else:
                    print(f"❌ FAIL: Expected 400 with inactive assistant error, got: {result['message']}")
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = 0
        failed = 0
        
        for result in self.test_results:
            status = "✅ PASS" if (
                (result["test_name"] == "Chat without assistant" and result["status_code"] == 400) or
                (result["test_name"] == "Chat with active assistant" and result["success"]) or
                (result["test_name"] == "Chat with inactive assistant" and result["status_code"] == 400)
            ) else "❌ FAIL"
            
            if "PASS" in status:
                passed += 1
            else:
                failed += 1
            
            print(f"{status} - {result['test_name']}: {result['message'][:100]}")
        
        print(f"\nTotal: {len(self.test_results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed == 0:
            print("\n🎉 All tests passed! Assistant requirement is working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please check the implementation.")

async def main():
    tester = AIMessageAssistantTester()
    await tester.run_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")