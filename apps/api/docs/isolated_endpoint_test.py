#!/usr/bin/env python3
"""
Isolated New Endpoint Testing Framework for Arketic AI/ML Backend

This framework provides a systematic approach to testing new endpoints in isolation
before integrating them into the main test suites, following AR-84 requirements.

The framework supports:
- Isolated testing of new endpoints
- Comprehensive validation and performance testing
- JSON report generation for integration decisions
- Automated integration workflow recommendations

Author: Claude
Created: 2025-08-10
Updated: 2025-08-10 (AR-84: Isolated Endpoint Testing Framework)
"""

import json
import requests
import time
import uuid
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass
class EndpointTestResult:
    """Structure for individual endpoint test results"""
    endpoint: str
    method: str
    test_case: str
    payload: Optional[Dict[str, Any]]
    headers: Dict[str, str]
    response_status: int
    response_body: Optional[Dict[str, Any]]
    response_text: str
    timestamp: str
    duration_ms: float
    success: bool
    error_message: Optional[str]
    validation_passed: bool
    performance_acceptable: bool


@dataclass
class EndpointValidation:
    """Structure for endpoint validation criteria"""
    endpoint: str
    method: str
    expected_status_codes: List[int]
    required_response_fields: List[str]
    performance_threshold_ms: float
    authentication_required: bool
    test_cases: List[Dict[str, Any]]


@dataclass
class IntegrationRecommendation:
    """Structure for integration decision recommendations"""
    endpoint: str
    overall_score: float
    integration_ready: bool
    test_pass_rate: float
    performance_score: float
    validation_score: float
    recommendations: List[str]
    blocking_issues: List[str]


