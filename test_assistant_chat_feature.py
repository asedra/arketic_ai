#!/usr/bin/env python3
"""
Test script to verify AR-71: Chat Enhancement with Assistant Selection
Tests all acceptance criteria from the Jira task.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@arketic.com" 
TEST_PASSWORD = "testpass123"

class AssistantChatFeatureTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_base = API_BASE
        self.token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test result"""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
            
    def authenticate(self):
        """Authenticate and get JWT token"""
        try:
            response = requests.post(f"{self.api_base}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("Authentication", True, f"Authenticated as user {self.user_id}")
                return True
            else:
                self.log_test("Authentication", False, f"Failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Error: {str(e)}")
            return False
    
    def get_headers(self):
        """Get headers with JWT token"""
        return {"Authorization": f"Bearer {self.token}"}
    
    def test_available_assistants_endpoint(self):
        """Test the endpoint that lists available assistants for chat"""
        try:
            response = requests.get(
                f"{self.api_base}/chat/assistants/available",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                assistants = data.get("data", {}).get("assistants", [])
                self.log_test(
                    "Available Assistants Endpoint", 
                    True, 
                    f"Found {len(assistants)} available assistants",
                    {"assistant_count": len(assistants), "assistants": assistants[:2]}  # Log first 2
                )
                return assistants
            else:
                self.log_test("Available Assistants Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return []
                
        except Exception as e:
            self.log_test("Available Assistants Endpoint", False, f"Error: {str(e)}")
            return []
    
    def test_chat_creation_with_assistant(self, assistant_id, assistant_name):
        """Test creating a chat with an assistant"""
        try:
            chat_data = {
                "title": f"Test Chat with {assistant_name}",
                "description": f"Testing AR-71 - Chat created with assistant {assistant_name}",
                "chat_type": "direct",
                "assistant_id": assistant_id,
                "temperature": 0.7,
                "max_tokens": 2048
            }
            
            response = requests.post(
                f"{self.api_base}/chat/chats",
                headers=self.get_headers(),
                json=chat_data
            )
            
            if response.status_code == 200:
                data = response.json()
                chat_id = data["id"]
                returned_assistant_id = data.get("assistant_id")
                returned_assistant_name = data.get("assistant_name")
                
                self.log_test(
                    f"Chat Creation with Assistant ({assistant_name})", 
                    True, 
                    f"Chat {chat_id} created with assistant {returned_assistant_name} ({returned_assistant_id})",
                    {
                        "chat_id": chat_id,
                        "assistant_id": returned_assistant_id,
                        "assistant_name": returned_assistant_name,
                        "ai_model": data.get("ai_model")
                    }
                )
                return chat_id
            else:
                self.log_test(f"Chat Creation with Assistant ({assistant_name})", False, f"HTTP {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_test(f"Chat Creation with Assistant ({assistant_name})", False, f"Error: {str(e)}")
            return None
    
    def test_chat_history_with_assistant_info(self, chat_id, expected_assistant_name):
        """Test retrieving chat history includes assistant information"""
        try:
            response = requests.get(
                f"{self.api_base}/chat/chats/{chat_id}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                chat = data.get("chat", {})
                assistant_id = chat.get("assistant_id")
                assistant_name = chat.get("assistant_name")
                
                success = assistant_id is not None and assistant_name == expected_assistant_name
                
                self.log_test(
                    "Chat History with Assistant Info", 
                    success,
                    f"Assistant ID: {assistant_id}, Assistant Name: {assistant_name}",
                    {
                        "chat_id": chat_id,
                        "assistant_id": assistant_id,
                        "assistant_name": assistant_name,
                        "ai_model": chat.get("ai_model"),
                        "title": chat.get("title")
                    }
                )
                return success
            else:
                self.log_test("Chat History with Assistant Info", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Chat History with Assistant Info", False, f"Error: {str(e)}")
            return False
    
    def test_chat_listing_shows_assistant(self):
        """Test that chat listing shows assistant information"""
        try:
            response = requests.get(
                f"{self.api_base}/chat/chats",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                chats_with_assistants = [chat for chat in data if chat.get("assistant_id")]
                
                self.log_test(
                    "Chat Listing Shows Assistant Info", 
                    len(chats_with_assistants) > 0,
                    f"Found {len(chats_with_assistants)} chats with assistant information",
                    {"chats_with_assistants": len(chats_with_assistants)}
                )
                return len(chats_with_assistants) > 0
            else:
                self.log_test("Chat Listing Shows Assistant Info", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Chat Listing Shows Assistant Info", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all AR-71 acceptance criteria tests"""
        print(f"🧪 Testing AR-71: Chat Enhancement with Assistant Selection")
        print(f"📅 Test started at: {datetime.utcnow().isoformat()}")
        print(f"🔗 Testing against: {self.base_url}")
        print("-" * 80)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return
        
        # Step 2: Test available assistants endpoint
        assistants = self.test_available_assistants_endpoint()
        if not assistants:
            print("⚠️  No assistants available - skipping assistant-based tests")
            return
        
        # Step 3: Test chat creation with assistant (use first available assistant)
        first_assistant = assistants[0]
        assistant_id = first_assistant["id"]
        assistant_name = first_assistant["name"]
        
        chat_id = self.test_chat_creation_with_assistant(assistant_id, assistant_name)
        if not chat_id:
            print("❌ Chat creation failed - cannot test further features")
            return
        
        # Step 4: Test chat history retrieval includes assistant info
        self.test_chat_history_with_assistant_info(chat_id, assistant_name)
        
        # Step 5: Test chat listing shows assistant information
        self.test_chat_listing_shows_assistant()
        
        # Summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print test results summary"""
        print("-" * 80)
        total_tests = len(self.test_results)
        passed_tests = sum(1 for test in self.test_results if test["success"])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"📊 TEST SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   - {test['test_name']}: {test['message']}")
        
        # Write detailed results to file
        report_file = f"ar71_test_report_{int(time.time())}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "test_metadata": {
                    "test_type": "AR-71 Chat Enhancement with Assistant Selection",
                    "generated_at": datetime.utcnow().isoformat(),
                    "base_url": self.base_url,
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "failed_tests": failed_tests,
                    "success_rate_percent": success_rate
                },
                "test_results": self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed report saved to: {report_file}")

if __name__ == "__main__":
    tester = AssistantChatFeatureTester()
    tester.run_all_tests()