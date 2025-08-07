#!/usr/bin/env python3
"""
Comprehensive People Management API Test Suite

Tests all documented endpoints of the People Management API:
- POST /api/v1/organization/people/ (Create Person)
- GET /api/v1/organization/people/ (List People) 
- GET /api/v1/organization/people/{id} (Get Person)
- PUT /api/v1/organization/people/{id} (Update Person)
- DELETE /api/v1/organization/people/{id} (Delete Person)

Based on API documentation at: /docs/api/PEOPLE.md
Author: Claude
Created: 2025-08-07
"""

import json
import requests
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class TestStatus(str, Enum):
    """Test result status"""
    PASS = "PASS"
    FAIL = "FAIL"
    SKIP = "SKIP"
    ERROR = "ERROR"


@dataclass
class TestResult:
    """Structure for individual test results"""
    test_name: str
    endpoint: str
    method: str
    expected_status: List[int]
    actual_status: int
    payload: Optional[Dict[str, Any]]
    response_body: Optional[Dict[str, Any]]
    response_text: str
    timestamp: str
    duration_ms: float
    status: TestStatus
    error_message: Optional[str]
    validation_notes: Optional[str] = None


class PeopleAPITester:
    """Comprehensive test framework for People Management API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[TestResult] = []
        self.config = {
            "access_token": None,
            "test_user": {
                "email": "test@arketic.com",
                "password": "testpass123"
            },
            "created_people": [],  # Store created person IDs for cleanup
            "test_data": {}
        }
    
    def log_result(self, test_name: str, endpoint: str, method: str, 
                  expected_status: List[int], response: requests.Response, 
                  payload: Optional[Dict], start_time: float, 
                  status: TestStatus, error_msg: Optional[str] = None,
                  validation_notes: Optional[str] = None):
        """Log individual test result"""
        duration = (time.time() - start_time) * 1000
        
        try:
            response_body = response.json() if response.text else None
        except json.JSONDecodeError:
            response_body = None
        
        result = TestResult(
            test_name=test_name,
            endpoint=endpoint,
            method=method,
            expected_status=expected_status,
            actual_status=response.status_code,
            payload=payload,
            response_body=response_body,
            response_text=response.text,
            timestamp=datetime.utcnow().isoformat() + 'Z',
            duration_ms=round(duration, 2),
            status=status,
            error_message=error_msg,
            validation_notes=validation_notes
        )
        
        self.test_results.append(result)
        
        # Console output
        status_symbol = {
            TestStatus.PASS: "✅",
            TestStatus.FAIL: "❌", 
            TestStatus.SKIP: "⏭️",
            TestStatus.ERROR: "💥"
        }
        
        print(f"{status_symbol[status]} {test_name}")
        print(f"   {method} {endpoint} → {response.status_code} ({duration:.1f}ms)")
        if error_msg:
            print(f"   Error: {error_msg}")
        if validation_notes:
            print(f"   Note: {validation_notes}")
    
    def make_request(self, method: str, endpoint: str, 
                    payload: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, 
                    timeout: int = 30) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = headers or {}
        headers.setdefault("Content-Type", "application/json")
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = self.session.post(url, json=payload, headers=headers, timeout=timeout)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=payload, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return response
            
        except requests.exceptions.RequestException as e:
            # Create a mock response for connection errors
            mock_response = requests.Response()
            mock_response.status_code = 0
            mock_response._content = str(e).encode()
            return mock_response
    
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print("\n🔐 Authentication Phase")
        print("-" * 40)
        
        payload = {
            "email": self.config["test_user"]["email"],
            "password": self.config["test_user"]["password"],
            "remember_me": False
        }
        
        start_time = time.time()
        response = self.make_request("POST", "/api/v1/auth/login", payload)
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.config["access_token"] = data.get("access_token")
                self.log_result(
                    "Authentication", "/api/v1/auth/login", "POST", 
                    [200], response, payload, start_time, TestStatus.PASS
                )
                print("✅ Authentication successful")
                return True
            except:
                pass
        
        self.log_result(
            "Authentication", "/api/v1/auth/login", "POST", 
            [200], response, payload, start_time, TestStatus.FAIL,
            f"Authentication failed with status {response.status_code}"
        )
        print("❌ Authentication failed")
        return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers"""
        if not self.config["access_token"]:
            return {}
        return {"Authorization": f"Bearer {self.config['access_token']}"}
    
    def generate_unique_person_data(self, suffix: str = "") -> Dict[str, Any]:
        """Generate unique test person data"""
        timestamp = int(datetime.now().timestamp() * 1000000)
        random_id = uuid.uuid4().hex[:6]
        unique_suffix = f"{timestamp}_{random_id}{suffix}"
        
        return {
            "first_name": "Test",
            "last_name": "Person",
            "email": f"test.person.{unique_suffix}@testcompany{timestamp}.com",
            "phone": "+1-555-0199",
            "job_title": "Test Engineer",
            "department": "Quality Assurance",
            "site": "Test Site",
            "location": "Test City, TC",
            "role": "User",
            "manager_id": None,
            "hire_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "notes": "Test person for API validation"
        }
    
    def test_create_person_success(self) -> bool:
        """Test successful person creation (currently expected to fail due to known issue)"""
        print("\n👤 Create Person Tests")
        print("-" * 40)
        
        person_data = self.generate_unique_person_data("_create")
        
        start_time = time.time()
        response = self.make_request(
            "POST", "/api/v1/organization/people/", 
            person_data, self.get_auth_headers()
        )
        
        # Due to known 409 conflict issue, we expect this to fail
        if response.status_code == 201:
            # Success case (if the bug is fixed)
            try:
                data = response.json()
                person_id = data.get("id")
                if person_id:
                    self.config["created_people"].append(person_id)
                    self.config["test_data"]["created_person"] = data
                
                self.log_result(
                    "Create Person - Success", "/api/v1/organization/people/", "POST",
                    [201], response, person_data, start_time, TestStatus.PASS,
                    validation_notes="Person creation successful - issue may be resolved!"
                )
                return True
            except:
                pass
        
        elif response.status_code == 409:
            # Expected failure due to known issue
            self.log_result(
                "Create Person - Known Issue", "/api/v1/organization/people/", "POST",
                [201, 409], response, person_data, start_time, TestStatus.FAIL,
                "409 Conflict - Known issue: false positive conflict detection",
                "This is the documented 409 conflict bug with unique data"
            )
            return False
        
        else:
            # Unexpected error
            self.log_result(
                "Create Person - Unexpected Error", "/api/v1/organization/people/", "POST",
                [201, 409], response, person_data, start_time, TestStatus.ERROR,
                f"Unexpected status code: {response.status_code}"
            )
            return False
    
    def test_create_person_validation_errors(self):
        """Test person creation validation errors"""
        validation_tests = [
            {
                "name": "Missing Required Fields",
                "data": {"first_name": "Test"},
                "expected": [422]
            },
            {
                "name": "Invalid Email Format", 
                "data": {
                    "first_name": "Test",
                    "last_name": "Person",
                    "email": "not-an-email",
                    "role": "User"
                },
                "expected": [422]
            },
            {
                "name": "Invalid Role",
                "data": {
                    "first_name": "Test",
                    "last_name": "Person", 
                    "email": "test@example.com",
                    "role": "InvalidRole"
                },
                "expected": [422]
            }
        ]
        
        for test in validation_tests:
            start_time = time.time()
            response = self.make_request(
                "POST", "/api/v1/organization/people/",
                test["data"], self.get_auth_headers()
            )
            
            status = TestStatus.PASS if response.status_code in test["expected"] else TestStatus.FAIL
            error_msg = None if status == TestStatus.PASS else f"Expected {test['expected']}, got {response.status_code}"
            
            self.log_result(
                f"Validation - {test['name']}", "/api/v1/organization/people/", "POST",
                test["expected"], response, test["data"], start_time, status, error_msg
            )
    
    def test_list_people(self) -> bool:
        """Test listing people with pagination"""
        print("\n📋 List People Tests") 
        print("-" * 40)
        
        # Test basic list
        start_time = time.time()
        response = self.make_request(
            "GET", "/api/v1/organization/people/", 
            headers=self.get_auth_headers()
        )
        
        success = False
        if response.status_code == 200:
            try:
                data = response.json()
                required_fields = ["people", "total", "page", "page_size", "total_pages"]
                if all(field in data for field in required_fields):
                    success = True
                    self.config["test_data"]["people_list"] = data
            except:
                pass
        
        status = TestStatus.PASS if success else TestStatus.FAIL
        error_msg = None if success else "Invalid response structure"
        
        self.log_result(
            "List People - Basic", "/api/v1/organization/people/", "GET",
            [200], response, None, start_time, status, error_msg
        )
        
        # Test with pagination parameters
        start_time = time.time()
        response = self.make_request(
            "GET", "/api/v1/organization/people/?page=1&page_size=5",
            headers=self.get_auth_headers()
        )
        
        status = TestStatus.PASS if response.status_code == 200 else TestStatus.FAIL
        self.log_result(
            "List People - Pagination", "/api/v1/organization/people/?page=1&page_size=5", "GET",
            [200], response, None, start_time, status
        )
        
        return success
    
    def test_get_person_not_found(self):
        """Test getting non-existent person"""
        print("\n🔍 Get Person Tests")
        print("-" * 40)
        
        fake_id = str(uuid.uuid4())
        endpoint = f"/api/v1/organization/people/{fake_id}"
        
        start_time = time.time()
        response = self.make_request("GET", endpoint, headers=self.get_auth_headers())
        
        status = TestStatus.PASS if response.status_code == 404 else TestStatus.FAIL
        error_msg = None if status == TestStatus.PASS else f"Expected 404, got {response.status_code}"
        
        self.log_result(
            "Get Person - Not Found", endpoint, "GET",
            [404], response, None, start_time, status, error_msg
        )
    
    def test_update_person_not_found(self):
        """Test updating non-existent person"""
        print("\n✏️ Update Person Tests")
        print("-" * 40)
        
        fake_id = str(uuid.uuid4())
        endpoint = f"/api/v1/organization/people/{fake_id}"
        update_data = {"job_title": "Updated Title"}
        
        start_time = time.time()
        response = self.make_request("PUT", endpoint, update_data, self.get_auth_headers())
        
        status = TestStatus.PASS if response.status_code == 404 else TestStatus.FAIL
        error_msg = None if status == TestStatus.PASS else f"Expected 404, got {response.status_code}"
        
        self.log_result(
            "Update Person - Not Found", endpoint, "PUT",
            [404], response, update_data, start_time, status, error_msg
        )
    
    def test_delete_person_not_found(self):
        """Test deleting non-existent person"""
        print("\n🗑️ Delete Person Tests")
        print("-" * 40)
        
        fake_id = str(uuid.uuid4())
        endpoint = f"/api/v1/organization/people/{fake_id}"
        
        start_time = time.time()
        response = self.make_request("DELETE", endpoint, headers=self.get_auth_headers())
        
        status = TestStatus.PASS if response.status_code == 404 else TestStatus.FAIL
        error_msg = None if status == TestStatus.PASS else f"Expected 404, got {response.status_code}"
        
        self.log_result(
            "Delete Person - Not Found", endpoint, "DELETE",
            [404], response, None, start_time, status, error_msg
        )
    
    def test_unauthorized_access(self):
        """Test unauthorized access to endpoints"""
        print("\n🔒 Authorization Tests")
        print("-" * 40)
        
        endpoints = [
            ("GET", "/api/v1/organization/people/"),
            ("POST", "/api/v1/organization/people/", {"first_name": "Test", "last_name": "User", "email": "test@test.com", "role": "User"}),
            ("GET", f"/api/v1/organization/people/{uuid.uuid4()}"),
            ("PUT", f"/api/v1/organization/people/{uuid.uuid4()}", {"job_title": "Test"}),
            ("DELETE", f"/api/v1/organization/people/{uuid.uuid4()}")
        ]
        
        for method, endpoint, *payload_list in endpoints:
            payload = payload_list[0] if payload_list else None
            
            start_time = time.time()
            response = self.make_request(method, endpoint, payload)  # No auth headers
            
            status = TestStatus.PASS if response.status_code in [401, 403] else TestStatus.FAIL
            error_msg = None if status == TestStatus.PASS else f"Expected 401/403, got {response.status_code}"
            
            self.log_result(
                f"Unauthorized - {method} {endpoint}", endpoint, method,
                [401, 403], response, payload, start_time, status, error_msg
            )
    
    def cleanup_test_data(self):
        """Clean up any created test data"""
        print("\n🧹 Cleanup Phase")
        print("-" * 40)
        
        deleted_count = 0
        for person_id in self.config["created_people"]:
            endpoint = f"/api/v1/organization/people/{person_id}"
            start_time = time.time()
            response = self.make_request("DELETE", endpoint, headers=self.get_auth_headers())
            
            if response.status_code == 204:
                deleted_count += 1
                
            self.log_result(
                f"Cleanup - Delete {person_id[:8]}...", endpoint, "DELETE",
                [204, 404], response, None, start_time, 
                TestStatus.PASS if response.status_code in [204, 404] else TestStatus.FAIL
            )
        
        print(f"🗑️ Cleaned up {deleted_count} test records")
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite"""
        print("🚀 People Management API - Comprehensive Test Suite")
        print("=" * 60)
        print(f"📍 Base URL: {self.base_url}")
        print(f"📧 Test User: {self.config['test_user']['email']}")
        print(f"🕒 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Authentication is required for all tests
        if not self.authenticate():
            print("❌ Test suite aborted - Authentication failed")
            return self.generate_report()
        
        # Run test phases
        test_phases = [
            ("Person Creation", [
                self.test_create_person_success,
                self.test_create_person_validation_errors
            ]),
            ("Data Retrieval", [
                self.test_list_people,
                self.test_get_person_not_found
            ]),
            ("Data Modification", [
                self.test_update_person_not_found,
                self.test_delete_person_not_found
            ]),
            ("Security", [
                self.test_unauthorized_access
            ])
        ]
        
        for phase_name, test_functions in test_phases:
            for test_func in test_functions:
                try:
                    test_func()
                    time.sleep(0.1)  # Small delay between tests
                except Exception as e:
                    print(f"💥 Test function {test_func.__name__} failed with exception: {str(e)}")
        
        # Cleanup
        self.cleanup_test_data()
        
        # Generate report
        return self.generate_report()
    
    def generate_report(self, filename: str = "people_test_report.json") -> Dict[str, Any]:
        """Generate comprehensive test report"""
        print(f"\n📄 Generating Test Report: {filename}")
        print("-" * 40)
        
        # Calculate statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r.status == TestStatus.PASS)
        failed_tests = sum(1 for r in self.test_results if r.status == TestStatus.FAIL)
        skipped_tests = sum(1 for r in self.test_results if r.status == TestStatus.SKIP)
        error_tests = sum(1 for r in self.test_results if r.status == TestStatus.ERROR)
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        avg_duration = sum(r.duration_ms for r in self.test_results) / total_tests if total_tests > 0 else 0
        
        # Group by endpoint for analysis
        endpoint_stats = {}
        for result in self.test_results:
            endpoint = result.endpoint
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    "total_calls": 0,
                    "passed": 0,
                    "failed": 0,
                    "errors": 0,
                    "avg_duration_ms": 0
                }
            
            stats = endpoint_stats[endpoint]
            stats["total_calls"] += 1
            
            if result.status == TestStatus.PASS:
                stats["passed"] += 1
            elif result.status == TestStatus.FAIL:
                stats["failed"] += 1
            elif result.status == TestStatus.ERROR:
                stats["errors"] += 1
        
        # Calculate average durations
        for endpoint, stats in endpoint_stats.items():
            durations = [r.duration_ms for r in self.test_results if r.endpoint == endpoint]
            stats["avg_duration_ms"] = round(sum(durations) / len(durations), 2) if durations else 0
        
        # Create comprehensive report
        report = {
            "test_metadata": {
                "generated_at": datetime.utcnow().isoformat() + 'Z',
                "test_suite": "People Management API - Comprehensive Tests",
                "base_url": self.base_url,
                "test_user": self.config["test_user"]["email"],
                "documentation_ref": "/docs/api/PEOPLE.md"
            },
            "test_summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "skipped": skipped_tests,
                "errors": error_tests,
                "success_rate_percent": round(success_rate, 2),
                "average_duration_ms": round(avg_duration, 2)
            },
            "endpoint_analysis": endpoint_stats,
            "known_issues": {
                "create_person_409_conflict": {
                    "description": "POST /api/v1/organization/people/ returns 409 Conflict for unique data",
                    "status": "Active",
                    "impact": "Prevents all person creation",
                    "documented_in": "/docs/api/PEOPLE.md#known-issues"
                }
            },
            "detailed_results": [asdict(result) for result in self.test_results],
            "test_data_summary": {
                "people_created": len(self.config["created_people"]),
                "created_person_ids": self.config["created_people"],
                "sample_data": self.config.get("test_data", {})
            }
        }
        
        # Save report
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"✅ Report saved successfully!")
        except Exception as e:
            print(f"❌ Failed to save report: {e}")
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")  
        print(f"   Errors: {error_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Average Duration: {avg_duration:.1f}ms")
        
        return report


def main():
    """Main execution function"""
    tester = PeopleAPITester()
    
    try:
        report = tester.run_all_tests()
        
        print("\n" + "=" * 60)
        print("🎯 People Management API Testing Complete!")
        print(f"📄 Report saved: people_test_report.json")
        print(f"📚 Documentation: /docs/api/PEOPLE.md")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n🛑 Testing interrupted by user")
        tester.cleanup_test_data()
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()