class IsolatedEndpointTester:
    """Framework for testing new endpoints in isolation"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[EndpointTestResult] = []
        self.endpoint_validations: Dict[str, EndpointValidation] = {}
        self.integration_recommendations: List[IntegrationRecommendation] = []
        
        # Authentication setup
        self.auth_data = {
            "access_token": None,
            "user_email": "test@arketic.com",
            "user_password": "testpass123"
        }
    
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print("🔐 Authenticating for isolated endpoint testing...")
        
        payload = {
            "email": self.auth_data["user_email"],
            "password": self.auth_data["user_password"],
            "remember_me": False
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_data["access_token"] = data.get("access_token")
                print("   ✅ Authentication successful")
                return True
            else:
                print(f"   ❌ Authentication failed: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Authentication error: {str(e)}")
        
        # Use test token for development
        self.auth_data["access_token"] = "test-token-for-development"
        print("   ⚠️  Using test token for isolated endpoint testing")
        return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        headers = {"Content-Type": "application/json"}
        if self.auth_data["access_token"]:
            headers["Authorization"] = f"Bearer {self.auth_data['access_token']}"
        return headers
    
    def define_new_rag_endpoints(self):
        """Define validation criteria for new RAG endpoints"""
        print("📋 Defining validation criteria for new RAG endpoints...")
        
        # RAG Search Endpoint
        self.endpoint_validations["/api/v1/chat/rag-search"] = EndpointValidation(
            endpoint="/api/v1/chat/rag-search",
            method="POST",
            expected_status_codes=[200, 400, 401, 404],
            required_response_fields=["success", "data", "message"],
            performance_threshold_ms=2000.0,
            authentication_required=True,
            test_cases=[
                {
                    "name": "valid_rag_search",
                    "payload": {
                        "query": "What is Python programming?",
                        "chat_id": "test-chat-id",
                        "max_results": 5,
                        "threshold": 0.7
                    },
                    "expected_status": 200,
                    "description": "Valid RAG search query"
                },
                {
                    "name": "empty_query",
                    "payload": {
                        "query": "",
                        "chat_id": "test-chat-id"
                    },
                    "expected_status": 400,
                    "description": "Empty query should return validation error"
                },
                {
                    "name": "missing_chat_id",
                    "payload": {
                        "query": "Test query"
                    },
                    "expected_status": 400,
                    "description": "Missing chat_id should return validation error"
                }
            ]
        )
        
        # Vector Similarity Endpoint
        self.endpoint_validations["/api/v1/knowledge/vector-similarity"] = EndpointValidation(
            endpoint="/api/v1/knowledge/vector-similarity",
            method="POST",
            expected_status_codes=[200, 400, 401, 404],
            required_response_fields=["success", "results"],
            performance_threshold_ms=1500.0,
            authentication_required=True,
            test_cases=[
                {
                    "name": "valid_similarity_search",
                    "payload": {
                        "query": "machine learning algorithms",
                        "limit": 5,
                        "threshold": 0.6
                    },
                    "expected_status": 200,
                    "description": "Valid vector similarity search"
                },
                {
                    "name": "high_threshold",
                    "payload": {
                        "query": "test query",
                        "threshold": 0.95
                    },
                    "expected_status": 200,
                    "description": "High threshold should return fewer results"
                },
                {
                    "name": "invalid_threshold",
                    "payload": {
                        "query": "test query",
                        "threshold": 1.5
                    },
                    "expected_status": 400,
                    "description": "Invalid threshold should return validation error"
                }
            ]
        )
        
        # RAG Sources Endpoint
        self.endpoint_validations["/api/v1/chat/rag-sources"] = EndpointValidation(
            endpoint="/api/v1/chat/rag-sources",
            method="GET",
            expected_status_codes=[200, 400, 401, 404],
            required_response_fields=["success", "sources"],
            performance_threshold_ms=1000.0,
            authentication_required=True,
            test_cases=[
                {
                    "name": "get_chat_sources",
                    "payload": None,  # GET request
                    "query_params": {"chat_id": "test-chat-id"},
                    "expected_status": 200,
                    "description": "Get RAG sources for a chat"
                },
                {
                    "name": "missing_chat_id",
                    "payload": None,
                    "query_params": {},
                    "expected_status": 400,
                    "description": "Missing chat_id should return validation error"
                },
                {
                    "name": "invalid_chat_id",
                    "payload": None,
                    "query_params": {"chat_id": "invalid-chat-id-12345"},
                    "expected_status": 404,
                    "description": "Invalid chat_id should return not found"
                }
            ]
        )
        
        print(f"   ✅ Defined validation criteria for {len(self.endpoint_validations)} endpoints")
    
    def test_endpoint_isolated(self, endpoint_key: str) -> Tuple[int, int, List[str]]:
        """Test a single endpoint in isolation"""
        if endpoint_key not in self.endpoint_validations:
            print(f"❌ No validation criteria defined for {endpoint_key}")
            return 0, 0, ["No validation criteria defined"]
        
        validation = self.endpoint_validations[endpoint_key]
        print(f"\n🧪 Testing {validation.endpoint} ({validation.method}) in isolation...")
        
        successful_tests = 0
        total_tests = len(validation.test_cases)
        issues = []
        
        for test_case in validation.test_cases:
            print(f"   🔍 Running test case: {test_case['name']}")
            
            start_time = time.time()
            success = True
            error_msg = None
            validation_passed = True
            performance_acceptable = True
            
            try:
                # Prepare request
                url = f"{self.base_url}{validation.endpoint}"
                headers = self.get_auth_headers() if validation.authentication_required else {"Content-Type": "application/json"}
                
                # Handle query parameters for GET requests
                if validation.method.upper() == "GET" and "query_params" in test_case:
                    query_params = "&".join([f"{k}={v}" for k, v in test_case["query_params"].items()])
                    if query_params:
                        url += f"?{query_params}"
                
                # Make request
                if validation.method.upper() == "GET":
                    response = self.session.get(url, headers=headers, timeout=30)
                elif validation.method.upper() == "POST":
                    response = self.session.post(url, json=test_case["payload"], headers=headers, timeout=30)
                elif validation.method.upper() == "PUT":
                    response = self.session.put(url, json=test_case["payload"], headers=headers, timeout=30)
                elif validation.method.upper() == "DELETE":
                    response = self.session.delete(url, headers=headers, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {validation.method}")
                
                duration_ms = (time.time() - start_time) * 1000
                
                # Validate response status
                if response.status_code not in validation.expected_status_codes:
                    success = False
                    validation_passed = False
                    error_msg = f"Unexpected status code: {response.status_code} (expected: {validation.expected_status_codes})"
                
                # Check specific expected status for test case
                expected_status = test_case.get("expected_status")
                if expected_status and response.status_code != expected_status:
                    success = False
                    validation_passed = False
                    error_msg = f"Test case expected {expected_status}, got {response.status_code}"
                
                # Validate response structure
                if response.status_code == 200:
                    try:
                        response_data = response.json()
                        
                        # Check required fields
                        missing_fields = []
                        for field in validation.required_response_fields:
                            if field not in response_data:
                                missing_fields.append(field)
                        
                        if missing_fields:
                            validation_passed = False
                            error_msg = f"Missing required fields: {missing_fields}"
                            success = False
                    except json.JSONDecodeError:
                        validation_passed = False
                        error_msg = "Invalid JSON response"
                        success = False
                
                # Check performance
                if duration_ms > validation.performance_threshold_ms:
                    performance_acceptable = False
                    issues.append(f"Performance issue: {duration_ms:.2f}ms > {validation.performance_threshold_ms}ms")
                
                # Parse response body
                try:
                    response_body = response.json() if response.text else None
                except json.JSONDecodeError:
                    response_body = None
                
                # Log result
                result = EndpointTestResult(
                    endpoint=validation.endpoint,
                    method=validation.method,
                    test_case=test_case["name"],
                    payload=test_case["payload"],
                    headers=headers,
                    response_status=response.status_code,
                    response_body=response_body,
                    response_text=response.text,
                    timestamp=datetime.utcnow().isoformat() + 'Z',
                    duration_ms=round(duration_ms, 2),
                    success=success,
                    error_message=error_msg,
                    validation_passed=validation_passed,
                    performance_acceptable=performance_acceptable
                )
                
                self.test_results.append(result)
                
                # Print result
                status = "✅ PASS" if success else "❌ FAIL"
                perf_status = "⚡ FAST" if performance_acceptable else "🐌 SLOW"
                print(f"      {status} {perf_status} {test_case['name']} ({response.status_code}) - {duration_ms:.2f}ms")
                
                if error_msg:
                    print(f"         Error: {error_msg}")
                
                if success:
                    successful_tests += 1
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                error_msg = f"Request exception: {str(e)}"
                
                # Log failed result
                result = EndpointTestResult(
                    endpoint=validation.endpoint,
                    method=validation.method,
                    test_case=test_case["name"],
                    payload=test_case["payload"],
                    headers=headers if 'headers' in locals() else {},
                    response_status=0,
                    response_body=None,
                    response_text=str(e),
                    timestamp=datetime.utcnow().isoformat() + 'Z',
                    duration_ms=round(duration_ms, 2),
                    success=False,
                    error_message=error_msg,
                    validation_passed=False,
                    performance_acceptable=True  # Can't measure performance if request failed
                )
                
                self.test_results.append(result)
                print(f"      ❌ FAIL {test_case['name']} - {error_msg}")
                issues.append(f"Test case '{test_case['name']}' failed: {error_msg}")
        
        print(f"   📊 Isolated test results: {successful_tests}/{total_tests} passed")
        return successful_tests, total_tests, issues
    
    def calculate_integration_score(self, endpoint_key: str, successful_tests: int, total_tests: int, issues: List[str]) -> IntegrationRecommendation:
        """Calculate integration readiness score for an endpoint"""
        validation = self.endpoint_validations[endpoint_key]
        
        # Get results for this endpoint
        endpoint_results = [r for r in self.test_results if r.endpoint == validation.endpoint]
        
        # Calculate scores
        test_pass_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        # Performance score
        performance_results = [r for r in endpoint_results if r.performance_acceptable]
        performance_score = (len(performance_results) / len(endpoint_results)) * 100 if endpoint_results else 0
        
        # Validation score
        validation_results = [r for r in endpoint_results if r.validation_passed]
        validation_score = (len(validation_results) / len(endpoint_results)) * 100 if endpoint_results else 0
        
        # Overall score (weighted)
        overall_score = (test_pass_rate * 0.5) + (performance_score * 0.3) + (validation_score * 0.2)
        
        # Integration readiness
        integration_ready = (
            test_pass_rate >= 90.0 and  # At least 90% tests pass
            performance_score >= 80.0 and  # At least 80% meet performance criteria
            validation_score >= 95.0 and  # At least 95% pass validation
            len([issue for issue in issues if "blocking" in issue.lower()]) == 0  # No blocking issues
        )
        
        # Generate recommendations
        recommendations = []
        blocking_issues = []
        
        if test_pass_rate < 90.0:
            recommendations.append(f"Improve test pass rate: {test_pass_rate:.1f}% < 90%")
            if test_pass_rate < 50.0:
                blocking_issues.append("Test pass rate too low for integration")
        
        if performance_score < 80.0:
            recommendations.append(f"Optimize performance: {performance_score:.1f}% of tests meet threshold")
        
        if validation_score < 95.0:
            recommendations.append(f"Fix validation issues: {validation_score:.1f}% pass validation")
            if validation_score < 80.0:
                blocking_issues.append("Too many validation failures")
        
        if integration_ready:
            recommendations.append("✅ Ready for integration into main test suite")
        else:
            recommendations.append("❌ Not ready for integration - address issues first")
        
        return IntegrationRecommendation(
            endpoint=validation.endpoint,
            overall_score=round(overall_score, 2),
            integration_ready=integration_ready,
            test_pass_rate=round(test_pass_rate, 2),
            performance_score=round(performance_score, 2),
            validation_score=round(validation_score, 2),
            recommendations=recommendations,
            blocking_issues=blocking_issues
        )
    
    def test_all_new_endpoints(self):
        """Test all defined new endpoints in isolation"""
        print("🚀 Starting Isolated Endpoint Testing for New RAG Endpoints")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📧 Test Email: {self.auth_data['user_email']}")
        print("=" * 80)
        
        # Authenticate
        self.authenticate()
        
        # Define endpoints to test
        self.define_new_rag_endpoints()
        
        # Test each endpoint
        overall_successful = 0
        overall_total = 0
        
        for endpoint_key in self.endpoint_validations.keys():
            successful, total, issues = self.test_endpoint_isolated(endpoint_key)
            overall_successful += successful
            overall_total += total
            
            # Calculate integration recommendation
            recommendation = self.calculate_integration_score(endpoint_key, successful, total, issues)
            self.integration_recommendations.append(recommendation)
            
            # Print immediate feedback
            status = "✅ READY" if recommendation.integration_ready else "❌ NOT READY"
            print(f"   {status} {endpoint_key} - Score: {recommendation.overall_score:.1f}/100")
            
            time.sleep(0.5)  # Small delay between endpoint tests
        
        print("\n" + "=" * 80)
        print(f"📊 Overall Isolated Testing Results: {overall_successful}/{overall_total} tests passed")
        ready_count = sum(1 for r in self.integration_recommendations if r.integration_ready)
        print(f"🎯 Integration Ready Endpoints: {ready_count}/{len(self.integration_recommendations)}")
        
        return self.test_results, self.integration_recommendations
    
    def generate_integration_report(self, filename: str = "isolated_endpoint_test_report.json"):
        """Generate detailed integration readiness report"""
        print(f"\n📄 Generating isolated endpoint test report: {filename}")
        
        # Calculate summary statistics
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results if result.success)
        ready_endpoints = sum(1 for rec in self.integration_recommendations if rec.integration_ready)
        
        # Group results by endpoint
        endpoint_summary = {}
        for result in self.test_results:
            endpoint = result.endpoint
            if endpoint not in endpoint_summary:
                endpoint_summary[endpoint] = {
                    "total_tests": 0,
                    "successful_tests": 0,
                    "average_duration_ms": 0.0,
                    "performance_issues": 0,
                    "validation_failures": 0
                }
            
            endpoint_summary[endpoint]["total_tests"] += 1
            if result.success:
                endpoint_summary[endpoint]["successful_tests"] += 1
            if not result.performance_acceptable:
                endpoint_summary[endpoint]["performance_issues"] += 1
            if not result.validation_passed:
                endpoint_summary[endpoint]["validation_failures"] += 1
        
        # Calculate average durations
        for endpoint, stats in endpoint_summary.items():
            durations = [r.duration_ms for r in self.test_results if r.endpoint == endpoint]
            stats["average_duration_ms"] = round(sum(durations) / len(durations), 2) if durations else 0.0
        
        # Create comprehensive report
        report = {
            "test_metadata": {
                "generated_at": datetime.utcnow().isoformat() + 'Z',
                "test_type": "ISOLATED_ENDPOINT_TESTING",
                "base_url": self.base_url,
                "test_email": self.auth_data["user_email"],
                "total_endpoints_tested": len(self.endpoint_validations),
                "total_test_cases": total_tests,
                "successful_test_cases": successful_tests,
                "failed_test_cases": total_tests - successful_tests,
                "overall_success_rate_percent": round((successful_tests / total_tests) * 100, 2) if total_tests > 0 else 0,
                "integration_ready_endpoints": ready_endpoints,
                "integration_readiness_rate": round((ready_endpoints / len(self.integration_recommendations)) * 100, 2) if self.integration_recommendations else 0
            },
            "integration_summary": {
                "ready_for_integration": [rec.endpoint for rec in self.integration_recommendations if rec.integration_ready],
                "needs_improvement": [rec.endpoint for rec in self.integration_recommendations if not rec.integration_ready],
                "blocking_issues_found": any(rec.blocking_issues for rec in self.integration_recommendations),
                "average_integration_score": round(sum(rec.overall_score for rec in self.integration_recommendations) / len(self.integration_recommendations), 2) if self.integration_recommendations else 0
            },
            "endpoint_summary": endpoint_summary,
            "integration_recommendations": [asdict(rec) for rec in self.integration_recommendations],
            "detailed_test_results": [asdict(result) for result in self.test_results],
            "next_steps": self._generate_next_steps(),
            "validation_criteria": {
                endpoint: {
                    "method": val.method,
                    "expected_status_codes": val.expected_status_codes,
                    "required_response_fields": val.required_response_fields,
                    "performance_threshold_ms": val.performance_threshold_ms,
                    "authentication_required": val.authentication_required,
                    "test_cases_count": len(val.test_cases)
                }
                for endpoint, val in self.endpoint_validations.items()
            }
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Isolated endpoint test report saved successfully!")
        print(f"📈 Overall Test Success Rate: {report['test_metadata']['overall_success_rate_percent']}%")
        print(f"🎯 Integration Readiness Rate: {report['test_metadata']['integration_readiness_rate']}%")
        print(f"⚡ Average Integration Score: {report['integration_summary']['average_integration_score']:.1f}/100")
        
        # Print integration recommendations
        print(f"\n🚦 Integration Status:")
        for rec in self.integration_recommendations:
            status = "✅ READY" if rec.integration_ready else "❌ NOT READY"
            print(f"   {status} {rec.endpoint} ({rec.overall_score:.1f}/100)")
            
            if rec.blocking_issues:
                print(f"      🚫 Blocking Issues:")
                for issue in rec.blocking_issues:
                    print(f"         • {issue}")
            
            if not rec.integration_ready and rec.recommendations:
                print(f"      💡 Recommendations:")
                for recommendation in rec.recommendations[:3]:  # Show top 3
                    print(f"         • {recommendation}")
    
    def _generate_next_steps(self) -> List[str]:
        """Generate next steps based on test results"""
        next_steps = []
        
        ready_endpoints = [rec for rec in self.integration_recommendations if rec.integration_ready]
        not_ready_endpoints = [rec for rec in self.integration_recommendations if not rec.integration_ready]
        
        if ready_endpoints:
            next_steps.append(f"✅ Integrate {len(ready_endpoints)} ready endpoints into main test suites")
            for rec in ready_endpoints:
                next_steps.append(f"   • Add {rec.endpoint} to appropriate test files (chat_test.py, knowledge_test.py)")
        
        if not_ready_endpoints:
            next_steps.append(f"⚠️  Address issues in {len(not_ready_endpoints)} endpoints before integration")
            for rec in not_ready_endpoints:
                if rec.blocking_issues:
                    next_steps.append(f"   • Fix blocking issues in {rec.endpoint}")
                else:
                    next_steps.append(f"   • Optimize {rec.endpoint} (score: {rec.overall_score:.1f}/100)")
        
        next_steps.append("📋 Re-run isolated tests after improvements")
        next_steps.append("🔄 Update main test suites with successfully tested endpoints")
        next_steps.append("📊 Monitor performance in integrated environment")
        
        return next_steps


def main():
    """Main execution function"""
    print("🧪 Isolated New Endpoint Testing Framework")
    print("📋 Testing new RAG endpoints before integration")
    print()
    
    # Initialize tester
    tester = IsolatedEndpointTester()
    
    try:
        # Run isolated tests
        test_results, recommendations = tester.test_all_new_endpoints()
        
        # Generate integration report
        tester.generate_integration_report()
        
        print("\n🎉 Isolated Endpoint Testing Complete!")
        print("📄 Check 'isolated_endpoint_test_report.json' for detailed integration analysis")
        print("\n💡 Framework Features:")
        print("   ✅ Isolated endpoint testing")
        print("   ✅ Performance benchmarking")
        print("   ✅ Response validation")
        print("   ✅ Integration readiness scoring")
        print("   ✅ Automated recommendations")
        print("   ✅ Blocking issue detection")
        
    except KeyboardInterrupt:
        print("\n🛑 Isolated testing interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        # Still generate report with partial results
        if tester.test_results or tester.integration_recommendations:
            tester.generate_integration_report()


if __name__ == "__main__":
    main()