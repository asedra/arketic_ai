#!/usr/bin/env python3
"""
Test Knowledge API with document_id parameter

This script tests the updated /api/v1/knowledge/search and /api/v1/knowledge/query
endpoints to ensure they properly handle the document_id parameter.
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import httpx

# Simple color printing without termcolor
def colored(text, color, attrs=None):
    """Simple colored text output without termcolor dependency"""
    colors = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'cyan': '\033[96m',
        'white': '\033[97m',
        'reset': '\033[0m'
    }
    
    color_code = colors.get(color, '')
    reset_code = colors['reset']
    
    if attrs and 'bold' in attrs:
        color_code = '\033[1m' + color_code
    
    return f"{color_code}{text}{reset_code}"

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = "test-api-key"  # Replace with actual API key

class KnowledgeDocumentIDTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.token = None
        self.test_results = []
        self.created_document_id = None
        self.created_kb_id = None
        
    async def setup(self):
        """Setup test - login and get auth token"""
        print(colored("\n🔧 Setting up test environment...", "cyan"))
        
        # Login to get token
        login_data = {
            "email": "test@arketic.com",
            "password": "testpass123"
        }
        
        response = await self.client.post(
            f"{BASE_URL}/api/v1/auth/login",
            json=login_data
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            print(colored("✅ Authentication successful", "green"))
            return True
        else:
            print(colored(f"❌ Authentication failed: {response.status_code}", "red"))
            return False
    
    def get_headers(self):
        """Get headers with authentication"""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        if API_KEY:
            headers["x-api-key"] = API_KEY
        return headers
    
    async def create_test_documents(self):
        """Create test documents for testing"""
        print(colored("\n📄 Creating test documents...", "cyan"))
        
        # Create a knowledge base first
        kb_data = {
            "name": f"Test KB for Document ID - {datetime.now().isoformat()}",
            "description": "Knowledge base for testing document_id parameter",
            "type": "general",
            "is_public": False
        }
        
        response = await self.client.post(
            f"{BASE_URL}/api/v1/collections",
            headers=self.get_headers(),
            json=kb_data
        )
        
        if response.status_code == 201:
            kb_response = response.json()
            self.created_kb_id = kb_response.get("collection_id")
            print(colored(f"✅ Created knowledge base: {self.created_kb_id}", "green"))
        else:
            print(colored(f"❌ Failed to create knowledge base: {response.status_code}", "red"))
            return False
        
        # Create test documents
        documents = [
            {
                "title": "Python Programming Guide",
                "content": """Python is a high-level programming language known for its simplicity and readability. 
                It supports multiple programming paradigms including procedural, object-oriented, and functional programming.
                Python is widely used in web development, data science, artificial intelligence, and automation.""",
                "source_type": "text",
                "metadata": {"category": "programming", "language": "python"}
            },
            {
                "title": "Machine Learning Basics",
                "content": """Machine learning is a subset of artificial intelligence that enables systems to learn 
                and improve from experience without being explicitly programmed. Common algorithms include linear regression,
                decision trees, neural networks, and support vector machines. Applications include image recognition,
                natural language processing, and predictive analytics.""",
                "source_type": "text",
                "metadata": {"category": "ai", "topic": "machine_learning"}
            },
            {
                "title": "Web Development with FastAPI",
                "content": """FastAPI is a modern, fast web framework for building APIs with Python. It's based on 
                standard Python type hints and provides automatic API documentation. FastAPI is built on Starlette for 
                the web parts and Pydantic for the data parts. It offers high performance comparable to NodeJS and Go.""",
                "source_type": "text",
                "metadata": {"category": "web", "framework": "fastapi"}
            }
        ]
        
        created_docs = []
        for doc_data in documents:
            doc_data["knowledge_base_id"] = self.created_kb_id
            
            response = await self.client.post(
                f"{BASE_URL}/api/v1/knowledge/upload",
                headers=self.get_headers(),
                json=doc_data
            )
            
            if response.status_code == 201:
                doc_response = response.json()
                doc_id = doc_response.get("document_id")
                created_docs.append(doc_id)
                print(colored(f"✅ Created document: {doc_data['title']} (ID: {doc_id})", "green"))
                
                # Save the first document ID for testing
                if not self.created_document_id:
                    self.created_document_id = doc_id
            else:
                print(colored(f"❌ Failed to create document: {doc_data['title']}", "red"))
                print(f"   Response: {response.text}")
        
        return len(created_docs) == len(documents)
    
    async def test_search_with_document_id(self):
        """Test /api/v1/knowledge/search with document_id parameter"""
        print(colored("\n🔍 Testing search endpoint with document_id...", "cyan"))
        
        test_cases = [
            {
                "name": "Search within specific document",
                "data": {
                    "query": "Python programming",
                    "document_id": self.created_document_id,
                    "k": 5,
                    "score_threshold": 0.5,
                    "search_type": "semantic"
                },
                "expected_status": 200
            },
            {
                "name": "Search across all documents (no document_id)",
                "data": {
                    "query": "programming language",
                    "knowledge_base_id": self.created_kb_id,
                    "k": 10,
                    "score_threshold": 0.5,
                    "search_type": "semantic"
                },
                "expected_status": 200
            },
            {
                "name": "Search with both knowledge_base_id and document_id",
                "data": {
                    "query": "web framework",
                    "knowledge_base_id": self.created_kb_id,
                    "document_id": self.created_document_id,
                    "k": 5,
                    "score_threshold": 0.5,
                    "search_type": "semantic"
                },
                "expected_status": 200
            },
            {
                "name": "Search with invalid document_id",
                "data": {
                    "query": "test query",
                    "document_id": str(uuid4()),  # Random UUID that doesn't exist
                    "k": 5,
                    "score_threshold": 0.5,
                    "search_type": "semantic"
                },
                "expected_status": 404  # Should return not found
            }
        ]
        
        for test in test_cases:
            print(colored(f"\n  📝 {test['name']}", "yellow"))
            
            response = await self.client.post(
                f"{BASE_URL}/api/v1/knowledge/search",
                headers=self.get_headers(),
                json=test["data"]
            )
            
            status_match = response.status_code == test["expected_status"]
            
            if status_match:
                print(colored(f"    ✅ Status code: {response.status_code} (expected)", "green"))
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    print(f"    📊 Found {len(results)} results")
                    
                    # If searching within a specific document, verify results come from that document
                    if test["data"].get("document_id"):
                        for result in results:
                            result_doc_id = result.get("document_id")
                            if result_doc_id == test["data"]["document_id"]:
                                print(colored(f"    ✅ Result correctly filtered by document_id", "green"))
                            else:
                                print(colored(f"    ⚠️  Result from different document: {result_doc_id}", "yellow"))
                    
                    self.test_results.append({"test": test["name"], "status": "PASSED", "details": data})
            else:
                print(colored(f"    ❌ Status code: {response.status_code} (expected: {test['expected_status']})", "red"))
                print(f"    Response: {response.text}")
                self.test_results.append({"test": test["name"], "status": "FAILED", "error": response.text})
    
    async def test_rag_query_with_document_id(self):
        """Test /api/v1/knowledge/query with document_id parameter"""
        print(colored("\n💬 Testing RAG query endpoint with document_id...", "cyan"))
        
        test_cases = [
            {
                "name": "RAG query within specific document",
                "data": {
                    "query": "What is Python used for?",
                    "document_id": self.created_document_id,
                    "model": "gpt-3.5-turbo",
                    "temperature": 0.7,
                    "max_tokens": 500,
                    "include_sources": True,
                    "k": 3
                },
                "expected_status": 200
            },
            {
                "name": "RAG query across knowledge base",
                "data": {
                    "query": "Explain machine learning algorithms",
                    "knowledge_base_id": self.created_kb_id,
                    "model": "gpt-3.5-turbo",
                    "temperature": 0.7,
                    "max_tokens": 500,
                    "include_sources": True,
                    "k": 5
                },
                "expected_status": 200
            },
            {
                "name": "RAG query with both KB and document ID",
                "data": {
                    "query": "Tell me about FastAPI",
                    "knowledge_base_id": self.created_kb_id,
                    "document_id": self.created_document_id,
                    "model": "gpt-3.5-turbo",
                    "temperature": 0.5,
                    "max_tokens": 300,
                    "include_sources": True,
                    "k": 2
                },
                "expected_status": 200
            }
        ]
        
        for test in test_cases:
            print(colored(f"\n  📝 {test['name']}", "yellow"))
            
            response = await self.client.post(
                f"{BASE_URL}/api/v1/knowledge/query",
                headers=self.get_headers(),
                json=test["data"]
            )
            
            status_match = response.status_code == test["expected_status"]
            
            if status_match:
                print(colored(f"    ✅ Status code: {response.status_code} (expected)", "green"))
                
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "")
                    sources = data.get("sources", [])
                    
                    print(f"    📊 Answer length: {len(answer)} chars")
                    print(f"    📚 Sources: {len(sources)} documents")
                    
                    # If querying within a specific document, verify sources
                    if test["data"].get("document_id") and sources:
                        for source in sources:
                            source_doc_id = source.get("document_id")
                            if source_doc_id == test["data"]["document_id"]:
                                print(colored(f"    ✅ Source correctly from specified document", "green"))
                            else:
                                print(colored(f"    ⚠️  Source from different document: {source_doc_id}", "yellow"))
                    
                    self.test_results.append({"test": test["name"], "status": "PASSED", "details": data})
            else:
                print(colored(f"    ❌ Status code: {response.status_code} (expected: {test['expected_status']})", "red"))
                print(f"    Response: {response.text}")
                self.test_results.append({"test": test["name"], "status": "FAILED", "error": response.text})
    
    async def cleanup(self):
        """Clean up test data"""
        print(colored("\n🧹 Cleaning up test data...", "cyan"))
        
        # Delete test knowledge base (this should cascade delete documents)
        if self.created_kb_id:
            response = await self.client.delete(
                f"{BASE_URL}/api/v1/collections/{self.created_kb_id}",
                headers=self.get_headers(),
                params={"cascade": True}
            )
            
            if response.status_code == 200:
                print(colored(f"✅ Deleted test knowledge base: {self.created_kb_id}", "green"))
            else:
                print(colored(f"⚠️  Failed to delete knowledge base: {response.status_code}", "yellow"))
    
    def print_summary(self):
        """Print test summary"""
        print(colored("\n" + "="*60, "blue"))
        print(colored("📊 TEST SUMMARY", "blue", attrs=["bold"]))
        print(colored("="*60, "blue"))
        
        passed = sum(1 for r in self.test_results if r["status"] == "PASSED")
        failed = sum(1 for r in self.test_results if r["status"] == "FAILED")
        total = len(self.test_results)
        
        print(f"\n  Total Tests: {total}")
        print(colored(f"  ✅ Passed: {passed}", "green"))
        if failed > 0:
            print(colored(f"  ❌ Failed: {failed}", "red"))
        
        if total > 0:
            success_rate = (passed / total) * 100
            color = "green" if success_rate >= 80 else "yellow" if success_rate >= 60 else "red"
            print(colored(f"\n  Success Rate: {success_rate:.1f}%", color, attrs=["bold"]))
        
        # Save detailed results
        results_file = "/tmp/knowledge_document_id_test_report.json"
        with open(results_file, "w") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total": total,
                    "passed": passed,
                    "failed": failed,
                    "success_rate": success_rate if total > 0 else 0
                },
                "results": self.test_results
            }, f, indent=2)
        
        print(colored(f"\n  📄 Detailed results saved to: {results_file}", "cyan"))
    
    async def run_tests(self):
        """Run all tests"""
        try:
            # Setup
            if not await self.setup():
                print(colored("❌ Failed to setup test environment", "red"))
                return
            
            # Create test documents
            if not await self.create_test_documents():
                print(colored("❌ Failed to create test documents", "red"))
                return
            
            # Run tests
            await self.test_search_with_document_id()
            await self.test_rag_query_with_document_id()
            
            # Cleanup
            await self.cleanup()
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(colored(f"\n❌ Test execution failed: {str(e)}", "red"))
            import traceback
            traceback.print_exc()
        finally:
            await self.client.aclose()


async def main():
    """Main entry point"""
    print(colored("\n" + "="*60, "blue"))
    print(colored("🧪 KNOWLEDGE API DOCUMENT_ID PARAMETER TEST", "blue", attrs=["bold"]))
    print(colored("="*60, "blue"))
    print(colored("Testing search and query endpoints with document_id filtering", "cyan"))
    
    tester = KnowledgeDocumentIDTester()
    await tester.run_tests()


if __name__ == "__main__":
    asyncio.run(main())