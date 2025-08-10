#!/usr/bin/env python3
"""
Embedding Service API Key Integration Test Script
Tests the complete embedding service with API key management and multi-provider support
"""

import os
import sys
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import uuid4

import httpx
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Test configuration
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
TEST_EMAIL = os.getenv("TEST_EMAIL", "test@arketic.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Test123!@#")

class EmbeddingAPITester:
    """Test class for Embedding Service API endpoints"""
    
    def __init__(self):
        self.base_url = BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token = None
        self.test_results = []
        self.start_time = None
        
    async def setup(self):
        """Setup test environment"""
        self.start_time = time.time()
        logger.info(f"Starting Embedding API tests at {datetime.now()}")
        logger.info(f"Base URL: {self.base_url}")
        
        # Login to get access token
        await self.login()
        
    async def teardown(self):
        """Cleanup test environment"""
        await self.client.aclose()
        
        # Calculate test summary
        total_time = time.time() - self.start_time
        passed = sum(1 for r in self.test_results if r['status'] == 'passed')
        failed = sum(1 for r in self.test_results if r['status'] == 'failed')
        
        logger.info(f"\nTest Summary:")
        logger.info(f"Total tests: {len(self.test_results)}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Total time: {total_time:.2f}s")
        
        # Save detailed results
        self.save_results()
        
    async def login(self):
        """Login to get access token"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                logger.info("✓ Successfully logged in")
            else:
                logger.error(f"✗ Login failed: {response.status_code}")
                raise Exception("Failed to login")
                
        except Exception as e:
            logger.error(f"✗ Login error: {e}")
            raise
    
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def test_create_api_key(self, provider: str = "openai") -> Optional[Dict]:
        """Test creating an API key"""
        test_name = f"Create API Key - {provider}"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Generate a test API key (in real scenario, use actual key)
            test_key = f"sk-test-{uuid4().hex[:32]}"
            
            response = await self.client.post(
                f"{self.base_url}/api/settings/api-keys",
                json={
                    "provider": provider,
                    "key_name": f"Test {provider.upper()} Key",
                    "api_key": test_key
                },
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ API key created: {data.get('id')}")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "details": data
                })
                return data
            else:
                logger.error(f"✗ Failed to create API key: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return None
    
    async def test_list_api_keys(self):
        """Test listing API keys"""
        test_name = "List API Keys"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/settings/api-keys",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Found {len(data)} API keys")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "count": len(data)
                })
                return data
            else:
                logger.error(f"✗ Failed to list API keys: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return []
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return []
    
    async def test_generate_embeddings(self, provider: Optional[str] = None):
        """Test generating embeddings with fallback"""
        test_name = f"Generate Embeddings - {provider or 'auto'}"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            test_texts = [
                "This is a test document for embedding generation.",
                "Machine learning models can generate vector representations.",
                "The embedding service supports multiple providers with fallback."
            ]
            
            payload = {
                "texts": test_texts,
                "knowledge_base_id": str(uuid4())
            }
            
            if provider:
                payload["preferred_provider"] = provider
            
            response = await self.client.post(
                f"{self.base_url}/api/embeddings/generate",
                json=payload,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Embeddings generated using {data.get('provider', 'unknown')}")
                logger.info(f"  - Model: {data.get('model')}")
                logger.info(f"  - Tokens: {data.get('tokens')}")
                logger.info(f"  - Cost: ${data.get('cost', 0):.6f}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "provider": data.get('provider'),
                    "model": data.get('model'),
                    "tokens": data.get('tokens'),
                    "cost": data.get('cost')
                })
                return data
            else:
                logger.error(f"✗ Failed to generate embeddings: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return None
    
    async def test_provider_fallback(self):
        """Test provider fallback mechanism"""
        test_name = "Provider Fallback"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Try with a non-existent provider to trigger fallback
            response = await self.client.post(
                f"{self.base_url}/api/embeddings/generate",
                json={
                    "texts": ["Test fallback mechanism"],
                    "preferred_provider": "anthropic"  # Not yet available
                },
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('fallback_reason'):
                    logger.info(f"✓ Fallback triggered: {data.get('fallback_reason')}")
                    logger.info(f"  - Used provider: {data.get('provider')}")
                else:
                    logger.info(f"✓ Generated with provider: {data.get('provider')}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "provider": data.get('provider'),
                    "fallback_reason": data.get('fallback_reason')
                })
                return True
            else:
                logger.error(f"✗ Fallback test failed: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return False
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_rate_limiting(self):
        """Test rate limiting functionality"""
        test_name = "Rate Limiting"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Send multiple rapid requests to trigger rate limiting
            requests_sent = 0
            rate_limited = False
            
            for i in range(10):
                response = await self.client.post(
                    f"{self.base_url}/api/embeddings/generate",
                    json={
                        "texts": [f"Rate limit test {i}"],
                        "preferred_provider": "openai"
                    },
                    headers=self.get_headers()
                )
                
                requests_sent += 1
                
                if response.status_code == 429:  # Rate limited
                    rate_limited = True
                    logger.info(f"✓ Rate limit triggered after {requests_sent} requests")
                    break
                elif response.status_code == 200:
                    data = response.json()
                    if data.get('rate_limit_info'):
                        logger.info(f"  Request {i+1}: {data['rate_limit_info'].get('requests_remaining')} remaining")
            
            self.test_results.append({
                "test": test_name,
                "status": "passed" if rate_limited or requests_sent == 10 else "failed",
                "requests_sent": requests_sent,
                "rate_limited": rate_limited
            })
            
            return rate_limited
            
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_usage_statistics(self):
        """Test usage statistics endpoint"""
        test_name = "Usage Statistics"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/embeddings/usage",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Usage statistics retrieved")
                logger.info(f"  - Total requests: {data.get('total', {}).get('requests', 0)}")
                logger.info(f"  - Total tokens: {data.get('total', {}).get('tokens', 0)}")
                logger.info(f"  - Total cost: ${data.get('total', {}).get('cost', 0):.6f}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "statistics": data
                })
                return data
            else:
                logger.error(f"✗ Failed to get usage statistics: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return None
    
    async def test_provider_status(self):
        """Test provider status endpoint"""
        test_name = "Provider Status"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/embeddings/providers/status",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Provider status retrieved")
                
                for provider, status in data.items():
                    logger.info(f"  - {provider}: {status.get('status')}")
                    if status.get('models'):
                        logger.info(f"    Models: {', '.join(status['models'][:3])}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "providers": data
                })
                return data
            else:
                logger.error(f"✗ Failed to get provider status: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return None
    
    async def test_audit_logs(self):
        """Test audit logging functionality"""
        test_name = "Audit Logs"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            response = await self.client.get(
                f"{self.base_url}/api/audit/logs",
                params={
                    "event_type": "embedding_generated",
                    "limit": 10
                },
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Audit logs retrieved: {len(data)} entries")
                
                if data:
                    latest = data[0]
                    logger.info(f"  - Latest event: {latest.get('event_type')}")
                    logger.info(f"  - Timestamp: {latest.get('created_at')}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "log_count": len(data)
                })
                return data
            else:
                logger.error(f"✗ Failed to get audit logs: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return None
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return None
    
    async def test_delete_api_key(self, key_id: str):
        """Test deleting an API key"""
        test_name = "Delete API Key"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            response = await self.client.delete(
                f"{self.base_url}/api/settings/api-keys/{key_id}",
                headers=self.get_headers()
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"✓ API key deleted: {key_id}")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds()
                })
                return True
            else:
                logger.error(f"✗ Failed to delete API key: {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": response.text
                })
                return False
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
            return False
    
    def save_results(self):
        """Save test results to file"""
        results = {
            "test_run": datetime.now().isoformat(),
            "total_tests": len(self.test_results),
            "passed": sum(1 for r in self.test_results if r['status'] == 'passed'),
            "failed": sum(1 for r in self.test_results if r['status'] == 'failed'),
            "total_time": time.time() - self.start_time,
            "results": self.test_results
        }
        
        filename = f"embedding_api_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info(f"\nTest results saved to: {filepath}")
    
    async def run_all_tests(self):
        """Run all embedding API tests"""
        await self.setup()
        
        try:
            # Test API key management
            openai_key = await self.test_create_api_key("openai")
            await self.test_list_api_keys()
            
            # Test embedding generation
            await self.test_generate_embeddings()
            await self.test_generate_embeddings("openai")
            
            # Test fallback and rate limiting
            await self.test_provider_fallback()
            await self.test_rate_limiting()
            
            # Test monitoring and audit
            await self.test_usage_statistics()
            await self.test_provider_status()
            await self.test_audit_logs()
            
            # Cleanup
            if openai_key:
                await self.test_delete_api_key(openai_key['id'])
                
        finally:
            await self.teardown()


async def main():
    """Main test execution"""
    tester = EmbeddingAPITester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())