#!/usr/bin/env python3
"""
Comprehensive API Testing Script for Arketic AI/ML Backend Authentication API

This script systematically tests each remaining authentication API endpoint individually 
with proper error handling and generates a detailed JSON report with structured test results.

Author: Claude
Created: 2025-01-07
Updated: 2025-01-07 (Filtered to remaining endpoints only)
"""

import json
import requests
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict


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


class AuthTester:
    """Comprehensive API testing framework for Arketic Authentication API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[TestResult] = []
        self.test_data = {
            "access_token": None,
            "refresh_token": None,
            "user_email": "test@arketic.com",
            "user_password": "testpass123"
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
    
    def test_login(self):
        """Test user login endpoint"""
        print("\n🧪 Testing User Login...")
        
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
                return True
            except:
                pass
        
        return False
    
    def test_refresh_token(self):
        """Test refresh token endpoint"""
        print("\n🧪 Testing Token Refresh...")
        
        if not self.test_data["refresh_token"]:
            print("   Skipping - No refresh token available")
            return False
        
        payload = {
            "refresh_token": self.test_data["refresh_token"]
        }
        
        response = self.make_request(
            "POST", 
            "/api/v1/auth/refresh", 
            payload,
            expected_status=[200, 401, 422]
        )
        
        # Update tokens if refresh successful
        if response.status_code == 200:
            try:
                data = response.json()
                self.test_data["access_token"] = data.get("access_token")
                self.test_data["refresh_token"] = data.get("refresh_token")
                return True
            except:
                pass
        
        return False
    
    def test_get_current_session(self):
        """Test get current session endpoint"""
        print("\n🧪 Testing Get Current Session...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = {
            "Authorization": f"Bearer {self.test_data['access_token']}"
        }
        
        response = self.make_request(
            "GET", 
            "/api/v1/auth/me", 
            headers=headers,
            expected_status=[200, 401]
        )
        
        return response.status_code == 200
    
    def test_validate_token(self):
        """Test token validation endpoint"""
        print("\n🧪 Testing Token Validation...")
        
        if not self.test_data["access_token"]:
            print("   Skipping - No access token available")
            return False
        
        headers = {
            "Authorization": f"Bearer {self.test_data['access_token']}"
        }
        
        response = self.make_request(
            "GET", 
            "/api/v1/auth/validate", 
            headers=headers,
            expected_status=[200, 401]
        )
        
        return response.status_code == 200
    
    def run_all_tests(self):
        """Run all authentication API tests in sequence"""
        print("🚀 Starting Authentication API Test Suite for Arketic")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📧 Test Email: {self.test_data['user_email']}")
        print("\n📋 Testing Remaining Authentication Endpoints:")
        print("   • POST /api/v1/auth/login")
        print("   • POST /api/v1/auth/refresh")
        print("   • GET  /api/v1/auth/me")
        print("   • GET  /api/v1/auth/validate")
        print("=" * 80)
        
        test_functions = [
            self.test_login,
            self.test_refresh_token,
            self.test_get_current_session,
            self.test_validate_token
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
    
    def generate_report(self, filename: str = "auth_test_report.json"):
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
                    "POST /api/v1/auth/login",
                    "POST /api/v1/auth/refresh", 
                    "GET /api/v1/auth/me",
                    "GET /api/v1/auth/validate"
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
    tester = AuthTester()
    
    try:
        # Run all tests
        results = tester.run_all_tests()
        
        # Generate detailed report
        tester.generate_report()
        
        print("\n🎉 Authentication API Testing Complete!")
        print("📄 Check 'auth_test_report.json' for detailed results")
        
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        # Still generate report with partial results
        if tester.test_results:
            tester.generate_report()


if __name__ == "__main__":
    main()