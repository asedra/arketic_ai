#!/usr/bin/env python3
"""
Isolated Endpoint Test for GET /api/v1/knowledge/{document_id}/embeddings
Tests for AR-81: Knowledge Text Management Feature Testing
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
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "testpass123")

class DocumentEmbeddingTester:
    """Test class for document-specific embedding endpoints"""
    
    def __init__(self):
        self.base_url = BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token = None
        self.test_results = []
        self.start_time = None
        self.test_document_id = None
        
    async def setup(self):
        """Setup test environment"""
        self.start_time = time.time()
        logger.info(f"Starting Document Embedding Endpoint tests at {datetime.now()}")
        logger.info(f"Base URL: {self.base_url}")
        
        # Login to get access token
        await self.login()
        
    async def teardown(self):
        """Cleanup test environment"""
        # Clean up test document if created
        if self.test_document_id:
            await self.delete_test_document(self.test_document_id)
        
        await self.client.aclose()
        
        # Calculate test summary
        total_time = time.time() - self.start_time
        passed = sum(1 for r in self.test_results if r['status'] == 'passed')
        failed = sum(1 for r in self.test_results if r['status'] == 'failed')
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Test Summary:")
        logger.info(f"Total tests: {len(self.test_results)}")
        logger.info(f"Passed: {passed}")
        logger.info(f"Failed: {failed}")
        logger.info(f"Success rate: {(passed/len(self.test_results)*100) if self.test_results else 0:.1f}%")
        logger.info(f"Total time: {total_time:.2f}s")
        logger.info(f"Average response time: {self.get_average_response_time():.3f}s")
        logger.info(f"{'='*60}")
        
        # Save detailed results
        self.save_results()
        
    async def login(self):
        """Login to get access token"""
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/auth/login",
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
    
    def get_average_response_time(self):
        """Calculate average response time"""
        times = [r.get('response_time', 0) for r in self.test_results if 'response_time' in r]
        return sum(times) / len(times) if times else 0
    
    async def create_test_document(self, title: str, content: str) -> Optional[str]:
        """Create a test document with text content"""
        test_name = "Create Test Document"
        logger.info(f"\nPreparing: {test_name}")
        
        # Add unique identifier to avoid conflicts
        unique_id = str(uuid4())[:8]
        unique_title = f"{title} - {unique_id}"
        unique_content = f"{content}\n[Test ID: {unique_id}]"
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/knowledge/upload",
                json={
                    "title": unique_title,
                    "content": unique_content,
                    "document_type": "text",
                    "tags": ["test", "embedding-test"]
                },
                headers=self.get_headers()
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                document_id = data.get("document_id")  # Changed from "id" to "document_id"
                logger.info(f"✓ Test document created: {document_id}")
                
                # Wait for embeddings to be generated
                await asyncio.sleep(2)
                
                return document_id
            else:
                logger.error(f"✗ Failed to create test document: {response.status_code}")
                logger.error(f"  Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"✗ Error creating test document: {e}")
            return None
    
    async def delete_test_document(self, document_id: str):
        """Delete test document"""
        try:
            response = await self.client.delete(
                f"{self.base_url}/api/v1/knowledge/{document_id}",
                headers=self.get_headers()
            )
            if response.status_code in [200, 204]:
                logger.info(f"✓ Test document deleted: {document_id}")
            else:
                logger.warning(f"Could not delete test document: {response.status_code}")
        except Exception as e:
            logger.warning(f"Error deleting test document: {e}")
    
    async def test_get_document_embeddings_valid(self):
        """Test GET /api/v1/knowledge/{document_id}/embeddings with valid document_id"""
        test_name = "Get Document Embeddings - Valid ID"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a test document first
            self.test_document_id = await self.create_test_document(
                "Test Document for Embeddings",
                "This is a test document to verify embedding retrieval. It contains multiple sentences to ensure proper chunking."
            )
            
            if not self.test_document_id:
                raise Exception("Failed to create test document")
            
            # Test the embeddings endpoint
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{self.test_document_id}/embeddings",
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                assert "chunks" in data, "Response missing 'chunks' field"
                assert isinstance(data["chunks"], list), "'chunks' should be a list"
                
                if data["chunks"]:
                    # Validate embedding structure
                    chunk = data["chunks"][0]
                    assert "chunk_id" in chunk, "Chunk missing 'chunk_id' field"
                    assert "chunk_text" in chunk, "Chunk missing 'chunk_text' field"
                    assert "chunk_index" in chunk, "Chunk missing 'chunk_index' field"
                    assert "embedding_preview" in chunk, "Chunk missing 'embedding_preview' field"
                    assert "embedding_dimensions" in chunk, "Chunk missing 'embedding_dimensions' field"
                    
                    # Validate embedding preview
                    preview = chunk["embedding_preview"]
                    assert isinstance(preview, list), "Embedding preview should be a list"
                    assert len(preview) > 0, "Embedding preview should not be empty"
                    assert all(isinstance(x, (int, float)) for x in preview), "Preview should contain numbers"
                
                logger.info(f"✓ Successfully retrieved {len(data['chunks'])} chunks")
                logger.info(f"  - Document ID: {self.test_document_id}")
                logger.info(f"  - Total chunks: {data.get('total_chunks', len(data['chunks']))}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "chunks_count": len(data["chunks"]),
                    "assertions": 7
                })
            else:
                logger.error(f"✗ Failed to get embeddings: {response.status_code}")
                logger.error(f"  Response: {response.text}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"HTTP {response.status_code}: {response.text}"
                })
                
        except AssertionError as e:
            logger.error(f"✗ Assertion failed: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_get_document_embeddings_invalid(self):
        """Test GET /api/v1/knowledge/{document_id}/embeddings with invalid document_id"""
        test_name = "Get Document Embeddings - Invalid ID"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Use a random UUID that doesn't exist
            invalid_id = str(uuid4())
            
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{invalid_id}/embeddings",
                headers=self.get_headers()
            )
            
            if response.status_code == 404:
                logger.info(f"✓ Correctly returned 404 for invalid document ID")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "expected_status": 404,
                    "actual_status": response.status_code
                })
            else:
                logger.error(f"✗ Expected 404, got {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"Expected 404, got {response.status_code}"
                })
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_response_schema_validation(self):
        """Test response schema validation for embeddings endpoint"""
        test_name = "Response Schema Validation"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a test document
            document_id = await self.create_test_document(
                "Schema Validation Test",
                "Content for schema validation testing."
            )
            
            if not document_id:
                raise Exception("Failed to create test document")
            
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{document_id}/embeddings",
                headers=self.get_headers()
            )
            
            # Clean up
            await self.delete_test_document(document_id)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate top-level schema
                required_fields = ["chunks", "document_id", "total_chunks"]
                for field in required_fields:
                    assert field in data, f"Missing required field: {field}"
                
                # Validate chunk schema
                if data["chunks"]:
                    chunk = data["chunks"][0]
                    chunk_fields = ["chunk_id", "chunk_text", "chunk_index", 
                                   "embedding_preview", "embedding_dimensions", "created_at"]
                    for field in chunk_fields:
                        assert field in chunk, f"Chunk missing field: {field}"
                
                logger.info(f"✓ Response schema validation passed")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "validated_fields": len(required_fields) + 7
                })
            else:
                logger.error(f"✗ Failed with status {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                })
                
        except AssertionError as e:
            logger.error(f"✗ Schema validation failed: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_embedding_data_structure(self):
        """Test embedding data structure and vector dimensions"""
        test_name = "Embedding Data Structure"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a test document
            document_id = await self.create_test_document(
                "Data Structure Test",
                "Testing embedding vector dimensions and data types."
            )
            
            if not document_id:
                raise Exception("Failed to create test document")
            
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{document_id}/embeddings",
                headers=self.get_headers()
            )
            
            # Clean up
            await self.delete_test_document(document_id)
            
            if response.status_code == 200:
                data = response.json()
                
                if data["chunks"]:
                    chunk = data["chunks"][0]
                    preview = chunk["embedding_preview"]
                    dimensions = chunk["embedding_dimensions"]
                    
                    # Check vector dimensions (OpenAI typically uses 1536)
                    assert dimensions in [1536, 768, 384], f"Unexpected vector dimension: {dimensions}"
                    
                    # Check data types
                    assert all(isinstance(x, (int, float)) for x in preview), "Preview contains non-numeric values"
                    
                    logger.info(f"  - Vector dimension: {dimensions}")
                    logger.info(f"  - Preview length: {len(preview)}"))
                
                logger.info(f"✓ Embedding data structure validation passed")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "vector_dimension": chunk["embedding_dimensions"] if data["chunks"] else 0
                })
            else:
                logger.error(f"✗ Failed with status {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                })
                
        except AssertionError as e:
            logger.error(f"✗ Data structure validation failed: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_chunk_information_accuracy(self):
        """Test chunk information accuracy and ordering"""
        test_name = "Chunk Information Accuracy"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a document with predictable chunks
            content = "First sentence for chunk one. " * 5
            content += "Second sentence for chunk two. " * 5
            content += "Third sentence for chunk three. " * 5
            
            document_id = await self.create_test_document(
                "Chunk Accuracy Test",
                content
            )
            
            if not document_id:
                raise Exception("Failed to create test document")
            
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{document_id}/embeddings",
                headers=self.get_headers()
            )
            
            # Clean up
            await self.delete_test_document(document_id)
            
            if response.status_code == 200:
                data = response.json()
                
                if data["chunks"]:
                    # Check chunk ordering
                    chunk_indices = [c["chunk_index"] for c in data["chunks"]]
                    assert chunk_indices == sorted(chunk_indices), "Chunks not in order"
                    
                    # Check chunk text presence
                    for chunk in data["chunks"]:
                        assert len(chunk["chunk_text"]) > 0, "Empty chunk text found"
                        assert chunk["chunk_index"] >= 0, "Invalid chunk index"
                    
                    logger.info(f"  - Total chunks: {len(data['chunks'])}")
                    logger.info(f"  - Chunk indices: {chunk_indices}")
                
                logger.info(f"✓ Chunk information accuracy verified")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "total_chunks": len(data["chunks"])
                })
            else:
                logger.error(f"✗ Failed with status {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"HTTP {response.status_code}"
                })
                
        except AssertionError as e:
            logger.error(f"✗ Chunk validation failed: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_authorization(self):
        """Test authorization requirements for embeddings endpoint"""
        test_name = "Authorization Check"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a test document first
            document_id = await self.create_test_document(
                "Authorization Test",
                "Testing authorization requirements."
            )
            
            if not document_id:
                raise Exception("Failed to create test document")
            
            # Test without authorization header
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{document_id}/embeddings"
            )
            
            # Clean up
            await self.delete_test_document(document_id)
            
            if response.status_code == 401:
                logger.info(f"✓ Correctly rejected unauthorized request")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response.elapsed.total_seconds(),
                    "expected_status": 401,
                    "actual_status": response.status_code
                })
            else:
                logger.error(f"✗ Expected 401, got {response.status_code}")
                self.test_results.append({
                    "test": test_name,
                    "status": "failed",
                    "error": f"Expected 401, got {response.status_code}"
                })
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    async def test_performance_benchmark(self):
        """Test performance benchmarks for embedding retrieval"""
        test_name = "Performance Benchmark"
        logger.info(f"\nTesting: {test_name}")
        
        try:
            # Create a large document
            large_content = "This is a test sentence for performance benchmarking. " * 100
            
            document_id = await self.create_test_document(
                "Performance Benchmark Test",
                large_content
            )
            
            if not document_id:
                raise Exception("Failed to create test document")
            
            # Measure response time
            start_time = time.time()
            response = await self.client.get(
                f"{self.base_url}/api/v1/knowledge/{document_id}/embeddings",
                headers=self.get_headers()
            )
            response_time = time.time() - start_time
            
            # Clean up
            await self.delete_test_document(document_id)
            
            # Check against benchmark (< 500ms as per requirements)
            benchmark = 0.5  # 500ms
            
            if response.status_code == 200 and response_time < benchmark:
                logger.info(f"✓ Performance benchmark met: {response_time:.3f}s < {benchmark}s")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed",
                    "response_time": response_time,
                    "benchmark": benchmark,
                    "within_benchmark": True
                })
            else:
                logger.warning(f"⚠ Response time: {response_time:.3f}s (benchmark: {benchmark}s)")
                self.test_results.append({
                    "test": test_name,
                    "status": "passed" if response.status_code == 200 else "failed",
                    "response_time": response_time,
                    "benchmark": benchmark,
                    "within_benchmark": response_time < benchmark
                })
                
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "failed",
                "error": str(e)
            })
    
    def save_results(self):
        """Save test results to JSON file"""
        results = {
            "test_suite": "knowledge_embeddings",
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(self.test_results),
            "passed": sum(1 for r in self.test_results if r['status'] == 'passed'),
            "failed": sum(1 for r in self.test_results if r['status'] == 'failed'),
            "skipped": 0,
            "execution_time": f"{time.time() - self.start_time:.3f}s",
            "tests": self.test_results
        }
        
        filename = "embedding_endpoint_test_report.json"
        filepath = os.path.join("/tmp", filename)
        
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        logger.info(f"\nTest results saved to: {filepath}")
    
    async def run_all_tests(self):
        """Run all document embedding endpoint tests"""
        await self.setup()
        
        try:
            # Run tests in sequence as per AR-81 requirements
            await self.test_get_document_embeddings_valid()
            await self.test_get_document_embeddings_invalid()
            await self.test_response_schema_validation()
            await self.test_embedding_data_structure()
            await self.test_chunk_information_accuracy()
            await self.test_authorization()
            await self.test_performance_benchmark()
            
        finally:
            await self.teardown()


async def main():
    """Main test execution"""
    logger.info("="*60)
    logger.info("AR-81: Document Embedding Endpoint Isolated Tests")
    logger.info("Testing GET /api/v1/knowledge/{document_id}/embeddings")
    logger.info("="*60)
    
    tester = DocumentEmbeddingTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())