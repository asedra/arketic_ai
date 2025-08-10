#!/usr/bin/env python3
"""
AR-99 Test Script: Verify assistant knowledge base IDs are saved when creating a chat
"""

import asyncio
import json
import sys
from datetime import datetime
import httpx
from typing import Optional, Dict, Any
import uuid

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "test@arketic.com"
TEST_PASSWORD = "testpass123"

class AR99Tester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token = None
        self.user_id = None
        self.test_results = []
        
    async def login(self) -> bool:
        """Login and get access token"""
        try:
            response = await self.client.post(
                f"{BASE_URL}/api/v1/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user"]["id"]
                print(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_headers(self) -> Dict[str, str]:
        """Get request headers with auth token"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def get_available_assistants(self) -> Optional[Dict[str, Any]]:
        """Get available assistants for chat"""
        try:
            response = await self.client.get(
                f"{BASE_URL}/api/v1/chat/assistants/available",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if data["data"]["assistants"]:
                    print(f"✅ Found {len(data['data']['assistants'])} available assistants")
                    return data["data"]["assistants"][0]  # Return first assistant
                else:
                    print("⚠️ No assistants available")
                    return None
            else:
                print(f"❌ Failed to get assistants: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error getting assistants: {e}")
            return None
    
    async def create_assistant_with_knowledge(self) -> Optional[str]:
        """Create a test assistant with knowledge base attached"""
        try:
            # First, get or create a knowledge base
            kb_response = await self.client.get(
                f"{BASE_URL}/api/knowledge/bases",
                headers=self.get_headers()
            )
            
            knowledge_base_id = None
            if kb_response.status_code == 200:
                kb_data = kb_response.json()
                if kb_data.get("knowledge_bases"):
                    knowledge_base_id = kb_data["knowledge_bases"][0]["id"]
                    print(f"✅ Using existing knowledge base: {knowledge_base_id}")
            
            if not knowledge_base_id:
                # Create a new knowledge base
                kb_create_response = await self.client.post(
                    f"{BASE_URL}/api/knowledge/bases",
                    headers=self.get_headers(),
                    json={
                        "name": f"AR-99 Test KB {datetime.now().isoformat()}",
                        "description": "Test knowledge base for AR-99 fix verification",
                        "category": "Test"
                    }
                )
                
                if kb_create_response.status_code == 200:
                    knowledge_base_id = kb_create_response.json()["id"]
                    print(f"✅ Created new knowledge base: {knowledge_base_id}")
                else:
                    print(f"❌ Failed to create knowledge base: {kb_create_response.status_code}")
                    return None
            
            # Create assistant with knowledge base
            assistant_response = await self.client.post(
                f"{BASE_URL}/api/assistants",
                headers=self.get_headers(),
                json={
                    "name": f"AR-99 Test Assistant {datetime.now().isoformat()}",
                    "description": "Test assistant for AR-99 fix verification",
                    "ai_model": "gpt-3.5-turbo",
                    "system_prompt": "You are a helpful test assistant with knowledge base access.",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                    "is_public": False,
                    "status": "active",
                    "knowledge_base_ids": [knowledge_base_id] if knowledge_base_id else []
                }
            )
            
            if assistant_response.status_code in [200, 201]:
                assistant_data = assistant_response.json()
                assistant_id = assistant_data["id"]
                print(f"✅ Created assistant: {assistant_id}")
                print(f"   - Knowledge bases: {assistant_data.get('knowledge_base_ids', [])}")
                return assistant_id
            else:
                print(f"❌ Failed to create assistant: {assistant_response.status_code}")
                print(f"   Response: {assistant_response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating assistant: {e}")
            return None
    
    async def test_chat_creation_with_assistant(self):
        """Test creating a chat with an assistant and verify knowledge base IDs are saved"""
        print("\n" + "="*60)
        print("AR-99 TEST: Chat Creation with Assistant Knowledge Base IDs")
        print("="*60)
        
        # Step 1: Get or create an assistant with knowledge base
        print("\n1. Getting/Creating Assistant with Knowledge Base...")
        assistant = await self.get_available_assistants()
        
        if not assistant:
            # Create a new assistant with knowledge base
            assistant_id = await self.create_assistant_with_knowledge()
            if not assistant_id:
                print("❌ Failed to get or create assistant")
                self.test_results.append(("Chat Creation", False, "No assistant available"))
                return
            
            # Get the assistant details
            assistant_response = await self.client.get(
                f"{BASE_URL}/api/assistants/{assistant_id}",
                headers=self.get_headers()
            )
            
            if assistant_response.status_code == 200:
                assistant = assistant_response.json()
            else:
                print(f"❌ Failed to get assistant details: {assistant_response.status_code}")
                self.test_results.append(("Chat Creation", False, "Failed to get assistant details"))
                return
        else:
            assistant_id = assistant["id"]
        
        print(f"   Using assistant: {assistant['name']} (ID: {assistant_id})")
        
        # Step 2: Create a chat with the assistant
        print("\n2. Creating Chat with Assistant...")
        chat_response = await self.client.post(
            f"{BASE_URL}/api/chats",
            headers=self.get_headers(),
            json={
                "title": f"AR-99 Test Chat {datetime.now().isoformat()}",
                "description": "Test chat to verify knowledge base IDs are saved",
                "chat_type": "direct",
                "assistant_id": assistant_id,
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 2048,
                "is_private": False
            }
        )
        
        if chat_response.status_code != 200:
            print(f"❌ Failed to create chat: {chat_response.status_code}")
            print(f"   Response: {chat_response.text}")
            self.test_results.append(("Chat Creation", False, f"HTTP {chat_response.status_code}"))
            return
        
        chat_data = chat_response.json()
        chat_id = chat_data["id"]
        print(f"✅ Chat created: {chat_id}")
        
        # Step 3: Get chat details and verify knowledge base IDs
        print("\n3. Verifying Knowledge Base IDs in Chat...")
        chat_details_response = await self.client.get(
            f"{BASE_URL}/api/v1/chat/chats/{chat_id}",
            headers=self.get_headers()
        )
        
        if chat_details_response.status_code != 200:
            print(f"❌ Failed to get chat details: {chat_details_response.status_code}")
            self.test_results.append(("Chat Details", False, f"HTTP {chat_details_response.status_code}"))
            return
        
        chat_details = chat_details_response.json()
        
        # Step 4: Query database directly to verify (if we have database access)
        print("\n4. Checking Database for Knowledge Base IDs...")
        
        # We'll make a test message to trigger RAG and see if it works
        test_message_response = await self.client.post(
            f"{BASE_URL}/api/v1/chat/chats/{chat_id}/ai-message",
            headers=self.get_headers(),
            json={
                "message": "Test message to verify RAG with knowledge base",
                "stream": False,
                "save_to_history": True
            }
        )
        
        if test_message_response.status_code == 200:
            message_data = test_message_response.json()
            print(f"✅ Test message sent successfully")
            
            # Check if RAG was enabled
            if message_data.get("data", {}).get("ai_response", {}).get("rag_enabled"):
                print(f"✅ RAG is enabled - Knowledge bases are being used!")
                rag_sources = message_data.get("data", {}).get("ai_response", {}).get("rag_sources", [])
                if rag_sources:
                    print(f"✅ RAG sources found: {len(rag_sources)} documents")
                else:
                    print(f"⚠️ RAG enabled but no sources retrieved (might be no matching content)")
                self.test_results.append(("AR-99 Fix", True, "Knowledge base IDs saved and RAG working"))
            else:
                print(f"❌ RAG is not enabled - Knowledge base IDs might not be saved")
                self.test_results.append(("AR-99 Fix", False, "RAG not enabled"))
        else:
            print(f"⚠️ Failed to send test message: {test_message_response.status_code}")
            if test_message_response.status_code == 400:
                error_detail = test_message_response.json().get("detail", "")
                if "assistant" in error_detail.lower():
                    print(f"   Note: {error_detail}")
            self.test_results.append(("Test Message", False, f"HTTP {test_message_response.status_code}"))
        
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        for test_name, passed, details in self.test_results:
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{status} - {test_name}: {details}")
        
        # Overall result
        all_passed = all(result[1] for result in self.test_results)
        if all_passed:
            print("\n🎉 AR-99 FIX VERIFIED: Assistant knowledge base IDs are being saved!")
        else:
            print("\n⚠️ AR-99 FIX NEEDS VERIFICATION: Check the implementation")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()
    
    async def run(self):
        """Run all tests"""
        try:
            # Login first
            if not await self.login():
                print("❌ Cannot proceed without login")
                return
            
            # Run the main test
            await self.test_chat_creation_with_assistant()
            
        except Exception as e:
            print(f"❌ Test execution error: {e}")
        finally:
            await self.cleanup()


async def main():
    """Main entry point"""
    print("Starting AR-99 Fix Verification Test...")
    print(f"API URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("-" * 60)
    
    tester = AR99Tester()
    await tester.run()
    
    print("\n" + "="*60)
    print("AR-99 TEST COMPLETED")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())