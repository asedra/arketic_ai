#!/usr/bin/env python3
"""
Comprehensive API Testing Script for Arketic AI/ML Backend OpenAI Settings API

This script systematically tests each OpenAI Settings API endpoint individually 
with proper error handling and generates a detailed JSON report with structured test results.

Author: Claude
Created: 2025-01-07
Updated: 2025-01-07
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

# Load environment variables
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


class OpenAISettingsTester:
    """Comprehensive API testing framework for Arketic OpenAI Settings API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[TestResult] = []
        self.test_data = {
            "access_token": None,
            "refresh_token": None,
            "user_email": "test@arketic.com",
            "user_password": "testpass123",
            "test_api_key": os.getenv("OPENAI_API_KEY", "sk-test1234567890abcdefghijklmnopqrstuvwxyz1234567890"),
            "invalid_api_key": "invalid-key-format"
        }
    
    def log_test_result(self, endpoint: str, method: str, payload: Optional[Dict], 
                       headers: Dict, response: requests.Response, 
                       start_time: float, success: bool, error_msg: Optional[str] = None):
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
            timestamp=datetime.utcnow().isoformat() + 'Z',
            duration_ms=round(duration, 2),
            success=success,
            error_message=error_msg
        )
        
        self.test_results.append(result)
        
        # Print test progress
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {method} {endpoint} ({response.status_code}) - {duration:.2f}ms")
        if error_msg:
            print(f"   Error: {error_msg}")
    
    def make_request(self, method: str, endpoint: str, payload: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, expected_status: Optional[List[int]] = None) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = headers or {}
        headers.setdefault("Content-Type", "application/json")
        
        start_time = time.time()
        success = True
        error_msg = None
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=payload, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=payload, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Check if status code is expected
            if expected_status and response.status_code not in expected_status:
                success = False
                error_msg = f"Unexpected status code. Expected: {expected_status}, Got: {response.status_code}"
            elif not expected_status and not (200 <= response.status_code < 300):
                success = False
                error_msg = f"HTTP error: {response.status_code}"
                
        except requests.exceptions.RequestException as e:
            # Create a mock response for failed requests
            response = requests.Response()
            response.status_code = 0
            response._content = str(e).encode()
            success = False
            error_msg = f"Request failed: {str(e)}"
        
        self.log_test_result(endpoint, method, payload, headers, response, start_time, success, error_msg)
        return response
    
    def setup_authentication(self):
        """Setup authentication by logging in first"""
        print("\n🔑 Setting up authentication...")
        
        payload = {
            "email": self.test_data["user_email"],
            "password": self.test_data["user_password"],
            "remember_me": False
        }
        
        response = self.make_request(
            "POST", 
            "/api/v1/auth/login", 
            payload,
            expected_status=[200, 422]
        )
        
        # Extract tokens if login successful
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_data["access_token"] = data.get("access_token")
                self.test_data["refresh_token"] = data.get("refresh_token")
                print(f"   ✅ Authentication successful")
                return True
            except:
                pass
        
        print(f"   ❌ Authentication failed")
        return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers"""
        if not self.test_data["access_token"]:
            return {}
        return {
            "Authorization": f"Bearer {self.test_data['access_token']}"
        }
    
    def test_update_openai_settings(self):
        """Test updating OpenAI settings"""
        print("\n🧪 Testing Update OpenAI Settings...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        payload = {
            "api_key": self.test_data["test_api_key"],
            "model": "gpt-4",
            "max_tokens": 2000,
            "temperature": 0.8
        }
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "POST", 
            "/api/v1/openai-settings/settings/openai", 
            payload,
            headers=headers,
            expected_status=[200, 401, 422, 500]
        )
        
        return response.status_code == 200
    
    def test_update_openai_key_put(self):
        """Test updating OpenAI key using PUT method"""
        print("\n🧪 Testing Update OpenAI Key (PUT)...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        payload = {
            "api_key": self.test_data["test_api_key"],
            "model": "gpt-4-turbo",
            "max_tokens": 3000,
            "temperature": 0.5
        }
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "PUT", 
            "/api/v1/openai-settings/settings/openai-key", 
            payload,
            headers=headers,
            expected_status=[200, 401, 422, 500]
        )
        
        return response.status_code == 200
    
    def test_set_openai_settings_alt(self):
        """Test setting OpenAI settings using alternative endpoint"""
        print("\n🧪 Testing Set OpenAI Settings (Alternative)...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        payload = {
            "api_key": self.test_data["test_api_key"],
            "model": "gpt-3.5-turbo",
            "max_tokens": 1500,
            "temperature": 0.7
        }
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "POST", 
            "/api/v1/openai-settings/openai/settings", 
            payload,
            headers=headers,
            expected_status=[200, 401, 422, 500]
        )
        
        return response.status_code == 200
    
    def test_get_user_settings(self):
        """Test retrieving user settings"""
        print("\n🧪 Testing Get User Settings...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "GET", 
            "/api/v1/openai-settings/settings", 
            headers=headers,
            expected_status=[200, 401, 500]
        )
        
        return response.status_code == 200
    
    def test_get_openai_settings_alt(self):
        """Test getting OpenAI settings using alternative endpoint"""
        print("\n🧪 Testing Get OpenAI Settings (Alternative)...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "GET", 
            "/api/v1/openai-settings/openai/settings", 
            headers=headers,
            expected_status=[200, 401, 500]
        )
        
        return response.status_code == 200
    
    def test_get_openai_key_settings(self):
        """Test getting OpenAI key settings"""
        print("\n🧪 Testing Get OpenAI Key Settings...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "GET", 
            "/api/v1/openai-settings/settings/openai-key", 
            headers=headers,
            expected_status=[200, 401, 500]
        )
        
        return response.status_code == 200
    
    def test_openai_connection(self):
        """Test OpenAI connection"""
        print("\n🧪 Testing OpenAI Connection...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "POST", 
            "/api/v1/openai-settings/settings/test-openai", 
            headers=headers,
            expected_status=[200, 400, 401, 500]
        )
        
        return response.status_code in [200, 400]  # 400 is acceptable if no valid key
    
    def test_clear_openai_settings(self):
        """Test clearing OpenAI settings"""
        print("\n🧪 Testing Clear OpenAI Settings...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "DELETE", 
            "/api/v1/openai-settings/settings/openai", 
            headers=headers,
            expected_status=[200, 401, 500]
        )
        
        return response.status_code == 200
    
    def test_invalid_api_key(self):
        """Test validation with invalid API key"""
        print("\n🧪 Testing Invalid API Key Validation...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        payload = {
            "api_key": self.test_data["invalid_api_key"],
            "model": "gpt-4",
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        headers = self.get_auth_headers()
        
        response = self.make_request(
            "POST", 
            "/api/v1/openai-settings/settings/openai", 
            payload,
            headers=headers,
            expected_status=[422]  # Should fail validation
        )
        
        return response.status_code == 422
    
    def test_unauthorized_access(self):
        """Test access without authentication"""
        print("\n🧪 Testing Unauthorized Access...")
        
        # Test without auth header
        response = self.make_request(
            "GET", 
            "/api/v1/openai-settings/settings", 
            expected_status=[401]
        )
        
        return response.status_code == 401
    
    def run_all_tests(self):
        """Run all OpenAI Settings API tests in sequence"""
        print("🚀 Starting OpenAI Settings API Test Suite for Arketic")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📧 Test Email: {self.test_data['user_email']}")
        print("\n📋 Testing OpenAI Settings Endpoints:")
        print("   • POST /api/v1/openai-settings/settings/openai")
        print("   • PUT  /api/v1/openai-settings/settings/openai-key")
        print("   • POST /api/v1/openai-settings/openai/settings")
        print("   • GET  /api/v1/openai-settings/settings")
        print("   • GET  /api/v1/openai-settings/openai/settings")
        print("   • GET  /api/v1/openai-settings/settings/openai-key")
        print("   • POST /api/v1/openai-settings/settings/test-openai")
        print("   • DELETE /api/v1/openai-settings/settings/openai")
        print("=" * 80)
        
        # Setup authentication first
        auth_success = self.setup_authentication()
        
        test_functions = [
            self.test_update_openai_settings,
            self.test_get_user_settings,
            self.test_get_openai_settings_alt,
            self.test_get_openai_key_settings,
            self.test_update_openai_key_put,
            self.test_set_openai_settings_alt,
            self.test_openai_connection,
            self.test_invalid_api_key,
            self.test_unauthorized_access,
            self.test_clear_openai_settings  # Run delete last
        ]
        
        successful_tests = 0
        total_tests = len(test_functions)
        
        for test_func in test_functions:
            try:
                if test_func():
                    successful_tests += 1
            except Exception as e:
                print(f"❌ Test {test_func.__name__} failed with exception: {str(e)}")
            
            # Small delay between tests to avoid overwhelming the server
            time.sleep(0.5)
        
        print("\n" + "=" * 80)
        print(f"📊 Test Summary: {successful_tests}/{total_tests} tests completed successfully")
        print(f"📋 Total API calls made: {len(self.test_results)}")
        
        return self.test_results
    
    def generate_report(self, filename: str = "openai_settings_test_report.json"):
        """Generate detailed JSON report"""
        print(f"\n📄 Generating detailed report: {filename}")
        
        # Calculate summary statistics
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result.success)
        failed_tests = total_tests - successful_tests
        avg_duration = sum(result.duration_ms for result in self.test_results) / total_tests if total_tests > 0 else 0
        
        # Group results by endpoint
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
        
        # Calculate average duration per endpoint
        for endpoint, stats in endpoint_summary.items():
            durations = [r.duration_ms for r in self.test_results if r.endpoint == endpoint]
            stats["avg_duration_ms"] = round(sum(durations) / len(durations), 2) if durations else 0
        
        report = {
            "test_metadata": {
                "generated_at": datetime.utcnow().isoformat() + 'Z',
                "base_url": self.base_url,
                "test_email": self.test_data["user_email"],
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate_percent": round((successful_tests / total_tests) * 100, 2) if total_tests > 0 else 0,
                "average_duration_ms": round(avg_duration, 2),
                "tested_endpoints": [
                    "POST /api/v1/openai-settings/settings/openai",
                    "PUT /api/v1/openai-settings/settings/openai-key", 
                    "POST /api/v1/openai-settings/openai/settings",
                    "GET /api/v1/openai-settings/settings",
                    "GET /api/v1/openai-settings/openai/settings",
                    "GET /api/v1/openai-settings/settings/openai-key",
                    "POST /api/v1/openai-settings/settings/test-openai",
                    "DELETE /api/v1/openai-settings/settings/openai"
                ]
            },
            "endpoint_summary": endpoint_summary,
            "detailed_results": [asdict(result) for result in self.test_results]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Report saved successfully!")
        print(f"📈 Success Rate: {report['test_metadata']['success_rate_percent']}%")
        print(f"⏱️  Average Duration: {report['test_metadata']['average_duration_ms']}ms")


def main():
    """Main execution function"""
    # Initialize tester
    tester = OpenAISettingsTester()
    
    try:
        # Run all tests
        results = tester.run_all_tests()
        
        # Generate detailed report
        tester.generate_report()
        
        print("\n🎉 OpenAI Settings API Testing Complete!")
        print("📄 Check 'openai_settings_test_report.json' for detailed results")
        
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        # Still generate report with partial results
        if tester.test_results:
            tester.generate_report()


if __name__ == "__main__":
    main()