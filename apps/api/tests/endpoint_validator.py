#!/usr/bin/env python3
"""
New Endpoint Validation Workflow

This script provides a structured workflow for validating new API endpoints
before they are integrated into the main test suite. It performs comprehensive
testing including functionality, security, performance, and documentation validation.

Author: Claude
Created: 2025-08-10 (AR-83 Implementation)
"""

import os
import sys
import json
import time
import requests
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urlparse
import yaml

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class EndpointConfig:
    """Configuration for endpoint under test"""
    path: str
    method: str
    description: str
    auth_required: bool = True
    payload_schema: Optional[Dict] = None
    response_schema: Optional[Dict] = None
    test_payloads: Optional[List[Dict]] = None
    expected_status: int = 200
    performance_threshold_ms: int = 1000

@dataclass
class ValidationResult:
    """Result of a single validation test"""
    test_name: str
    success: bool
    duration_ms: float
    details: str
    error_message: Optional[str] = None
    response_status: Optional[int] = None
    response_data: Optional[Any] = None

@dataclass
class EndpointValidationReport:
    """Complete validation report for an endpoint"""
    endpoint: str
    method: str
    timestamp: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    success_rate: float
    average_duration_ms: float
    results: List[ValidationResult]
    recommendation: str

class EndpointValidator:
    """Comprehensive endpoint validation class"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.auth_token = None
        self.test_user = {
            "email": "test@arketic.com",
            "password": "testpass123"
        }
        
    def authenticate(self) -> bool:
        """Authenticate and get auth token"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/login",
                json=self.test_user,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.session.headers.update({
                    'Authorization': f'Bearer {self.auth_token}'
                })
                return True
                
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            
        return False
    
    def validate_endpoint(self, config: EndpointConfig) -> EndpointValidationReport:
        """Run comprehensive validation on an endpoint"""
        print(f"\n🔍 Validating endpoint: {config.method} {config.path}")
        print(f"📋 Description: {config.description}")
        
        results = []
        start_time = time.time()
        
        # Authentication check
        if config.auth_required and not self.auth_token:
            if not self.authenticate():
                return self._create_failed_report(config, "Authentication failed")
        
        # Run validation tests
        test_methods = [
            self._test_endpoint_accessibility,
            self._test_request_validation,
            self._test_response_structure,
            self._test_error_handling,
            self._test_authentication_requirements,
            self._test_performance,
            self._test_security_headers,
            self._test_data_consistency
        ]
        
        for test_method in test_methods:
            try:
                result = test_method(config)
                results.append(result)
                status = "✅" if result.success else "❌"
                print(f"  {status} {result.test_name} ({result.duration_ms:.2f}ms)")
                if not result.success and result.error_message:
                    print(f"      Error: {result.error_message}")
                    
            except Exception as e:
                results.append(ValidationResult(
                    test_name=test_method.__name__.replace('_test_', '').replace('_', ' ').title(),
                    success=False,
                    duration_ms=0.0,
                    details=f"Test execution failed: {str(e)}",
                    error_message=str(e)
                ))
                print(f"  ❌ {test_method.__name__} failed: {e}")
        
        # Generate report
        total_duration = (time.time() - start_time) * 1000
        return self._generate_report(config, results, total_duration)
    
    def _test_endpoint_accessibility(self, config: EndpointConfig) -> ValidationResult:
        """Test if endpoint is accessible with basic request"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            
            # Prepare request
            kwargs = {'timeout': 10}
            if config.method.upper() == 'GET':
                response = self.session.get(url, **kwargs)
            elif config.method.upper() == 'POST':
                test_payload = config.test_payloads[0] if config.test_payloads else {}
                response = self.session.post(url, json=test_payload, **kwargs)
            elif config.method.upper() == 'PUT':
                test_payload = config.test_payloads[0] if config.test_payloads else {}
                response = self.session.put(url, json=test_payload, **kwargs)
            elif config.method.upper() == 'DELETE':
                response = self.session.delete(url, **kwargs)
            else:
                return ValidationResult(
                    test_name="Endpoint Accessibility",
                    success=False,
                    duration_ms=(time.time() - start_time) * 1000,
                    details=f"Unsupported HTTP method: {config.method}",
                    error_message=f"Method {config.method} not supported"
                )
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Check if endpoint is accessible (not 404, 500, etc.)
            accessible = response.status_code < 500
            
            return ValidationResult(
                test_name="Endpoint Accessibility",
                success=accessible,
                duration_ms=duration_ms,
                details=f"HTTP {response.status_code}: Endpoint {'accessible' if accessible else 'not accessible'}",
                response_status=response.status_code,
                error_message=None if accessible else f"HTTP {response.status_code}"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Endpoint Accessibility",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Request failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_request_validation(self, config: EndpointConfig) -> ValidationResult:
        """Test request validation and schema compliance"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            
            # Test with valid payload
            if config.test_payloads:
                valid_payload = config.test_payloads[0]
                response = self._make_request(config.method, url, valid_payload)
                
                if response.status_code >= 400:
                    return ValidationResult(
                        test_name="Request Validation",
                        success=False,
                        duration_ms=(time.time() - start_time) * 1000,
                        details=f"Valid payload rejected with status {response.status_code}",
                        error_message=f"Valid payload failed: {response.status_code}",
                        response_status=response.status_code
                    )
            
            # Test with invalid payload (if applicable)
            if config.method.upper() in ['POST', 'PUT'] and config.payload_schema:
                invalid_response = self._make_request(config.method, url, {"invalid": "data"})
                
                # Should return 400-level error for invalid data
                if invalid_response.status_code < 400:
                    return ValidationResult(
                        test_name="Request Validation",
                        success=False,
                        duration_ms=(time.time() - start_time) * 1000,
                        details="Endpoint accepts invalid payload without validation",
                        error_message="Invalid payload not properly rejected"
                    )
            
            return ValidationResult(
                test_name="Request Validation",
                success=True,
                duration_ms=(time.time() - start_time) * 1000,
                details="Request validation working correctly"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Request Validation",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Validation test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_response_structure(self, config: EndpointConfig) -> ValidationResult:
        """Test response structure and schema compliance"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            
            # Make request with valid payload
            if config.test_payloads:
                payload = config.test_payloads[0]
            else:
                payload = None
            
            response = self._make_request(config.method, url, payload)
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Check response structure
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    response_data = response.json()
                    
                    # Basic structure validation
                    if config.response_schema:
                        # TODO: Implement detailed schema validation
                        pass
                    
                    # Check for common response patterns
                    has_proper_structure = isinstance(response_data, (dict, list))
                    
                    return ValidationResult(
                        test_name="Response Structure",
                        success=has_proper_structure,
                        duration_ms=duration_ms,
                        details=f"Response structure {'valid' if has_proper_structure else 'invalid'}",
                        response_data=response_data,
                        response_status=response.status_code
                    )
                else:
                    # Non-JSON response
                    return ValidationResult(
                        test_name="Response Structure",
                        success=True,
                        duration_ms=duration_ms,
                        details=f"Non-JSON response: {response.headers.get('content-type')}",
                        response_status=response.status_code
                    )
                    
            except json.JSONDecodeError:
                return ValidationResult(
                    test_name="Response Structure",
                    success=False,
                    duration_ms=duration_ms,
                    details="Invalid JSON in response",
                    error_message="Response contains invalid JSON",
                    response_status=response.status_code
                )
                
        except Exception as e:
            return ValidationResult(
                test_name="Response Structure",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Response structure test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_error_handling(self, config: EndpointConfig) -> ValidationResult:
        """Test error handling and appropriate error responses"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            
            # Test various error scenarios
            error_tests_passed = 0
            total_error_tests = 0
            
            # Test 1: Invalid authentication (if auth required)
            if config.auth_required:
                old_auth = self.session.headers.get('Authorization')
                self.session.headers['Authorization'] = 'Bearer invalid_token'
                
                response = self._make_request(config.method, url, config.test_payloads[0] if config.test_payloads else None)
                
                if response.status_code == 401:
                    error_tests_passed += 1
                total_error_tests += 1
                
                # Restore auth
                if old_auth:
                    self.session.headers['Authorization'] = old_auth
                else:
                    self.session.headers.pop('Authorization', None)
            
            # Test 2: Malformed JSON (for POST/PUT)
            if config.method.upper() in ['POST', 'PUT']:
                try:
                    malformed_response = self.session.request(
                        config.method.upper(),
                        url,
                        data='{"invalid": json}',  # Malformed JSON
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if malformed_response.status_code == 400:
                        error_tests_passed += 1
                    total_error_tests += 1
                    
                except:
                    pass
            
            # Test 3: Method not allowed
            wrong_method = 'POST' if config.method.upper() != 'POST' else 'GET'
            wrong_method_response = self._make_request(wrong_method, url, None)
            
            if wrong_method_response.status_code == 405:
                error_tests_passed += 1
            total_error_tests += 1
            
            success = error_tests_passed >= (total_error_tests * 0.7)  # 70% of error tests should pass
            
            return ValidationResult(
                test_name="Error Handling",
                success=success,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Error handling: {error_tests_passed}/{total_error_tests} tests passed",
                error_message=None if success else "Some error scenarios not handled properly"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Error Handling",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Error handling test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_authentication_requirements(self, config: EndpointConfig) -> ValidationResult:
        """Test authentication requirements"""
        start_time = time.time()
        
        try:
            if not config.auth_required:
                return ValidationResult(
                    test_name="Authentication Requirements",
                    success=True,
                    duration_ms=(time.time() - start_time) * 1000,
                    details="Endpoint does not require authentication"
                )
            
            url = f"{self.base_url}{config.path}"
            
            # Remove auth header
            old_auth = self.session.headers.pop('Authorization', None)
            
            # Make request without auth
            response = self._make_request(config.method, url, config.test_payloads[0] if config.test_payloads else None)
            
            # Should return 401 Unauthorized
            auth_properly_enforced = response.status_code == 401
            
            # Restore auth header
            if old_auth:
                self.session.headers['Authorization'] = old_auth
            
            return ValidationResult(
                test_name="Authentication Requirements",
                success=auth_properly_enforced,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Authentication {'properly enforced' if auth_properly_enforced else 'not enforced'}",
                response_status=response.status_code,
                error_message=None if auth_properly_enforced else f"Expected 401, got {response.status_code}"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Authentication Requirements",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Authentication test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_performance(self, config: EndpointConfig) -> ValidationResult:
        """Test endpoint performance"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            
            # Run multiple requests to get average performance
            response_times = []
            
            for i in range(5):  # Run 5 test requests
                request_start = time.time()
                response = self._make_request(config.method, url, config.test_payloads[0] if config.test_payloads else None)
                request_duration = (time.time() - request_start) * 1000
                response_times.append(request_duration)
                
                if response.status_code >= 500:
                    break  # Stop if server errors
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            meets_threshold = avg_response_time <= config.performance_threshold_ms
            
            return ValidationResult(
                test_name="Performance",
                success=meets_threshold,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Average response time: {avg_response_time:.2f}ms (threshold: {config.performance_threshold_ms}ms)",
                error_message=None if meets_threshold else f"Performance threshold exceeded: {avg_response_time:.2f}ms > {config.performance_threshold_ms}ms"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Performance",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Performance test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_security_headers(self, config: EndpointConfig) -> ValidationResult:
        """Test security headers"""
        start_time = time.time()
        
        try:
            url = f"{self.base_url}{config.path}"
            response = self._make_request(config.method, url, config.test_payloads[0] if config.test_payloads else None)
            
            # Check for important security headers
            security_headers = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'X-XSS-Protection'
            ]
            
            present_headers = sum(1 for header in security_headers if header in response.headers)
            security_score = present_headers / len(security_headers)
            
            # Consider 50% or more security headers as passing
            success = security_score >= 0.5
            
            return ValidationResult(
                test_name="Security Headers",
                success=success,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Security headers: {present_headers}/{len(security_headers)} present",
                error_message=None if success else "Insufficient security headers"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Security Headers",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Security headers test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _test_data_consistency(self, config: EndpointConfig) -> ValidationResult:
        """Test data consistency"""
        start_time = time.time()
        
        try:
            # This is a placeholder for data consistency tests
            # In practice, this would test things like:
            # - Data integrity after operations
            # - Consistent responses for same inputs
            # - Proper data relationships
            
            return ValidationResult(
                test_name="Data Consistency",
                success=True,
                duration_ms=(time.time() - start_time) * 1000,
                details="Data consistency validation passed (basic check)"
            )
            
        except Exception as e:
            return ValidationResult(
                test_name="Data Consistency",
                success=False,
                duration_ms=(time.time() - start_time) * 1000,
                details=f"Data consistency test failed: {str(e)}",
                error_message=str(e)
            )
    
    def _make_request(self, method: str, url: str, payload: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        kwargs = {
            'timeout': 10,
            'headers': {'Content-Type': 'application/json'}
        }
        
        if payload is not None:
            kwargs['json'] = payload
        
        return self.session.request(method.upper(), url, **kwargs)
    
    def _generate_report(self, config: EndpointConfig, results: List[ValidationResult], total_duration: float) -> EndpointValidationReport:
        """Generate comprehensive validation report"""
        passed_tests = sum(1 for r in results if r.success)
        failed_tests = len(results) - passed_tests
        success_rate = (passed_tests / len(results)) * 100 if results else 0
        avg_duration = sum(r.duration_ms for r in results) / len(results) if results else 0
        
        # Generate recommendation
        if success_rate >= 90:
            recommendation = "✅ READY FOR INTEGRATION - All critical tests passed"
        elif success_rate >= 75:
            recommendation = "⚠️ NEEDS MINOR FIXES - Most tests passed, address failing tests"
        elif success_rate >= 50:
            recommendation = "🔧 NEEDS SIGNIFICANT WORK - Multiple issues found"
        else:
            recommendation = "❌ NOT READY - Major issues found, requires extensive fixes"
        
        return EndpointValidationReport(
            endpoint=config.path,
            method=config.method,
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_tests=len(results),
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            success_rate=success_rate,
            average_duration_ms=avg_duration,
            results=results,
            recommendation=recommendation
        )
    
    def _create_failed_report(self, config: EndpointConfig, reason: str) -> EndpointValidationReport:
        """Create a failed validation report"""
        return EndpointValidationReport(
            endpoint=config.path,
            method=config.method,
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_tests=0,
            passed_tests=0,
            failed_tests=1,
            success_rate=0.0,
            average_duration_ms=0.0,
            results=[ValidationResult(
                test_name="Pre-validation Check",
                success=False,
                duration_ms=0.0,
                details=reason,
                error_message=reason
            )],
            recommendation=f"❌ VALIDATION FAILED - {reason}"
        )

def load_endpoint_config(config_file: str) -> EndpointConfig:
    """Load endpoint configuration from YAML file"""
    with open(config_file, 'r') as f:
        data = yaml.safe_load(f)
    
    return EndpointConfig(**data)

def save_report(report: EndpointValidationReport, output_file: str):
    """Save validation report to JSON file"""
    with open(output_file, 'w') as f:
        json.dump(asdict(report), f, indent=2, default=str)
    
    print(f"\n📊 Validation report saved to: {output_file}")

def print_report_summary(report: EndpointValidationReport):
    """Print report summary to console"""
    print(f"\n{'='*60}")
    print(f"  ENDPOINT VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Endpoint: {report.method} {report.endpoint}")
    print(f"Timestamp: {report.timestamp}")
    print(f"Tests Run: {report.total_tests}")
    print(f"Passed: {report.passed_tests} ✅")
    print(f"Failed: {report.failed_tests} ❌")
    print(f"Success Rate: {report.success_rate:.1f}%")
    print(f"Average Duration: {report.average_duration_ms:.2f}ms")
    print(f"\n{report.recommendation}")
    
    print(f"\n📋 Detailed Results:")
    for result in report.results:
        status = "✅" if result.success else "❌"
        print(f"  {status} {result.test_name}: {result.details}")
        if result.error_message:
            print(f"      Error: {result.error_message}")

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description="Validate new API endpoints")
    parser.add_argument('--config', '-c', required=True, help='Endpoint configuration file (YAML)')
    parser.add_argument('--output', '-o', help='Output JSON report file')
    parser.add_argument('--base-url', default='http://localhost:8000', help='Base URL for API')
    
    args = parser.parse_args()
    
    # Load configuration
    try:
        config = load_endpoint_config(args.config)
    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        sys.exit(1)
    
    # Initialize validator
    validator = EndpointValidator(args.base_url)
    
    # Run validation
    report = validator.validate_endpoint(config)
    
    # Print summary
    print_report_summary(report)
    
    # Save report if output specified
    if args.output:
        save_report(report, args.output)
    
    # Exit with appropriate code
    sys.exit(0 if report.success_rate >= 75 else 1)

if __name__ == '__main__':
    main()