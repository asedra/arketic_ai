#!/usr/bin/env python3
"""
Compliance API Endpoint Tests
Tests for compliance management endpoints

Author: Claude
Created: 2025-08-10 (AR-82 Implementation)
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import aiohttp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComplianceAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.auth_token = None
        self.test_results = []
        
    async def setup(self):
        """Setup test session and authentication"""
        self.session = aiohttp.ClientSession()
        
        # Authenticate to get token
        auth_data = {
            "email": "test@arketic.com",
            "password": "testpassword123"
        }
        
        try:
            async with self.session.post(f"{self.base_url}/api/v1/auth/login", json=auth_data) as response:
                if response.status == 200:
                    result = await response.json()
                    self.auth_token = result.get("access_token")
                    logger.info("✅ Authentication successful")
                else:
                    logger.error(f"❌ Authentication failed: {response.status}")
                    raise Exception("Authentication failed")
        except Exception as e:
            logger.error(f"❌ Auth setup failed: {e}")
            raise
            
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
            
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
        
    async def test_get_compliance_data(self):
        """Test GET /api/v1/compliance/ - Get compliance overview"""
        test_name = "Get Compliance Data"
        start_time = time.time()
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/v1/compliance/",
                headers=self.get_headers()
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "overview" in data, "Missing 'overview' in response"
                    assert "frameworks" in data, "Missing 'frameworks' in response"
                    
                    overview = data["overview"]
                    assert "total_frameworks" in overview, "Missing 'total_frameworks'"
                    assert "compliance_score" in overview, "Missing 'compliance_score'"
                    assert "last_audit" in overview, "Missing 'last_audit'"
                    assert "next_audit" in overview, "Missing 'next_audit'"
                    
                    frameworks = data["frameworks"]
                    assert isinstance(frameworks, list), "Frameworks should be a list"
                    
                    if frameworks:
                        framework = frameworks[0]
                        assert "id" in framework, "Framework missing 'id'"
                        assert "name" in framework, "Framework missing 'name'"
                        assert "status" in framework, "Framework missing 'status'"
                        assert "score" in framework, "Framework missing 'score'"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Retrieved {len(frameworks)} frameworks"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED ({response_time:.2f}ms)")
                    return True
                    
                else:
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "FAILED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "error": f"Unexpected status code: {response.status}"
                    })
                    
                    logger.error(f"❌ {test_name} - FAILED (Status: {response.status})")
                    return False
                    
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            self.test_results.append({
                "test_name": test_name,
                "status": "ERROR",
                "response_time_ms": round(response_time, 2),
                "error": str(e)
            })
            
            logger.error(f"❌ {test_name} - ERROR: {e}")
            return False
            
    async def test_get_compliance_frameworks(self):
        """Test GET /api/v1/compliance/frameworks - Get compliance frameworks"""
        test_name = "Get Compliance Frameworks"
        start_time = time.time()
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/v1/compliance/frameworks",
                headers=self.get_headers()
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert isinstance(data, list), "Response should be a list"
                    
                    if data:
                        framework = data[0]
                        assert "id" in framework, "Framework missing 'id'"
                        assert "name" in framework, "Framework missing 'name'"
                        assert "description" in framework, "Framework missing 'description'"
                        assert "status" in framework, "Framework missing 'status'"
                        assert "score" in framework, "Framework missing 'score'"
                        assert "requirements" in framework, "Framework missing 'requirements'"
                        
                        requirements = framework["requirements"]
                        assert isinstance(requirements, list), "Requirements should be a list"
                        
                        if requirements:
                            req = requirements[0]
                            assert "id" in req, "Requirement missing 'id'"
                            assert "title" in req, "Requirement missing 'title'"
                            assert "status" in req, "Requirement missing 'status'"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Retrieved {len(data)} frameworks with detailed requirements"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED ({response_time:.2f}ms)")
                    return True
                    
                else:
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "FAILED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "error": f"Unexpected status code: {response.status}"
                    })
                    
                    logger.error(f"❌ {test_name} - FAILED (Status: {response.status})")
                    return False
                    
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            self.test_results.append({
                "test_name": test_name,
                "status": "ERROR",
                "response_time_ms": round(response_time, 2),
                "error": str(e)
            })
            
            logger.error(f"❌ {test_name} - ERROR: {e}")
            return False
            
    async def test_compliance_endpoints_unauthorized(self):
        """Test compliance endpoints without authentication"""
        test_name = "Unauthorized Access Test"
        start_time = time.time()
        
        try:
            # Test without Authorization header
            async with self.session.get(
                f"{self.base_url}/api/v1/compliance/",
                headers={"Content-Type": "application/json"}
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 401:
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": "Correctly rejected unauthorized access"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED (Correctly returned 401)")
                    return True
                    
                else:
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "FAILED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "error": f"Should return 401 for unauthorized access, got {response.status}"
                    })
                    
                    logger.error(f"❌ {test_name} - FAILED (Should be 401, got {response.status})")
                    return False
                    
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            self.test_results.append({
                "test_name": test_name,
                "status": "ERROR",
                "response_time_ms": round(response_time, 2),
                "error": str(e)
            })
            
            logger.error(f"❌ {test_name} - ERROR: {e}")
            return False
            
    async def run_all_tests(self):
        """Run all compliance API tests"""
        logger.info("🚀 Starting Compliance API Tests")
        logger.info("=" * 50)
        
        await self.setup()
        
        tests = [
            self.test_get_compliance_data,
            self.test_get_compliance_frameworks,
            self.test_compliance_endpoints_unauthorized,
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                success = await test()
                if success:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Test execution error: {e}")
                failed += 1
                
            # Small delay between tests
            await asyncio.sleep(0.1)
        
        await self.teardown()
        
        # Generate test report
        total_tests = passed + failed
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        avg_response_time = sum([r.get('response_time_ms', 0) for r in self.test_results]) / len(self.test_results) if self.test_results else 0
        
        report = {
            "test_suite": "Compliance API Tests",
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed,
                "failed": failed,
                "success_rate": round(success_rate, 2),
                "avg_response_time_ms": round(avg_response_time, 2)
            },
            "test_results": self.test_results
        }
        
        # Save report
        with open('compliance_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 50)
        logger.info("📊 COMPLIANCE API TEST SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        logger.info(f"⏱️  Average Response Time: {avg_response_time:.2f}ms")
        logger.info(f"📋 Report saved: compliance_test_report.json")
        
        return success_rate == 100.0

async def main():
    """Main test execution"""
    tester = ComplianceAPITester()
    success = await tester.run_all_tests()
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())