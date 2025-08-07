#!/usr/bin/env python3
"""
Comprehensive Backend Test and Fix Script
Tests and fixes all backend issues identified by the frontend UI tester
"""

import asyncio
import sys
import os
import requests
import json
from typing import Dict, Any, Optional

# Add the API directory to Python path
sys.path.insert(0, '/home/ali/arketic/apps/api')

class BackendTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.test_credentials = {
            "email": "test@arketic.com",
            "password": "testpass123"
        }
        self.token = None
        self.test_results = []
        
    def add_result(self, test_name: str, status: str, message: str, details: Any = None):
        """Add a test result"""
        self.test_results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "details": details
        })
        print(f"{'✅' if status == 'PASS' else '❌' if status == 'FAIL' else '⚠️'} {test_name}: {message}")

    async def initialize_database(self):
        """Initialize the database and create test user"""
        try:
            from core.database import init_database, get_db
            from models.user import User
            from services.user_service import UserService
            from services.auth_service import AuthenticationService
            from schemas.user import UserCreate
            from models.user import UserRole
            from sqlalchemy import select
            
            # Initialize database
            await init_database()
            self.add_result("Database Init", "PASS", "Database initialized successfully")
            
            # Check if test user exists
            user_service = UserService()
            async for db in get_db():
                try:
                    # Check for existing user
                    existing_user = await user_service.get_user_by_email(db, self.test_credentials["email"])
                    
                    if existing_user:
                        self.add_result("Test User Check", "PASS", f"Test user exists: {existing_user.email}")
                        return True
                    
                    # Create test user
                    user_data = UserCreate(
                        email=self.test_credentials["email"],
                        password=self.test_credentials["password"],
                        first_name="Test",
                        last_name="User",
                        username="test_user",
                        role=UserRole.USER
                    )
                    
                    test_user = await user_service.create_user(db, user_data)
                    
                    # Verify and activate user
                    await user_service.verify_email(db, str(test_user.id))
                    
                    self.add_result("Test User Creation", "PASS", f"Created test user: {test_user.email}")
                    return True
                    
                except Exception as e:
                    self.add_result("Test User Creation", "FAIL", f"Error: {e}")
                    return False
                finally:
                    break
                    
        except Exception as e:
            self.add_result("Database Init", "FAIL", f"Database initialization failed: {e}")
            return False

    def test_login(self) -> bool:
        """Test user login and token generation"""
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login",
                json=self.test_credentials,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.token = data["access_token"]
                    self.add_result("Login Test", "PASS", "Login successful, token received")
                    return True
                else:
                    self.add_result("Login Test", "FAIL", "No access token in response", data)
                    return False
            else:
                self.add_result("Login Test", "FAIL", f"Login failed: {response.status_code}", response.text)
                return False
                
        except requests.exceptions.RequestException as e:
            self.add_result("Login Test", "FAIL", f"Request error: {e}")
            return False

    def test_authenticated_endpoint(self, endpoint: str, method: str = "GET", data: Any = None) -> Dict[str, Any]:
        """Test an authenticated endpoint"""
        if not self.token:
            return {"status_code": 401, "error": "No authentication token"}
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            if method == "GET":
                response = requests.get(f"{self.base_url}{endpoint}", headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(f"{self.base_url}{endpoint}", headers=headers, json=data, timeout=10)
            else:
                return {"status_code": 405, "error": f"Method {method} not supported"}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else None,
                "text": response.text
            }
            
        except requests.exceptions.RequestException as e:
            return {"status_code": 0, "error": str(e)}
        except json.JSONDecodeError:
            return {"status_code": response.status_code, "text": response.text, "error": "Invalid JSON"}

    def test_critical_endpoints(self):
        """Test all critical endpoints that were failing"""
        
        # Test organization people endpoint
        result = self.test_authenticated_endpoint("/api/v1/organization/people")
        if result["status_code"] == 200:
            data = result.get("data", {})
            if isinstance(data, list):
                self.add_result("People API Format", "PASS", "Returns array format correctly")
            elif isinstance(data, dict) and "people" in data:
                self.add_result("People API Format", "PASS", "Returns object with people array")
            else:
                self.add_result("People API Format", "FAIL", "Invalid response format", data)
        elif result["status_code"] == 403:
            self.add_result("People API Auth", "FAIL", "Authentication token not recognized", result)
        else:
            self.add_result("People API", "FAIL", f"Endpoint failed: {result['status_code']}", result)

        # Test compliance endpoints
        result = self.test_authenticated_endpoint("/api/v1/compliance/")
        if result["status_code"] == 200:
            self.add_result("Compliance API", "PASS", "Compliance endpoint accessible")
        elif result["status_code"] == 403:
            self.add_result("Compliance API Auth", "FAIL", "Authentication issue", result)
        else:
            self.add_result("Compliance API", "FAIL", f"Endpoint failed: {result['status_code']}", result)

        # Test chat message sending - this is the critical one
        chat_data = {
            "title": "Test Chat",
            "description": "Testing chat functionality",
            "chat_type": "DIRECT",
            "ai_model": "gpt-3.5-turbo"
        }
        
        # First create a chat
        result = self.test_authenticated_endpoint("/api/v1/chat/chats", "POST", chat_data)
        if result["status_code"] == 201 or result["status_code"] == 200:
            chat_data_response = result.get("data", {})
            chat_id = chat_data_response.get("id")
            
            if chat_id:
                self.add_result("Chat Creation", "PASS", f"Chat created: {chat_id}")
                
                # Test sending a message
                message_data = {
                    "content": "Hello, this is a test message!",
                    "message_type": "USER"
                }
                
                result = self.test_authenticated_endpoint(
                    f"/api/v1/chat/chats/{chat_id}/messages", 
                    "POST", 
                    message_data
                )
                
                if result["status_code"] == 200 or result["status_code"] == 201:
                    self.add_result("Chat Message Send", "PASS", "Message sent successfully")
                else:
                    self.add_result("Chat Message Send", "FAIL", f"Failed to send message: {result['status_code']}", result)
            else:
                self.add_result("Chat Creation", "FAIL", "No chat ID returned", result)
        else:
            self.add_result("Chat Creation", "FAIL", f"Failed to create chat: {result['status_code']}", result)

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Comprehensive Backend Tests...")
        print("=" * 60)
        
        # Initialize database and create test user
        if not await self.initialize_database():
            print("❌ Cannot proceed without database initialization")
            return False
        
        # Test login
        if not self.test_login():
            print("❌ Cannot proceed without successful login")
            return False
        
        # Test all critical endpoints
        self.test_critical_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["status"] == "PASS")
        failed = sum(1 for r in self.test_results if r["status"] == "FAIL")
        warnings = sum(1 for r in self.test_results if r["status"] == "WARN")
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"⚠️  WARNINGS: {warnings}")
        print(f"📊 TOTAL: {len(self.test_results)}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed == 0

async def main():
    """Main test execution"""
    tester = BackendTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        print("\n🛠️  Some tests failed. Fixes needed.")
        return 1

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(result)
    except Exception as e:
        print(f"💥 Test script error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)