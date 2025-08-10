#!/usr/bin/env python3
"""
Health Check API Endpoint Tests
Tests for system health monitoring endpoints

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

class HealthAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.test_results = []
        
    async def setup(self):
        """Setup test session"""
        self.session = aiohttp.ClientSession()
        
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
            
    async def test_basic_health_check(self):
        """Test GET /api/v1/health - Basic health check"""
        test_name = "Basic Health Check"
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/api/v1/health") as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "status" in data, "Missing 'status' in response"
                    assert "timestamp" in data, "Missing 'timestamp' in response"
                    assert "version" in data, "Missing 'version' in response"
                    assert "environment" in data, "Missing 'environment' in response"
                    assert "database" in data, "Missing 'database' in response"
                    
                    # Validate status values
                    assert data["status"] in ["healthy", "degraded", "unhealthy"], f"Invalid status: {data['status']}"
                    
                    # Validate database health
                    db_health = data["database"]
                    assert "status" in db_health, "Missing database status"
                    assert db_health["status"] in ["healthy", "unhealthy"], f"Invalid db status: {db_health['status']}"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"System status: {data['status']}, DB: {db_health['status']}"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED ({response_time:.2f}ms) - System: {data['status']}")
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
            
    async def test_detailed_health_check(self):
        """Test GET /api/v1/health/detailed - Detailed health check"""
        test_name = "Detailed Health Check"
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/api/v1/health/detailed") as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "status" in data, "Missing 'status' in response"
                    assert "timestamp" in data, "Missing 'timestamp' in response"
                    assert "system" in data, "Missing 'system' in response"
                    assert "services" in data, "Missing 'services' in response"
                    assert "config" in data, "Missing 'config' in response"
                    
                    # Validate system info
                    system_info = data["system"]
                    assert "platform" in system_info, "Missing system platform"
                    assert "host" in system_info, "Missing system host"
                    assert "port" in system_info, "Missing system port"
                    
                    # Validate services status
                    services = data["services"]
                    assert "database" in services, "Missing database service status"
                    assert "redis" in services, "Missing redis service status"
                    assert "api" in services, "Missing api service status"
                    
                    # Check service statuses
                    for service_name, service_data in services.items():
                        assert "status" in service_data, f"Missing status for {service_name}"
                        assert service_data["status"] in ["healthy", "unhealthy", "degraded"], f"Invalid status for {service_name}"
                    
                    # Validate config info
                    config = data["config"]
                    assert "debug" in config, "Missing debug config"
                    assert "database_type" in config, "Missing database_type config"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Overall: {data['status']}, Services: {len(services)} checked"
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
            
    async def test_readiness_probe(self):
        """Test GET /api/v1/health/readiness - Kubernetes readiness probe"""
        test_name = "Readiness Probe"
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/api/v1/health/readiness") as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status in [200, 503]:  # Either ready (200) or not ready (503)
                    data = await response.json()
                    
                    # Validate response structure
                    assert "status" in data, "Missing 'status' in response"
                    assert "timestamp" in data, "Missing 'timestamp' in response"
                    
                    if response.status == 200:
                        assert data["status"] == "ready", "Status should be 'ready' for 200 response"
                        details = "Service is ready"
                    else:
                        assert data["status"] == "not_ready", "Status should be 'not_ready' for 503 response"
                        details = "Service is not ready"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": details
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED ({response_time:.2f}ms) - {details}")
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
            
    async def test_liveness_probe(self):
        """Test GET /api/v1/health/liveness - Kubernetes liveness probe"""
        test_name = "Liveness Probe"
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/api/v1/health/liveness") as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "status" in data, "Missing 'status' in response"
                    assert "timestamp" in data, "Missing 'timestamp' in response"
                    assert data["status"] == "alive", "Status should be 'alive'"
                    
                    # Optional uptime field
                    if "uptime_seconds" in data:
                        assert isinstance(data["uptime_seconds"], (int, float)), "Uptime should be numeric"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": "Service is alive"
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
            
    async def test_health_response_times(self):
        """Test health endpoints response times under load"""
        test_name = "Health Response Time Load Test"
        start_time = time.time()
        
        try:
            # Test multiple concurrent requests
            tasks = []
            for _ in range(10):
                tasks.append(self.session.get(f"{self.base_url}/api/v1/health"))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = time.time()
            total_time = (end_time - start_time) * 1000
            
            # Analyze responses
            successful_responses = 0
            response_times = []
            
            for response in responses:
                if isinstance(response, aiohttp.ClientResponse):
                    if response.status == 200:
                        successful_responses += 1
                    response.close()
            
            success_rate = (successful_responses / len(tasks)) * 100
            avg_response_time = total_time / len(tasks)
            
            if success_rate >= 90:  # At least 90% success rate
                self.test_results.append({
                    "test_name": test_name,
                    "status": "PASSED",
                    "response_time_ms": round(avg_response_time, 2),
                    "details": f"Success rate: {success_rate:.1f}%, Avg time: {avg_response_time:.2f}ms"
                })
                
                logger.info(f"✅ {test_name} - PASSED (Success rate: {success_rate:.1f}%)")
                return True
            else:
                self.test_results.append({
                    "test_name": test_name,
                    "status": "FAILED",
                    "response_time_ms": round(avg_response_time, 2),
                    "error": f"Low success rate: {success_rate:.1f}%"
                })
                
                logger.error(f"❌ {test_name} - FAILED (Success rate: {success_rate:.1f}%)")
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
        """Run all health API tests"""
        logger.info("🚀 Starting Health API Tests")
        logger.info("=" * 50)
        
        await self.setup()
        
        tests = [
            self.test_basic_health_check,
            self.test_detailed_health_check,
            self.test_readiness_probe,
            self.test_liveness_probe,
            self.test_health_response_times,
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
            "test_suite": "Health API Tests",
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
        with open('health_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 50)
        logger.info("📊 HEALTH API TEST SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        logger.info(f"⏱️  Average Response Time: {avg_response_time:.2f}ms")
        logger.info(f"📋 Report saved: health_test_report.json")
        
        return success_rate == 100.0

async def main():
    """Main test execution"""
    tester = HealthAPITester()
    success = await tester.run_all_tests()
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())