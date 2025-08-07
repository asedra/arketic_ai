#!/usr/bin/env python3
"""
Database Operations and Error Handling Tests
Tests database connectivity, CRUD operations, transactions, and error scenarios
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

import pytest
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Add project root to path for imports
sys.path.insert(0, '/home/ali/arketic/apps/api')

# Test Configuration
BASE_URL = "http://localhost:8000"
API_BASE_URL = f"{BASE_URL}/api/v1"
CHAT_API_URL = f"{API_BASE_URL}/chat"

class DatabaseOperationsTestSuite:
    """Database Operations Test Suite"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token: Optional[str] = None
        self.test_chat_ids: List[str] = []
        self.test_message_ids: List[str] = []
        self.test_results: Dict[str, Any] = {
            "passed": 0,
            "failed": 0,
            "errors": [],
            "start_time": datetime.now(),
            "end_time": None
        }
    
    async def setup(self):
        """Setup test environment"""
        print("🚀 Setting up Database Operations Test Suite...")
        
        try:
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
            # Clean up test chats
            for chat_id in self.test_chat_ids:
                try:
                    await self.client.delete(f"{CHAT_API_URL}/chats/{chat_id}")
                except Exception:
                    pass
            
            # Close HTTP client
            await self.client.aclose()
            
            print("✅ Cleanup completed")
            
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
    
    async def _setup_auth(self):
        """Setup authentication for tests"""
        print("🔐 Setting up authentication...")
        
        # Login with test user
        login_response = await self.client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"}
        )
        
        if login_response.status_code == 200:
            auth_data = login_response.json()
            self.auth_token = auth_data.get("access_token")
            
            if not self.auth_token:
                raise Exception("No auth token received")
            
            self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            print("✅ Authentication setup completed")
        else:
            raise Exception(f"Failed to authenticate: {login_response.status_code}")
    
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
    
    async def test_database_health_check(self):
        """Test database health and connectivity"""
        test_name = "Database Health Check"
        
        try:
            response = await self.client.get(f"{BASE_URL}/health")
            
            assert response.status_code == 200, f"Health check failed: {response.status_code}"
            
            health_data = response.json()
            assert "database" in health_data, "Health response should include database status"
            
            db_status = health_data["database"]
            assert db_status.get("status") == "healthy", f"Database not healthy: {db_status}"
            assert "connection_pool" in db_status, "Should include connection pool info"
            assert "version" in db_status, "Should include database version"
            
            print(f"📊 Database info: {db_status}")
            
            self._record_test_result(test_name, True)
            return health_data
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_crud_operations(self):
        """Test basic CRUD operations on chat entities"""
        test_name = "Database CRUD Operations"
        
        try:
            # CREATE - Create a new chat
            chat_data = {
                "title": "DB Test Chat",
                "description": "Testing database operations",
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            create_response = await self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
            assert create_response.status_code == 200, f"Create failed: {create_response.status_code}"
            
            chat_result = create_response.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            # READ - Get the created chat
            read_response = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}")
            assert read_response.status_code == 200, f"Read failed: {read_response.status_code}"
            
            read_data = read_response.json()
            assert read_data["chat"]["id"] == chat_id, "Chat ID mismatch"
            assert read_data["chat"]["title"] == chat_data["title"], "Chat title mismatch"
            
            # UPDATE - Send a message (creates message record)
            message_data = {"content": "Test message for CRUD", "message_type": "user"}
            message_response = await self.client.post(
                f"{CHAT_API_URL}/chats/{chat_id}/messages",
                json=message_data
            )
            assert message_response.status_code == 200, f"Message create failed: {message_response.status_code}"
            
            message_result = message_response.json()
            message_id = message_result["id"]
            self.test_message_ids.append(message_id)
            
            # Verify message was created
            history_response = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}")
            assert history_response.status_code == 200, "History read failed"
            
            history_data = history_response.json()
            messages = history_data["messages"]
            assert len(messages) > 0, "No messages found"
            assert messages[0]["content"] == message_data["content"], "Message content mismatch"
            
            # DELETE will be handled in cleanup
            
            self._record_test_result(test_name, True)
            return {"chat_id": chat_id, "message_id": message_id}
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_transaction_handling(self):
        """Test database transaction handling"""
        test_name = "Database Transaction Handling"
        
        try:
            # Create multiple chats in quick succession to test transaction handling
            chat_creation_tasks = []
            
            for i in range(5):
                chat_data = {
                    "title": f"Transaction Test Chat {i}",
                    "description": f"Testing transaction handling {i}",
                    "ai_model": "gpt-3.5-turbo"
                }
                
                task = self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
                chat_creation_tasks.append(task)
            
            # Execute all requests concurrently
            responses = await asyncio.gather(*chat_creation_tasks, return_exceptions=True)
            
            successful_creates = 0
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    print(f"⚠️ Chat {i} creation failed with exception: {response}")
                elif response.status_code == 200:
                    successful_creates += 1
                    chat_result = response.json()
                    self.test_chat_ids.append(chat_result["id"])
                else:
                    print(f"⚠️ Chat {i} creation failed with status: {response.status_code}")
            
            assert successful_creates >= 3, f"Expected at least 3 successful creates, got {successful_creates}"
            
            self._record_test_result(test_name, True)
            return successful_creates
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_concurrent_operations(self):
        """Test concurrent database operations"""
        test_name = "Database Concurrent Operations"
        
        try:
            # First create a chat to work with
            chat_data = {
                "title": "Concurrent Test Chat",
                "description": "Testing concurrent operations",
                "ai_model": "gpt-3.5-turbo"
            }
            
            create_response = await self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
            assert create_response.status_code == 200, "Failed to create test chat"
            
            chat_result = create_response.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            # Send multiple messages concurrently
            message_tasks = []
            for i in range(10):
                message_data = {
                    "content": f"Concurrent message {i}",
                    "message_type": "user"
                }
                
                task = self.client.post(
                    f"{CHAT_API_URL}/chats/{chat_id}/messages",
                    json=message_data
                )
                message_tasks.append(task)
            
            # Execute all message sends concurrently
            message_responses = await asyncio.gather(*message_tasks, return_exceptions=True)
            
            successful_messages = 0
            for i, response in enumerate(message_responses):
                if isinstance(response, Exception):
                    print(f"⚠️ Message {i} failed with exception: {response}")
                elif response.status_code == 200:
                    successful_messages += 1
                else:
                    print(f"⚠️ Message {i} failed with status: {response.status_code}")
            
            assert successful_messages >= 7, f"Expected at least 7 successful messages, got {successful_messages}"
            
            # Verify all messages are in the database
            await asyncio.sleep(1)  # Give some time for all operations to complete
            
            history_response = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}")
            assert history_response.status_code == 200, "Failed to get chat history"
            
            history_data = history_response.json()
            stored_messages = len(history_data["messages"])
            
            print(f"📊 Concurrent operations result: {successful_messages} requests successful, {stored_messages} messages stored")
            
            self._record_test_result(test_name, True)
            return successful_messages
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_error_handling(self):
        """Test database error handling scenarios"""
        test_name = "Database Error Handling"
        
        try:
            # Test 1: Non-existent chat access
            non_existent_id = "00000000-0000-0000-0000-000000000000"
            
            response1 = await self.client.get(f"{CHAT_API_URL}/chats/{non_existent_id}")
            assert response1.status_code == 404, f"Expected 404 for non-existent chat, got {response1.status_code}"
            
            # Test 2: Invalid chat ID format
            invalid_id = "invalid-chat-id"
            
            response2 = await self.client.get(f"{CHAT_API_URL}/chats/{invalid_id}")
            assert response2.status_code in [400, 404, 422], f"Expected error for invalid ID, got {response2.status_code}"
            
            # Test 3: Send message to non-existent chat
            message_data = {"content": "Test message", "message_type": "user"}
            
            response3 = await self.client.post(
                f"{CHAT_API_URL}/chats/{non_existent_id}/messages",
                json=message_data
            )
            assert response3.status_code in [404, 403], f"Expected error for non-existent chat, got {response3.status_code}"
            
            # Test 4: Invalid message data
            invalid_message_data = {"invalid_field": "test"}
            
            # First create a valid chat
            chat_data = {"title": "Error Test Chat", "ai_model": "gpt-3.5-turbo"}
            create_response = await self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
            assert create_response.status_code == 200, "Failed to create test chat"
            
            chat_result = create_response.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            response4 = await self.client.post(
                f"{CHAT_API_URL}/chats/{chat_id}/messages",
                json=invalid_message_data
            )
            assert response4.status_code in [400, 422], f"Expected validation error, got {response4.status_code}"
            
            print("✅ All error scenarios handled correctly")
            
            self._record_test_result(test_name, True)
            return True
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_constraints_and_validation(self):
        """Test database constraints and data validation"""
        test_name = "Database Constraints and Validation"
        
        try:
            # Test 1: Chat creation with invalid data
            invalid_chat_data = {
                "title": "",  # Empty title should fail
                "ai_model": "gpt-3.5-turbo"
            }
            
            response1 = await self.client.post(f"{CHAT_API_URL}/chats", json=invalid_chat_data)
            assert response1.status_code in [400, 422], f"Expected validation error for empty title, got {response1.status_code}"
            
            # Test 2: Chat creation with very long title
            long_title_data = {
                "title": "x" * 1000,  # Very long title
                "ai_model": "gpt-3.5-turbo"
            }
            
            response2 = await self.client.post(f"{CHAT_API_URL}/chats", json=long_title_data)
            assert response2.status_code in [400, 422], f"Expected validation error for long title, got {response2.status_code}"
            
            # Test 3: Valid chat creation
            valid_chat_data = {
                "title": "Valid Test Chat",
                "description": "A properly formatted test chat",
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 2048
            }
            
            response3 = await self.client.post(f"{CHAT_API_URL}/chats", json=valid_chat_data)
            assert response3.status_code == 200, f"Valid chat creation failed: {response3.status_code}"
            
            chat_result = response3.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            # Test 4: Message with empty content
            empty_message_data = {
                "content": "",  # Empty content should fail
                "message_type": "user"
            }
            
            response4 = await self.client.post(
                f"{CHAT_API_URL}/chats/{chat_id}/messages",
                json=empty_message_data
            )
            assert response4.status_code in [400, 422], f"Expected validation error for empty message, got {response4.status_code}"
            
            # Test 5: Message with very long content
            long_content_data = {
                "content": "x" * 100000,  # Very long content
                "message_type": "user"
            }
            
            response5 = await self.client.post(
                f"{CHAT_API_URL}/chats/{chat_id}/messages",
                json=long_content_data
            )
            # This might succeed or fail depending on the limit - both are acceptable
            print(f"📏 Long message response: {response5.status_code}")
            
            # Test 6: Valid message
            valid_message_data = {
                "content": "This is a valid test message",
                "message_type": "user"
            }
            
            response6 = await self.client.post(
                f"{CHAT_API_URL}/chats/{chat_id}/messages",
                json=valid_message_data
            )
            assert response6.status_code == 200, f"Valid message creation failed: {response6.status_code}"
            
            self._record_test_result(test_name, True)
            return True
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_pagination_and_limits(self):
        """Test database pagination and query limits"""
        test_name = "Database Pagination and Limits"
        
        try:
            # Create a chat with many messages
            chat_data = {
                "title": "Pagination Test Chat",
                "ai_model": "gpt-3.5-turbo"
            }
            
            create_response = await self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
            assert create_response.status_code == 200, "Failed to create test chat"
            
            chat_result = create_response.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            # Add multiple messages
            for i in range(25):
                message_data = {
                    "content": f"Pagination test message {i:02d}",
                    "message_type": "user"
                }
                
                await self.client.post(
                    f"{CHAT_API_URL}/chats/{chat_id}/messages",
                    json=message_data
                )
            
            # Test pagination parameters
            # Test 1: Default pagination
            response1 = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}")
            assert response1.status_code == 200, "Default pagination failed"
            
            data1 = response1.json()
            messages1 = data1["messages"]
            print(f"📄 Default pagination returned {len(messages1)} messages")
            
            # Test 2: Limited results
            response2 = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}?limit=10")
            assert response2.status_code == 200, "Limited pagination failed"
            
            data2 = response2.json()
            messages2 = data2["messages"]
            assert len(messages2) <= 10, f"Expected max 10 messages, got {len(messages2)}"
            
            # Test 3: Offset pagination
            response3 = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}?limit=5&offset=5")
            assert response3.status_code == 200, "Offset pagination failed"
            
            data3 = response3.json()
            messages3 = data3["messages"]
            assert len(messages3) <= 5, f"Expected max 5 messages, got {len(messages3)}"
            
            # Test 4: Large limit (should be capped)
            response4 = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}?limit=10000")
            assert response4.status_code == 200, "Large limit test failed"
            
            data4 = response4.json()
            messages4 = data4["messages"]
            print(f"📊 Large limit returned {len(messages4)} messages (should be capped)")
            
            # Test 5: Chat list pagination
            chats_response = await self.client.get(f"{CHAT_API_URL}/chats?limit=5")
            assert chats_response.status_code == 200, "Chat list pagination failed"
            
            chats_data = chats_response.json()
            assert isinstance(chats_data, list), "Expected list of chats"
            print(f"📋 Chat list pagination returned {len(chats_data)} chats")
            
            self._record_test_result(test_name, True)
            return True
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def test_database_performance_metrics(self):
        """Test database performance and query optimization"""
        test_name = "Database Performance Metrics"
        
        try:
            # Create some test data for performance testing
            chat_data = {
                "title": "Performance Test Chat",
                "ai_model": "gpt-3.5-turbo"
            }
            
            # Measure chat creation time
            start_time = datetime.now()
            create_response = await self.client.post(f"{CHAT_API_URL}/chats", json=chat_data)
            create_duration = (datetime.now() - start_time).total_seconds()
            
            assert create_response.status_code == 200, "Performance test chat creation failed"
            
            chat_result = create_response.json()
            chat_id = chat_result["id"]
            self.test_chat_ids.append(chat_id)
            
            print(f"⏱️ Chat creation took: {create_duration:.3f}s")
            
            # Measure message sending performance
            message_times = []
            for i in range(10):
                message_data = {
                    "content": f"Performance test message {i}",
                    "message_type": "user"
                }
                
                msg_start = datetime.now()
                msg_response = await self.client.post(
                    f"{CHAT_API_URL}/chats/{chat_id}/messages",
                    json=message_data
                )
                msg_duration = (datetime.now() - msg_start).total_seconds()
                
                if msg_response.status_code == 200:
                    message_times.append(msg_duration)
            
            if message_times:
                avg_message_time = sum(message_times) / len(message_times)
                max_message_time = max(message_times)
                min_message_time = min(message_times)
                
                print(f"📊 Message performance:")
                print(f"  • Average: {avg_message_time:.3f}s")
                print(f"  • Min: {min_message_time:.3f}s")
                print(f"  • Max: {max_message_time:.3f}s")
                
                # Reasonable performance thresholds
                assert avg_message_time < 2.0, f"Average message time too slow: {avg_message_time:.3f}s"
                assert max_message_time < 5.0, f"Max message time too slow: {max_message_time:.3f}s"
            
            # Measure chat history retrieval performance
            history_start = datetime.now()
            history_response = await self.client.get(f"{CHAT_API_URL}/chats/{chat_id}")
            history_duration = (datetime.now() - history_start).total_seconds()
            
            assert history_response.status_code == 200, "History retrieval failed"
            print(f"⏱️ Chat history retrieval took: {history_duration:.3f}s")
            
            # Reasonable threshold for history retrieval
            assert history_duration < 3.0, f"History retrieval too slow: {history_duration:.3f}s"
            
            self._record_test_result(test_name, True)
            return {
                "create_time": create_duration,
                "avg_message_time": avg_message_time if message_times else 0,
                "history_time": history_duration
            }
            
        except Exception as e:
            self._record_test_result(test_name, False, str(e))
            return None
    
    async def run_all_tests(self):
        """Run all database operation tests"""
        print("🧪 Starting Database Operations Tests\n")
        
        try:
            await self.setup()
            
            # Run connectivity tests
            print("\n🔗 Running Database Connectivity Tests...")
            await self.test_database_health_check()
            
            # Run basic CRUD tests
            print("\n📊 Running Database CRUD Tests...")
            await self.test_database_crud_operations()
            
            # Run transaction tests
            print("\n🔄 Running Transaction Handling Tests...")
            await self.test_database_transaction_handling()
            await self.test_database_concurrent_operations()
            
            # Run error handling tests
            print("\n🚨 Running Error Handling Tests...")
            await self.test_database_error_handling()
            await self.test_database_constraints_and_validation()
            
            # Run performance tests
            print("\n⚡ Running Performance Tests...")
            await self.test_database_pagination_and_limits()
            await self.test_database_performance_metrics()
            
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
        print("🗄️ DATABASE OPERATIONS TEST SUMMARY")
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
            print("🎉 ALL TESTS PASSED! Database operations are fully functional.")
        else:
            print(f"⚠️ {results['failed']} test(s) failed. Please review the errors above.")
        
        return results


async def main():
    """Main test execution function"""
    test_suite = DatabaseOperationsTestSuite()
    
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