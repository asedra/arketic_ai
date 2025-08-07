#!/usr/bin/env python3
"""
Comprehensive End-to-End Tests for Chat System
Tests backend API endpoints, WebSocket connections, and integration flow
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional

import pytest
import httpx
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

# Test Configuration
BASE_URL = "http://localhost:8000"
WS_BASE_URL = "ws://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api/v1"
CHAT_API_URL = f"{API_BASE_URL}/chat"

# Test Data
TEST_USER_DATA = {
    "email": "test@example.com",
    "password": "testpassword123",
    "username": "testuser"
}

TEST_CHAT_DATA = {
    "title": "Test Chat",
    "description": "Test chat for automated testing",
    "ai_model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "max_tokens": 2048,
    "is_private": False
}

TEST_MESSAGE_DATA = {
    "content": "Hello, this is a test message!",
    "message_type": "user"
}

class ChatAPITestSuite:
    """Comprehensive Chat API Test Suite"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token: Optional[str] = None
        self.test_chat_id: Optional[str] = None
        self.test_results: Dict[str, Any] = {
            "passed": 0,
            "failed": 0,
            "errors": [],
            "start_time": datetime.now(),
            "end_time": None
        }
    
    async def setup(self):
        """Setup test environment and authentication"""
        print("🚀 Setting up Chat API Test Suite...")
        
        try:
            # Test database health first
            await self._test_database_health()
            
            # Setup authentication
            await self._setup_auth()
            
            print("✅ Test setup completed successfully")
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup test resources"""
        print("🧹 Cleaning up test resources...")
        
        try:
            # Delete test chat if created
            if self.test_chat_id:
                await self._delete_test_chat()
            
            # Close HTTP client
            await self.client.aclose()
            
            print("✅ Cleanup completed")
            
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
    
    async def _test_database_health(self):
        """Test database connectivity"""
        print("📊 Testing database health...")
        
        response = await self.client.get(f"{BASE_URL}/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        
        health_data = response.json()
        assert health_data.get("database", {}).get("status") == "healthy", "Database not healthy"
        
        print("✅ Database health check passed")
    
    async def _setup_auth(self):
        """Setup authentication for tests"""
        print("🔐 Setting up authentication...")
        
        # Try to login with test user
        login_response = await self.client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": TEST_USER_DATA["email"], "password": TEST_USER_DATA["password"]}
        )
        
        if login_response.status_code != 200:
            # User doesn't exist, create it
            print("👤 Creating test user...")
            register_response = await self.client.post(
                f"{API_BASE_URL}/auth/register",
                json=TEST_USER_DATA
            )
            
            if register_response.status_code not in [200, 201]:
                raise Exception(f"Failed to create test user: {register_response.status_code} - {register_response.text}")
            
            # Try login again
            login_response = await self.client.post(
                f"{API_BASE_URL}/auth/login",
                json={"email": TEST_USER_DATA["email"], "password": TEST_USER_DATA["password"]}
            )
        
        if login_response.status_code != 200:
            raise Exception(f"Failed to authenticate: {login_response.status_code} - {login_response.text}")
        
        auth_data = login_response.json()
        self.auth_token = auth_data.get("access_token")
        
        if not self.auth_token:
            raise Exception("No auth token received")
        
        # Set authorization header for all subsequent requests
        self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"})
        
        print("✅ Authentication setup completed")
    
    async def _delete_test_chat(self):
        """Delete test chat if it exists"""
        if not self.test_chat_id:
            return
            
        try:
            response = await self.client.delete(f"{CHAT_API_URL}/chats/{self.test_chat_id}")
            if response.status_code in [200, 404]:  # 404 is ok, chat might not exist
                print(f"✅ Test chat {self.test_chat_id} deleted")
            else:
                print(f"⚠️ Failed to delete test chat: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Error deleting test chat: {e}")
    
    def _record_test_result(self, test_name: str, passed: bool, error_message: str = None):
        """Record test result"""
        if passed:
            self.test_results["passed"] += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.test_results["failed"] += 1
            error_info = {
                "test": test_name,
                "error": error_message,
                "timestamp": datetime.now().isoformat()
            }
            self.test_results["errors"].append(error_info)
            print(f"❌ {test_name} - FAILED: {error_message}")
    
    async def test_create_chat(self):
        """Test chat creation endpoint"""
        test_name = "Create Chat API"
        
        try:
            response = await self.client.post(
                f"{CHAT_API_URL}/chats",
                json=TEST_CHAT_DATA
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            chat_data = response.json()
            assert "id" in chat_data, "Chat ID not returned"
            assert chat_data["title"] == TEST_CHAT_DATA["title"], "Chat title mismatch"
            assert chat_data["ai_model"] == TEST_CHAT_DATA["ai_model"], "AI model mismatch"
            
            self.test_chat_id = chat_data["id"]
            
            self._record_test_result(test_name, True)
            return chat_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_get_user_chats(self):
        """Test get user chats endpoint"""
        test_name = "Get User Chats API"
        
        try:
            response = await self.client.get(f"{CHAT_API_URL}/chats")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            chats_data = response.json()
            assert isinstance(chats_data, list), "Expected list of chats"
            
            if self.test_chat_id:
                # Check if our test chat is in the list
                test_chat_found = any(chat["id"] == self.test_chat_id for chat in chats_data)
                assert test_chat_found, "Test chat not found in user chats"
            
            self._record_test_result(test_name, True)
            return chats_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_send_message(self):
        """Test send message endpoint"""
        test_name = "Send Message API"
        
        if not self.test_chat_id:
            self._record_test_result(test_name, False, "No test chat available")
            return None
        
        try:
            response = await self.client.post(
                f"{CHAT_API_URL}/chats/{self.test_chat_id}/messages",
                json=TEST_MESSAGE_DATA
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            message_data = response.json()
            assert "id" in message_data, "Message ID not returned"
            assert message_data["content"] == TEST_MESSAGE_DATA["content"], "Message content mismatch"
            assert message_data["chat_id"] == self.test_chat_id, "Chat ID mismatch"
            
            self._record_test_result(test_name, True)
            return message_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_get_chat_history(self):
        """Test get chat history endpoint"""
        test_name = "Get Chat History API"
        
        if not self.test_chat_id:
            self._record_test_result(test_name, False, "No test chat available")
            return None
        
        try:
            response = await self.client.get(f"{CHAT_API_URL}/chats/{self.test_chat_id}")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            history_data = response.json()
            assert "chat" in history_data, "Chat data not returned"
            assert "messages" in history_data, "Messages not returned"
            assert isinstance(history_data["messages"], list), "Messages should be a list"
            
            # Check if our test message is there
            if history_data["messages"]:
                test_message_found = any(
                    msg["content"] == TEST_MESSAGE_DATA["content"] 
                    for msg in history_data["messages"]
                )
                assert test_message_found, "Test message not found in chat history"
            
            self._record_test_result(test_name, True)
            return history_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_websocket_connection(self):
        """Test WebSocket connection and messaging"""
        test_name = "WebSocket Connection"
        
        if not self.test_chat_id:
            self._record_test_result(test_name, False, "No test chat available")
            return
        
        try:
            ws_url = f"{WS_BASE_URL}/api/v1/chat/chats/{self.test_chat_id}/ws"
            
            # Add auth header for WebSocket connection
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            async with websockets.connect(ws_url, extra_headers=headers, ping_interval=10, ping_timeout=5) as websocket:
                
                # Wait for welcome message
                welcome_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                welcome_data = json.loads(welcome_message)
                
                assert welcome_data.get("type") == "welcome", f"Expected welcome message, got: {welcome_data}"
                print(f"📨 Received welcome: {welcome_data}")
                
                # Send ping message
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send(json.dumps(ping_message))
                
                # Wait for pong response
                pong_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                pong_data = json.loads(pong_response)
                
                assert pong_data.get("type") == "pong", f"Expected pong response, got: {pong_data}"
                print(f"🏓 Received pong: {pong_data}")
                
                self._record_test_result(test_name, True)
                
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
    
    async def test_websocket_message_broadcast(self):
        """Test WebSocket message broadcasting"""
        test_name = "WebSocket Message Broadcasting"
        
        if not self.test_chat_id:
            self._record_test_result(test_name, False, "No test chat available")
            return
        
        try:
            ws_url = f"{WS_BASE_URL}/api/v1/chat/chats/{self.test_chat_id}/ws"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Connect WebSocket first
            async with websockets.connect(ws_url, extra_headers=headers, ping_interval=10, ping_timeout=5) as websocket:
                
                # Skip welcome message
                await asyncio.wait_for(websocket.recv(), timeout=5.0)
                
                # Send a message via HTTP API
                test_message = {
                    "content": "WebSocket broadcast test message",
                    "message_type": "user"
                }
                
                # Send message via HTTP
                http_response = await self.client.post(
                    f"{CHAT_API_URL}/chats/{self.test_chat_id}/messages",
                    json=test_message
                )
                
                assert http_response.status_code == 200, "HTTP message send failed"
                
                # Wait for WebSocket broadcast
                broadcast_message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                broadcast_data = json.loads(broadcast_message)
                
                assert broadcast_data.get("type") == "new_message", f"Expected new_message broadcast, got: {broadcast_data}"
                assert broadcast_data.get("message", {}).get("content") == test_message["content"], "Broadcast content mismatch"
                
                print(f"📡 Received broadcast: {broadcast_data}")
                
                self._record_test_result(test_name, True)
                
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
    
    async def test_chat_stats_endpoint(self):
        """Test chat statistics endpoint"""
        test_name = "Chat Stats API"
        
        try:
            response = await self.client.get(f"{CHAT_API_URL}/stats")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            stats_data = response.json()
            assert "websocket_connections" in stats_data, "WebSocket connections stats missing"
            assert "system_status" in stats_data, "System status missing"
            
            self._record_test_result(test_name, True)
            return stats_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_chat_connection_test_endpoint(self):
        """Test chat connection test endpoint"""
        test_name = "Chat Connection Test API"
        
        try:
            response = await self.client.post(f"{CHAT_API_URL}/test/connection")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            test_data = response.json()
            assert test_data.get("success") is True, "Connection test should succeed"
            assert "data" in test_data, "Test data missing"
            
            test_result_data = test_data["data"]
            assert "database" in test_result_data, "Database test missing"
            assert "websocket_manager" in test_result_data, "WebSocket manager test missing"
            
            self._record_test_result(test_name, True)
            return test_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_error_handling(self):
        """Test API error handling"""
        test_name = "Error Handling"
        
        try:
            # Test non-existent chat
            response = await self.client.get(f"{CHAT_API_URL}/chats/non-existent-chat-id")
            assert response.status_code == 404, f"Expected 404 for non-existent chat, got {response.status_code}"
            
            # Test invalid message data
            response = await self.client.post(
                f"{CHAT_API_URL}/chats/{self.test_chat_id or 'test'}/messages",
                json={"invalid": "data"}
            )
            assert response.status_code in [400, 422], f"Expected 400/422 for invalid data, got {response.status_code}"
            
            # Test unauthorized access (remove auth header temporarily)
            original_headers = self.client.headers.copy()
            self.client.headers.pop("Authorization", None)
            
            response = await self.client.get(f"{CHAT_API_URL}/chats")
            assert response.status_code in [401, 403], f"Expected 401/403 for unauthorized access, got {response.status_code}"
            
            # Restore auth header
            self.client.headers.update(original_headers)
            
            self._record_test_result(test_name, True)
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
    
    async def run_all_tests(self):
        """Run all chat system tests"""
        print("🧪 Starting Chat System End-to-End Tests\n")
        
        try:
            await self.setup()
            
            # Run API tests
            print("\n📡 Running API Endpoint Tests...")
            await self.test_create_chat()
            await self.test_get_user_chats()
            await self.test_send_message()
            await self.test_get_chat_history()
            await self.test_chat_stats_endpoint()
            await self.test_chat_connection_test_endpoint()
            
            # Run WebSocket tests
            print("\n🔌 Running WebSocket Tests...")
            await self.test_websocket_connection()
            await self.test_websocket_message_broadcast()
            
            # Run error handling tests
            print("\n🚨 Running Error Handling Tests...")
            await self.test_error_handling()
            
        finally:
            await self.cleanup()
            self.test_results["end_time"] = datetime.now()
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        results = self.test_results
        total_tests = results["passed"] + results["failed"]
        success_rate = (results["passed"] / total_tests * 100) if total_tests > 0 else 0
        duration = (results["end_time"] - results["start_time"]).total_seconds()
        
        print("\n" + "="*80)
        print("🎯 CHAT SYSTEM TEST SUMMARY")
        print("="*80)
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {results['passed']}")
        print(f"❌ Failed: {results['failed']}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"⏱️ Duration: {duration:.2f} seconds")
        print(f"🕒 Completed: {results['end_time'].strftime('%Y-%m-%d %H:%M:%S')}")
        
        if results["errors"]:
            print("\n❌ FAILED TESTS:")
            print("-" * 40)
            for error in results["errors"]:
                print(f"• {error['test']}: {error['error']}")
        
        print("\n" + "="*80)
        
        if results["failed"] == 0:
            print("🎉 ALL TESTS PASSED! Chat system is fully functional.")
        else:
            print(f"⚠️ {results['failed']} test(s) failed. Please review the errors above.")
        
        return results


async def main():
    """Main test execution function"""
    test_suite = ChatAPITestSuite()
    
    try:
        await test_suite.run_all_tests()
        results = test_suite.print_test_summary()
        
        # Exit with appropriate code
        exit_code = 0 if results["failed"] == 0 else 1
        return exit_code
        
    except KeyboardInterrupt:
        print("\n\n🛑 Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {e}")
        return 1


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)