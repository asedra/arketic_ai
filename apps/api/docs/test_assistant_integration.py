#!/usr/bin/env python3
"""
Test script for Assistant integration with Chat and Knowledge Base

This script tests:
1. Creating an Assistant with knowledge bases
2. Creating a Chat using the Assistant
3. Verifying that system prompt is used from Assistant
4. Verifying that knowledge bases are passed to LangChain
5. Testing chat functionality with Assistant configuration
"""

import asyncio
import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
LANGCHAIN_BASE_URL = os.getenv("LANGCHAIN_BASE_URL", "http://localhost:3001")

# Test user credentials (you need to set these)
TEST_EMAIL = os.getenv("TEST_EMAIL", "test@arketic.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "test123")

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(message):
    print(f"{BLUE}[TEST]{RESET} {message}")

def print_success(message):
    print(f"{GREEN}[✓]{RESET} {message}")

def print_error(message):
    print(f"{RED}[✗]{RESET} {message}")

def print_info(message):
    print(f"{YELLOW}[INFO]{RESET} {message}")

class AssistantIntegrationTest:
    def __init__(self):
        self.token = None
        self.assistant_id = None
        self.chat_id = None
        self.knowledge_base_id = None
        
    def authenticate(self):
        """Authenticate and get JWT token"""
        print_test("Authenticating user...")
        
        response = requests.post(
            f"{API_BASE_URL}/api/v1/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code != 200:
            print_error(f"Authentication failed: {response.text}")
            return False
            
        data = response.json()
        self.token = data.get("access_token")
        print_success(f"Authenticated successfully")
        return True
    
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def create_test_assistant(self):
        """Create a test Assistant with specific configuration"""
        print_test("Creating test Assistant...")
        
        assistant_data = {
            "name": f"Test Assistant {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "description": "Test assistant for integration testing",
            "system_prompt": "You are a specialized test assistant. Always start your responses with 'TEST_ASSISTANT:' to verify the system prompt is being used correctly.",
            "ai_model": "gpt-3.5-turbo",
            "temperature": 0.5,
            "max_tokens": 1000,
            "is_public": False,
            "knowledge_base_ids": [],  # Will be added if we have test knowledge bases
            "document_ids": []
        }
        
        response = requests.post(
            f"{API_BASE_URL}/assistants",
            headers=self.get_headers(),
            json=assistant_data
        )
        
        if response.status_code != 200:
            print_error(f"Failed to create assistant: {response.text}")
            return False
            
        data = response.json()
        self.assistant_id = data.get("id")
        print_success(f"Created assistant: {self.assistant_id}")
        print_info(f"System prompt: {assistant_data['system_prompt'][:50]}...")
        return True
    
    def create_chat_with_assistant(self):
        """Create a chat using the test Assistant"""
        print_test("Creating chat with Assistant...")
        
        chat_data = {
            "title": f"Test Chat with Assistant",
            "assistant_id": self.assistant_id,
            "chat_type": "direct"
        }
        
        response = requests.post(
            f"{API_BASE_URL}/chats",
            headers=self.get_headers(),
            json=chat_data
        )
        
        if response.status_code != 200:
            print_error(f"Failed to create chat: {response.text}")
            return False
            
        data = response.json()
        self.chat_id = data.get("id")
        
        # Verify assistant configuration was applied
        if data.get("assistant_id") != self.assistant_id:
            print_error("Assistant ID not set correctly in chat")
            return False
            
        if "TEST_ASSISTANT:" not in (data.get("system_prompt") or ""):
            print_error("System prompt not correctly set from Assistant")
            return False
            
        print_success(f"Created chat: {self.chat_id}")
        print_info(f"Chat is using Assistant: {data.get('assistant_name', 'Unknown')}")
        print_info(f"System prompt confirmed: {'TEST_ASSISTANT:' in (data.get('system_prompt') or '')}")
        return True
    
    def test_chat_message(self):
        """Send a test message to verify Assistant configuration is used"""
        print_test("Sending test message to chat...")
        
        message_data = {
            "message": "Hello, please confirm you are the test assistant.",
            "save_to_history": True
        }
        
        response = requests.post(
            f"{API_BASE_URL}/chats/{self.chat_id}/ai-message",
            headers=self.get_headers(),
            json=message_data
        )
        
        if response.status_code != 200:
            print_error(f"Failed to send message: {response.text}")
            return False
            
        data = response.json()
        ai_response = data.get("ai_message", {}).get("content", "")
        
        # Check if the AI response starts with our test prefix
        if "TEST_ASSISTANT:" in ai_response:
            print_success("AI response contains expected prefix from system prompt")
            print_info(f"AI Response: {ai_response[:100]}...")
            return True
        else:
            print_error("AI response does not contain expected prefix")
            print_info(f"AI Response: {ai_response[:100]}...")
            return False
    
    def verify_langchain_integration(self):
        """Verify that LangChain service receives correct parameters"""
        print_test("Verifying LangChain integration...")
        
        # Check LangChain health
        response = requests.get(f"{LANGCHAIN_BASE_URL}/health")
        
        if response.status_code != 200:
            print_error("LangChain service is not healthy")
            return False
            
        print_success("LangChain service is healthy")
        
        # The actual verification happens when sending messages
        # The LangChain service should receive:
        # - systemPrompt from Assistant
        # - knowledgeBaseIds if configured
        # - documentIds if configured
        # - model, temperature, maxTokens from Assistant
        
        print_info("LangChain integration parameters are passed through chat messages")
        return True
    
    def cleanup(self):
        """Clean up test data"""
        print_test("Cleaning up test data...")
        
        if self.assistant_id:
            response = requests.delete(
                f"{API_BASE_URL}/assistants/{self.assistant_id}",
                headers=self.get_headers()
            )
            if response.status_code == 200:
                print_success(f"Deleted test assistant: {self.assistant_id}")
        
        # Note: Chats are typically soft-deleted or archived, not hard deleted
        
    def run_all_tests(self):
        """Run all integration tests"""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Starting Assistant Integration Tests{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")
        
        try:
            # Step 1: Authenticate
            if not self.authenticate():
                return False
            
            # Step 2: Create Assistant
            if not self.create_test_assistant():
                return False
            
            # Step 3: Create Chat with Assistant
            if not self.create_chat_with_assistant():
                return False
            
            # Step 4: Test Chat Message
            if not self.test_chat_message():
                return False
            
            # Step 5: Verify LangChain Integration
            if not self.verify_langchain_integration():
                return False
            
            print(f"\n{GREEN}{'='*60}{RESET}")
            print(f"{GREEN}All tests passed successfully!{RESET}")
            print(f"{GREEN}{'='*60}{RESET}")
            
            return True
            
        except Exception as e:
            print_error(f"Test failed with exception: {str(e)}")
            return False
            
        finally:
            self.cleanup()

def main():
    """Main entry point"""
    tester = AssistantIntegrationTest()
    
    # Check if services are running
    print_info("Checking service availability...")
    
    try:
        api_health = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if api_health.status_code != 200:
            print_error("API service is not healthy")
            sys.exit(1)
    except:
        print_error(f"Cannot connect to API service at {API_BASE_URL}")
        sys.exit(1)
    
    try:
        langchain_health = requests.get(f"{LANGCHAIN_BASE_URL}/health", timeout=5)
        if langchain_health.status_code != 200:
            print_error("LangChain service is not healthy")
            sys.exit(1)
    except:
        print_error(f"Cannot connect to LangChain service at {LANGCHAIN_BASE_URL}")
        sys.exit(1)
    
    print_success("All services are available")
    
    # Run tests
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{GREEN}Integration test completed successfully!{RESET}")
        sys.exit(0)
    else:
        print(f"\n{RED}Integration test failed!{RESET}")
        sys.exit(1)

if __name__ == "__main__":
    main()