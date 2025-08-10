#!/usr/bin/env python3
"""
Forms API Endpoint Tests
Tests for adaptive cards forms management endpoints

Author: Claude
Created: 2025-08-10 (AR-82 Implementation)
"""

import asyncio
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any
import aiohttp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FormsAPITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.auth_token = None
        self.test_results = []
        self.test_form_ids = []  # Track created forms for cleanup
        
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
        """Cleanup test session and test data"""
        # Clean up test forms
        for form_id in self.test_form_ids:
            try:
                await self.session.delete(
                    f"{self.base_url}/api/v1/forms/{form_id}",
                    headers=self.get_headers()
                )
            except:
                pass  # Ignore cleanup errors
                
        if self.session:
            await self.session.close()
            
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
        
    def get_test_form_data(self):
        """Get test form data"""
        return {
            "title": f"Test Form {uuid.uuid4().hex[:8]}",
            "description": "This is a test form created by automated tests",
            "adaptive_card_json": {
                "type": "AdaptiveCard",
                "version": "1.5",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": "Test Form",
                        "weight": "bolder",
                        "size": "medium"
                    },
                    {
                        "type": "Input.Text",
                        "id": "name",
                        "label": "Name",
                        "placeholder": "Enter your name"
                    },
                    {
                        "type": "Input.Text",
                        "id": "email",
                        "label": "Email",
                        "placeholder": "Enter your email",
                        "style": "email"
                    }
                ],
                "actions": [
                    {
                        "type": "Action.Submit",
                        "title": "Submit"
                    }
                ]
            },
            "elements_json": [
                {
                    "id": "name",
                    "type": "text",
                    "required": True,
                    "validation": {
                        "minLength": 2,
                        "maxLength": 50
                    }
                },
                {
                    "id": "email",
                    "type": "email",
                    "required": True,
                    "validation": {
                        "pattern": "email"
                    }
                }
            ],
            "visibility": "private",
            "allow_anonymous": False,
            "submit_message": "Thank you for your submission!",
            "tags": ["test", "automated"],
            "category": "testing"
        }
        
    async def test_create_form(self):
        """Test POST /api/v1/forms - Create a new form"""
        test_name = "Create Form"
        start_time = time.time()
        
        try:
            form_data = self.get_test_form_data()
            
            async with self.session.post(
                f"{self.base_url}/api/v1/forms",
                headers=self.get_headers(),
                json=form_data
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "id" in data, "Missing 'id' in response"
                    assert "title" in data, "Missing 'title' in response"
                    assert "description" in data, "Missing 'description' in response"
                    assert "status" in data, "Missing 'status' in response"
                    assert "version" in data, "Missing 'version' in response"
                    assert "created_at" in data, "Missing 'created_at' in response"
                    
                    # Track for cleanup
                    form_id = data["id"]
                    self.test_form_ids.append(form_id)
                    
                    # Validate data
                    assert data["title"] == form_data["title"], "Title mismatch"
                    assert data["description"] == form_data["description"], "Description mismatch"
                    assert data["visibility"] == form_data["visibility"], "Visibility mismatch"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Form created with ID: {form_id}"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED ({response_time:.2f}ms)")
                    return True, form_id
                    
                else:
                    error_text = await response.text()
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "FAILED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "error": f"Unexpected status code: {response.status}, {error_text}"
                    })
                    
                    logger.error(f"❌ {test_name} - FAILED (Status: {response.status})")
                    return False, None
                    
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
            return False, None
            
    async def test_list_forms(self):
        """Test GET /api/v1/forms - List forms"""
        test_name = "List Forms"
        start_time = time.time()
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/v1/forms",
                headers=self.get_headers()
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "items" in data, "Missing 'items' in response"
                    assert "total" in data, "Missing 'total' in response"
                    assert "page" in data, "Missing 'page' in response"
                    assert "size" in data, "Missing 'size' in response"
                    assert "pages" in data, "Missing 'pages' in response"
                    
                    items = data["items"]
                    assert isinstance(items, list), "Items should be a list"
                    
                    if items:
                        form = items[0]
                        assert "id" in form, "Form missing 'id'"
                        assert "title" in form, "Form missing 'title'"
                        assert "status" in form, "Form missing 'status'"
                        assert "created_at" in form, "Form missing 'created_at'"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Retrieved {len(items)} forms (total: {data['total']})"
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
            
    async def test_get_form(self, form_id: str):
        """Test GET /api/v1/forms/{form_id} - Get specific form"""
        test_name = "Get Form"
        start_time = time.time()
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/v1/forms/{form_id}",
                headers=self.get_headers()
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "id" in data, "Missing 'id' in response"
                    assert "title" in data, "Missing 'title' in response"
                    assert "adaptive_card_json" in data, "Missing 'adaptive_card_json' in response"
                    assert "elements_json" in data, "Missing 'elements_json' in response"
                    assert data["id"] == form_id, "Form ID mismatch"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Retrieved form: {data['title']}"
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
            
    async def test_update_form(self, form_id: str):
        """Test PUT /api/v1/forms/{form_id} - Update form"""
        test_name = "Update Form"
        start_time = time.time()
        
        try:
            update_data = {
                "title": f"Updated Test Form {uuid.uuid4().hex[:8]}",
                "description": "This form has been updated by automated tests"
            }
            
            async with self.session.put(
                f"{self.base_url}/api/v1/forms/{form_id}",
                headers=self.get_headers(),
                json=update_data
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate updates
                    assert data["title"] == update_data["title"], "Title not updated"
                    assert data["description"] == update_data["description"], "Description not updated"
                    assert data["version"] > 1, "Version should be incremented"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Form updated successfully, version: {data['version']}"
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
            
    async def test_form_templates(self):
        """Test form templates endpoints"""
        test_name = "Form Templates"
        start_time = time.time()
        
        try:
            # Test list templates
            async with self.session.get(
                f"{self.base_url}/api/v1/forms/templates",
                headers=self.get_headers()
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    assert "items" in data, "Missing 'items' in templates response"
                    assert "total" in data, "Missing 'total' in templates response"
                    
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": f"Retrieved {data['total']} form templates"
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
            
    async def test_form_validation(self):
        """Test form validation with invalid data"""
        test_name = "Form Validation"
        start_time = time.time()
        
        try:
            # Test with missing required fields
            invalid_form_data = {
                "description": "Form without title"
                # Missing required title field
            }
            
            async with self.session.post(
                f"{self.base_url}/api/v1/forms",
                headers=self.get_headers(),
                json=invalid_form_data
            ) as response:
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                if response.status == 422:  # Validation error
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "PASSED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "details": "Correctly rejected invalid form data"
                    })
                    
                    logger.info(f"✅ {test_name} - PASSED (Validation working)")
                    return True
                    
                else:
                    self.test_results.append({
                        "test_name": test_name,
                        "status": "FAILED",
                        "response_time_ms": round(response_time, 2),
                        "status_code": response.status,
                        "error": f"Should return 422 for invalid data, got {response.status}"
                    })
                    
                    logger.error(f"❌ {test_name} - FAILED (Expected 422, got {response.status})")
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
        """Run all forms API tests"""
        logger.info("🚀 Starting Forms API Tests")
        logger.info("=" * 50)
        
        await self.setup()
        
        passed = 0
        failed = 0
        
        # Test create form first
        success, form_id = await self.test_create_form()
        if success:
            passed += 1
        else:
            failed += 1
        
        # Run other tests
        tests = [
            self.test_list_forms,
            self.test_form_templates,
            self.test_form_validation,
        ]
        
        # If we have a form, test form-specific operations
        if form_id:
            tests.extend([
                lambda: self.test_get_form(form_id),
                lambda: self.test_update_form(form_id),
            ])
        
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
            "test_suite": "Forms API Tests",
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
        with open('forms_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 50)
        logger.info("📊 FORMS API TEST SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        logger.info(f"⏱️  Average Response Time: {avg_response_time:.2f}ms")
        logger.info(f"📋 Report saved: forms_test_report.json")
        
        return success_rate == 100.0

async def main():
    """Main test execution"""
    tester = FormsAPITester()
    success = await tester.run_all_tests()
    exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())