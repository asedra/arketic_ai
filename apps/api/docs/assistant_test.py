#!/usr/bin/env python3
"""
Comprehensive API Testing Script for Arketic AI/ML Backend Assistant API

This script systematically tests each Assistant API endpoint individually 
with proper error handling and generates a detailed JSON report 
with structured test results including AI integration features.

Author: Claude
Created: 2025-08-07
Updated: 2025-08-07 (Assistant API endpoints testing)
"""

import json
import requests
import time
import uuid
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass
class TestResult:
    """Structure for individual test results"""
    endpoint: str
    method: str
    payload: Optional[Dict[str, Any]]
    headers: Dict[str, str]
    response_status: int
    response_body: Optional[Dict[str, Any]]
    response_text: str
    timestamp: str
    duration_ms: float
    success: bool
    error_message: Optional[str]
    test_type: str = "REST_API"


class AssistantTester:
    """Comprehensive API testing framework for Arketic Assistant API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[TestResult] = []
        self.test_data = {
            "access_token": None,
            "refresh_token": None,
            "user_email": "test@arketic.com",
            "user_password": "testpass123",
            "test_assistant_id": None,
            "test_knowledge_base_id": None,
            "test_document_id": None
        }
    
    def log_test_result(self, endpoint: str, method: str, payload: Optional[Dict], 
                       headers: Dict, response: requests.Response, 
                       start_time: float, success: bool, error_msg: Optional[str] = None,
                       test_type: str = "REST_API"):
        """Log individual test result"""
        duration = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Parse response body safely
        try:
            response_body = response.json() if response.text else None
        except json.JSONDecodeError:
            response_body = None
        
        result = TestResult(
            endpoint=endpoint,
            method=method,
            payload=payload,
            headers=headers,
            response_status=response.status_code,
            response_body=response_body,
            response_text=response.text,
            timestamp=datetime.utcnow().isoformat(),
            duration_ms=duration,
            success=success,
            error_message=error_msg,
            test_type=test_type
        )
        
        self.test_results.append(result)
        print(f"✓ {method} {endpoint} - {response.status_code} ({duration:.1f}ms)")
    
    def authenticate(self) -> bool:
        """Authenticate with the API to get access token"""
        print("\n=== Authentication Phase ===")
        
        # First, create test admin user if needed
        start_time = time.time()
        admin_endpoint = "/api/v1/test/create-admin"
        
        try:
            response = self.session.post(f"{self.base_url}{admin_endpoint}")
            self.log_test_result(admin_endpoint, "POST", None, {}, response, start_time, 
                               response.status_code in [200, 201])
            
            if response.status_code in [200, 201]:
                admin_data = response.json()
                # Use admin credentials for testing
                self.test_data["user_email"] = "arketic@arketic.com"  
                self.test_data["user_password"] = "Arketic123!"
                
        except Exception as e:
            self.log_test_result(admin_endpoint, "POST", None, {}, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        # Now authenticate
        start_time = time.time()
        login_endpoint = "/api/v1/auth/login"
        login_payload = {
            "email": self.test_data["user_email"],
            "password": self.test_data["user_password"]
        }
        
        try:
            response = self.session.post(f"{self.base_url}{login_endpoint}", json=login_payload)
            self.log_test_result(login_endpoint, "POST", login_payload, {"Content-Type": "application/json"}, 
                               response, start_time, response.status_code == 200)
            
            if response.status_code == 200:
                auth_data = response.json()
                self.test_data["access_token"] = auth_data["access_token"]
                self.test_data["refresh_token"] = auth_data["refresh_token"]
                print(f"✓ Authentication successful for {self.test_data['user_email']}")
                return True
            else:
                print(f"✗ Authentication failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_test_result(login_endpoint, "POST", login_payload, {"Content-Type": "application/json"}, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
            print(f"✗ Authentication error: {e}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {self.test_data['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_available_models(self):
        """Test getting available AI models"""
        print("\n=== Testing Available Models ===")
        
        start_time = time.time()
        endpoint = "/api/v1/assistants/models/available"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, headers, response, start_time, success)
            
            if success:
                models_data = response.json()
                print(f"✓ Found {len(models_data.get('models', []))} available models")
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
    
    def test_create_assistant(self):
        """Test creating a new assistant"""
        print("\n=== Testing Assistant Creation ===")
        
        start_time = time.time()
        endpoint = "/api/v1/assistants/"
        headers = self.get_auth_headers()
        
        payload = {
            "name": "Test AI Assistant",
            "description": "A test assistant for API testing purposes",
            "system_prompt": "You are a helpful AI assistant for testing. Always respond politely and helpfully.",
            "ai_model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 2048,
            "is_public": False,
            "knowledge_base_ids": [],
            "document_ids": [],
            "configuration": {
                "test_mode": True,
                "created_by": "api_test"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}{endpoint}", headers=headers, json=payload)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "POST", payload, headers, response, start_time, success)
            
            if success:
                assistant_data = response.json()
                self.test_data["test_assistant_id"] = assistant_data.get("id")
                print(f"✓ Created assistant with ID: {self.test_data['test_assistant_id']}")
                return assistant_data
            else:
                print(f"✗ Assistant creation failed: {response.text}")
                
        except Exception as e:
            self.log_test_result(endpoint, "POST", payload, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        return None
    
    def test_list_assistants(self):
        """Test listing user's assistants"""
        print("\n=== Testing Assistant Listing ===")
        
        start_time = time.time()
        endpoint = "/api/v1/assistants/"
        headers = self.get_auth_headers()
        
        # Test with different parameters
        test_params = [
            {},  # Default parameters
            {"limit": 5, "page": 1},  # Pagination
            {"sort_by": "name", "sort_order": "asc"},  # Sorting
            {"status": "active"}  # Filtering
        ]
        
        for params in test_params:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", headers=headers, params=params)
                success = response.status_code == 200
                
                param_str = "&".join([f"{k}={v}" for k, v in params.items()]) if params else "default"
                test_endpoint = f"{endpoint}?{param_str}" if params else endpoint
                
                self.log_test_result(test_endpoint, "GET", params, headers, response, start_time, success)
                
                if success:
                    assistants_data = response.json()
                    print(f"✓ Listed assistants: {assistants_data.get('total', 0)} total")
                
            except Exception as e:
                self.log_test_result(endpoint, "GET", params, headers, 
                                   type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                                   start_time, False, str(e))
    
    def test_get_assistant(self):
        """Test getting a specific assistant"""
        print("\n=== Testing Assistant Retrieval ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping assistant retrieval test - no assistant created")
            return
        
        start_time = time.time()
        endpoint = f"/api/v1/assistants/{self.test_data['test_assistant_id']}"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, headers, response, start_time, success)
            
            if success:
                assistant_data = response.json()
                print(f"✓ Retrieved assistant: {assistant_data.get('name')}")
                return assistant_data
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        return None
    
    def test_update_assistant(self):
        """Test updating an assistant"""
        print("\n=== Testing Assistant Update ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping assistant update test - no assistant created")
            return
        
        start_time = time.time()
        endpoint = f"/api/v1/assistants/{self.test_data['test_assistant_id']}"
        headers = self.get_auth_headers()
        
        payload = {
            "name": "Updated Test Assistant",
            "description": "Updated description for testing purposes",
            "temperature": 0.8,
            "status": "active"
        }
        
        try:
            response = self.session.put(f"{self.base_url}{endpoint}", headers=headers, json=payload)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "PUT", payload, headers, response, start_time, success)
            
            if success:
                assistant_data = response.json()
                print(f"✓ Updated assistant: {assistant_data.get('name')}")
                return assistant_data
                
        except Exception as e:
            self.log_test_result(endpoint, "PUT", payload, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        return None
    
    def test_assistant_knowledge_management(self):
        """Test managing assistant knowledge bases and documents"""
        print("\n=== Testing Assistant Knowledge Management ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping knowledge management test - no assistant created")
            return
        
        start_time = time.time()
        endpoint = f"/api/v1/assistants/{self.test_data['test_assistant_id']}/knowledge"
        headers = self.get_auth_headers()
        
        # Test different actions
        test_payloads = [
            {
                "action": "add",
                "knowledge_base_ids": [],
                "document_ids": []
            },
            {
                "action": "replace",
                "knowledge_base_ids": [],
                "document_ids": []
            }
        ]
        
        for payload in test_payloads:
            try:
                response = self.session.post(f"{self.base_url}{endpoint}", headers=headers, json=payload)
                success = response.status_code == 200
                
                test_endpoint = f"{endpoint}?action={payload['action']}"
                self.log_test_result(test_endpoint, "POST", payload, headers, response, start_time, success)
                
                if success:
                    print(f"✓ Knowledge {payload['action']} operation successful")
                    
            except Exception as e:
                self.log_test_result(endpoint, "POST", payload, headers, 
                                   type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                                   start_time, False, str(e))
    
    def test_assistant_chat_config(self):
        """Test getting assistant configuration for chat integration"""
        print("\n=== Testing Assistant Chat Configuration ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping chat config test - no assistant created")
            return
        
        start_time = time.time()
        endpoint = f"/api/v1/assistants/{self.test_data['test_assistant_id']}/chat-config"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, headers, response, start_time, success)
            
            if success:
                config_data = response.json()
                print(f"✓ Retrieved chat config for assistant")
                return config_data
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        return None
    
    def test_chat_integration(self):
        """Test assistant integration with chat API"""
        print("\n=== Testing Chat Integration ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping chat integration test - no assistant created")
            return
        
        # Test getting available assistants for chat
        start_time = time.time()
        endpoint = "/api/v1/chat/assistants/available"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, headers, response, start_time, success)
            
            if success:
                assistants_data = response.json()
                print(f"✓ Found {assistants_data.get('data', {}).get('total', 0)} assistants available for chat")
                
                # Test creating a chat with assistant
                self.test_create_chat_with_assistant()
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
    
    def test_create_chat_with_assistant(self):
        """Test creating a chat with assistant"""
        print("\n=== Testing Chat Creation with Assistant ===")
        
        start_time = time.time()
        endpoint = "/api/v1/chat/chats"
        headers = self.get_auth_headers()
        
        payload = {
            "title": "Assistant Test Chat",
            "description": "Testing chat with AI assistant",
            "assistant_id": self.test_data["test_assistant_id"],
            "chat_type": "DIRECT",
            "is_private": False
        }
        
        try:
            response = self.session.post(f"{self.base_url}{endpoint}", headers=headers, json=payload)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "POST", payload, headers, response, start_time, success)
            
            if success:
                chat_data = response.json()
                print(f"✓ Created chat with assistant: {chat_data.get('id')}")
                print(f"  Assistant: {chat_data.get('assistant_name', 'N/A')}")
                return chat_data
                
        except Exception as e:
            self.log_test_result(endpoint, "POST", payload, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
        
        return None
    
    def test_featured_assistants(self):
        """Test getting featured public assistants"""
        print("\n=== Testing Featured Assistants ===")
        
        start_time = time.time()
        endpoint = "/api/v1/assistants/public/featured"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, headers, response, start_time, success)
            
            if success:
                featured_data = response.json()
                print(f"✓ Found {len(featured_data)} featured assistants")
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
    
    def test_delete_assistant(self):
        """Test deleting an assistant (soft delete)"""
        print("\n=== Testing Assistant Deletion ===")
        
        if not self.test_data["test_assistant_id"]:
            print("⚠ Skipping assistant deletion test - no assistant created")
            return
        
        start_time = time.time()
        endpoint = f"/api/v1/assistants/{self.test_data['test_assistant_id']}"
        headers = self.get_auth_headers()
        
        try:
            response = self.session.delete(f"{self.base_url}{endpoint}", headers=headers)
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "DELETE", None, headers, response, start_time, success)
            
            if success:
                delete_data = response.json()
                print(f"✓ Deleted assistant: {delete_data.get('message')}")
                
        except Exception as e:
            self.log_test_result(endpoint, "DELETE", None, headers, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
    
    def test_health_check(self):
        """Test assistant service health check"""
        print("\n=== Testing Assistant Service Health ===")
        
        start_time = time.time()
        endpoint = "/api/v1/assistants/health"
        
        try:
            response = self.session.get(f"{self.base_url}{endpoint}")
            success = response.status_code == 200
            
            self.log_test_result(endpoint, "GET", None, {}, response, start_time, success)
            
            if success:
                health_data = response.json()
                print(f"✓ Assistant service health: {health_data.get('status')}")
                
        except Exception as e:
            self.log_test_result(endpoint, "GET", None, {}, 
                               type('MockResponse', (), {'status_code': 500, 'text': str(e), 'json': lambda: None})(), 
                               start_time, False, str(e))
    
    def run_all_tests(self):
        """Run all assistant API tests in sequence"""
        print("🚀 Starting Comprehensive Assistant API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        # Authentication is required for most tests
        if not self.authenticate():
            print("❌ Authentication failed - aborting tests")
            return
        
        # Run all tests in logical order
        self.test_health_check()
        self.test_available_models()
        self.test_create_assistant()
        self.test_list_assistants()
        self.test_get_assistant()
        self.test_update_assistant()
        self.test_assistant_knowledge_management()
        self.test_assistant_chat_config()
        self.test_featured_assistants()
        self.test_chat_integration()
        self.test_delete_assistant()
        
        print("\n" + "=" * 50)
        print("🏁 All Assistant API tests completed!")
        
        # Generate test report
        self.generate_test_report()
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n=== Generating Test Report ===")
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r.success])
        failed_tests = total_tests - successful_tests
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        avg_duration = sum(r.duration_ms for r in self.test_results) / total_tests if total_tests > 0 else 0
        
        # Group tests by endpoint
        endpoint_summary = {}
        for result in self.test_results:
            endpoint = result.endpoint
            if endpoint not in endpoint_summary:
                endpoint_summary[endpoint] = {
                    "total_calls": 0,
                    "successful_calls": 0,
                    "failed_calls": 0,
                    "avg_duration_ms": 0
                }
            
            endpoint_summary[endpoint]["total_calls"] += 1
            if result.success:
                endpoint_summary[endpoint]["successful_calls"] += 1
            else:
                endpoint_summary[endpoint]["failed_calls"] += 1
        
        # Calculate average duration for each endpoint
        for endpoint in endpoint_summary:
            endpoint_results = [r for r in self.test_results if r.endpoint == endpoint]
            if endpoint_results:
                endpoint_summary[endpoint]["avg_duration_ms"] = sum(r.duration_ms for r in endpoint_results) / len(endpoint_results)
        
        # Create comprehensive report
        report = {
            "test_metadata": {
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "base_url": self.base_url,
                "test_email": self.test_data["user_email"],
                "test_assistant_id": self.test_data.get("test_assistant_id"),
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate_percent": round(success_rate, 1),
                "average_duration_ms": round(avg_duration, 1),
                "tested_features": [
                    "Assistant Creation",
                    "Assistant Listing & Search",
                    "Assistant Retrieval",
                    "Assistant Updates",
                    "Assistant Deletion",
                    "Knowledge Management",
                    "Chat Integration",
                    "Available Models",
                    "Featured Assistants",
                    "Health Monitoring"
                ]
            },
            "rest_api_summary": {
                "total_calls": total_tests,
                "successful_calls": successful_tests,
                "failed_calls": failed_tests,
                "success_rate_percent": round(success_rate, 1),
                "average_duration_ms": round(avg_duration, 1)
            },
            "endpoint_summary": endpoint_summary,
            "detailed_results": [asdict(result) for result in self.test_results]
        }
        
        # Save report to file
        report_filename = "assistant_test_report.json"
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"📊 Test Results Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Successful: {successful_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Average Duration: {avg_duration:.1f}ms")
        print(f"   Report saved to: {report_filename}")


if __name__ == "__main__":
    # Check if we should use a different base URL
    base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    # Create and run the tester
    tester = AssistantTester(base_url)
    tester.run_all_tests()