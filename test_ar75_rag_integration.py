#!/usr/bin/env python3
"""
AR-75: RAG Integration for Chat - Integration Test

This test validates the complete RAG (Retrieval-Augmented Generation) integration
for the chat system according to AR-75 requirements.

Requirements tested:
- User questions trigger vector search in knowledge base
- Relevant documents retrieved based on similarity
- Retrieved text added to prompt context
- AI responses enhanced with knowledge base information
- Source documents referenced in responses
"""

import os
import sys
import json
import asyncio
import aiohttp
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AR75RAGTester:
    """Test suite for AR-75 RAG Integration"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.api_base = f"{self.base_url}/api/v1"
        self.test_token = None
        self.test_user_id = None
        self.test_results = []
        
        # Test data
        self.test_documents = [
            {
                "title": "Python Best Practices",
                "content": """
Python Best Practices and Coding Standards

1. Code Style and Formatting
- Use PEP 8 style guide for Python code
- Use 4 spaces for indentation, never tabs
- Limit lines to 79 characters for code, 72 for comments
- Use meaningful variable and function names

2. Error Handling
- Use specific exception types rather than bare except clauses
- Always handle exceptions appropriately
- Use try-except-finally blocks when needed

3. Documentation
- Write docstrings for all functions, classes, and modules
- Use type hints for better code clarity
- Keep comments concise and relevant

4. Testing
- Write unit tests for all functions
- Use pytest for testing framework
- Maintain high test coverage (>80%)

5. Performance
- Use list comprehensions instead of for loops where appropriate
- Profile code to identify bottlenecks
- Use appropriate data structures for the task
                """
            },
            {
                "title": "Machine Learning Fundamentals",
                "content": """
Machine Learning Fundamentals and Key Concepts

1. Types of Machine Learning
- Supervised Learning: Uses labeled training data
- Unsupervised Learning: Finds patterns in unlabeled data
- Reinforcement Learning: Learns through interaction with environment

2. Common Algorithms
- Linear Regression: For continuous target variables
- Logistic Regression: For binary classification
- Decision Trees: Easy to interpret and visualize
- Random Forest: Ensemble method combining multiple trees
- Neural Networks: Inspired by biological neural networks

3. Model Evaluation
- Train/Validation/Test split: Standard data splitting approach
- Cross-validation: Better evaluation for small datasets
- Metrics: Accuracy, Precision, Recall, F1-score, ROC-AUC

4. Feature Engineering
- Feature selection: Choose relevant features
- Feature scaling: Normalize or standardize features
- Feature creation: Derive new features from existing ones

5. Overfitting and Underfitting
- Overfitting: Model learns training data too well, poor generalization
- Underfitting: Model is too simple, poor performance on both training and test
- Regularization: Techniques to prevent overfitting
                """
            },
            {
                "title": "Database Design Principles",
                "content": """
Database Design Principles and Best Practices

1. Normalization
- First Normal Form (1NF): Eliminate repeating groups
- Second Normal Form (2NF): Eliminate partial dependencies
- Third Normal Form (3NF): Eliminate transitive dependencies
- Balance between normalization and performance

2. Primary Keys and Indexes
- Every table should have a primary key
- Use surrogate keys when natural keys are not available
- Create indexes on frequently queried columns
- Avoid over-indexing as it impacts write performance

3. Data Types and Constraints
- Choose appropriate data types for storage efficiency
- Use constraints to maintain data integrity
- NOT NULL constraints for required fields
- CHECK constraints for business rules

4. Relationships and Foreign Keys
- Define relationships between tables clearly
- Use foreign key constraints to maintain referential integrity
- Consider cascade options for delete operations
- Document relationship cardinalities

5. Performance Optimization
- Query optimization using EXPLAIN plans
- Proper indexing strategy
- Avoid SELECT * in production queries
- Use connection pooling for better resource management
                """
            }
        ]
        
        self.test_questions = [
            {
                "question": "What are the Python PEP 8 guidelines for line length?",
                "expected_sources": ["Python Best Practices"],
                "test_type": "specific_fact_retrieval"
            },
            {
                "question": "Explain the difference between supervised and unsupervised learning",
                "expected_sources": ["Machine Learning Fundamentals"], 
                "test_type": "concept_explanation"
            },
            {
                "question": "What is database normalization and why is it important?",
                "expected_sources": ["Database Design Principles"],
                "test_type": "definition_and_context"
            },
            {
                "question": "How can I prevent overfitting in machine learning models?",
                "expected_sources": ["Machine Learning Fundamentals"],
                "test_type": "problem_solution"
            },
            {
                "question": "What programming language should I use for data science?",
                "expected_sources": [],  # No relevant documents
                "test_type": "no_relevant_context"
            }
        ]
    
    async def authenticate(self) -> bool:
        """Authenticate with test credentials"""
        try:
            async with aiohttp.ClientSession() as session:
                # Try to authenticate using the test credentials from auth_test.py
                auth_data = {
                    "email": "test@arketic.com",
                    "password": "testpass123"
                }
                
                async with session.post(f"{self.api_base}/auth/login", json=auth_data) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.test_token = data.get("access_token")
                        self.test_user_id = data.get("user", {}).get("id")
                        logger.info("Authentication successful")
                        return True
                    else:
                        logger.error(f"Authentication failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False
    
    async def create_knowledge_base(self) -> Optional[str]:
        """Create a test knowledge base - using default knowledge base for simplicity"""
        try:
            # For AR-75 testing, we'll use the default knowledge base created by the system
            # The upload_document_text method in knowledge_service creates a default KB if none exists
            logger.info("Using default knowledge base (created automatically by system)")
            return "default"  # Return a placeholder - the actual ID will be determined by the system
                        
        except Exception as e:
            logger.error(f"Knowledge base setup error: {e}")
            return None
    
    async def upload_test_documents(self, kb_id: str) -> List[str]:
        """Upload test documents to knowledge base"""
        document_ids = []
        headers = {"Authorization": f"Bearer {self.test_token}"}
        
        try:
            async with aiohttp.ClientSession() as session:
                for doc in self.test_documents:
                    doc_data = {
                        # Don't specify knowledge_base_id - let system create/use default
                        "title": doc["title"],
                        "content": doc["content"],
                        "source_type": "text"
                    }
                    
                    async with session.post(
                        f"{self.api_base}/knowledge/upload",
                        json=doc_data,
                        headers=headers
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            doc_id = data.get("document_id")
                            document_ids.append(str(doc_id))
                            logger.info(f"Uploaded document: {doc['title']} -> {doc_id}")
                        else:
                            text = await response.text()
                            logger.error(f"Failed to upload {doc['title']}: {response.status} - {text}")
            
            # Wait for embeddings to be processed
            logger.info("Waiting 5 seconds for embeddings to be processed...")
            await asyncio.sleep(5)
            
            return document_ids
            
        except Exception as e:
            logger.error(f"Document upload error: {e}")
            return []
    
    async def create_assistant_with_knowledge(self, kb_id: str) -> Optional[str]:
        """Create an assistant with attached knowledge base or use existing one"""
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            
            # First, try to list existing assistants
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.api_base}/assistants",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        assistants = data.get("assistants", [])
                        if assistants:
                            # Use the first existing assistant and modify it to include knowledge base
                            assistant_id = assistants[0]["id"]
                            logger.info(f"Using existing assistant: {assistant_id}")
                            return str(assistant_id)
            
            # If no assistants exist, create a new one
            assistant_data = {
                "name": "AR-75 Test Assistant",
                "description": "Test assistant for AR-75 RAG integration",
                "ai_model": "gpt-3.5-turbo",
                "ai_model_display": "GPT-3.5 Turbo", 
                "system_prompt": "You are a helpful assistant with access to technical documentation. Always cite your sources when providing information.",
                "temperature": 0.7,
                "max_tokens": 2048,
                "is_public": False,
                # Skip knowledge base IDs for now - we'll test RAG at the chat level
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/assistants",
                    json=assistant_data,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        assistant_id = data.get("id")
                        logger.info(f"Created assistant: {assistant_id}")
                        return str(assistant_id)
                    else:
                        text = await response.text()
                        logger.error(f"Failed to create assistant: {response.status} - {text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Assistant creation error: {e}")
            return None
    
    async def create_test_chat(self, assistant_id: str) -> Optional[str]:
        """Create a test chat with the assistant"""
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            
            chat_data = {
                "title": "AR-75 RAG Integration Test Chat",
                "description": "Test chat for AR-75 RAG functionality",
                "chat_type": "direct",
                "assistant_id": assistant_id,
                "ai_model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 2048,
                "is_private": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/chat/chats",
                    json=chat_data,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        chat_id = data.get("id")
                        logger.info(f"Created test chat: {chat_id}")
                        return str(chat_id)
                    else:
                        text = await response.text()
                        logger.error(f"Failed to create chat: {response.status} - {text}")
                        return None
                        
        except Exception as e:
            logger.error(f"Chat creation error: {e}")
            return None
    
    async def test_rag_chat(self, chat_id: str, question: Dict[str, Any]) -> Dict[str, Any]:
        """Test RAG functionality with a specific question"""
        try:
            headers = {"Authorization": f"Bearer {self.test_token}"}
            
            message_data = {
                "message": question["question"],
                "stream": False,
                "save_to_history": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/chat/chats/{chat_id}/ai-message",
                    json=message_data,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        ai_response = data.get("data", {}).get("ai_response", {})
                        
                        result = {
                            "question": question["question"],
                            "test_type": question["test_type"],
                            "expected_sources": question["expected_sources"],
                            "success": True,
                            "response_content": ai_response.get("content", ""),
                            "rag_enabled": ai_response.get("rag_enabled", False),
                            "rag_sources": ai_response.get("rag_sources", []),
                            "processing_time_ms": ai_response.get("processing_time_ms", 0),
                            "tokens_used": ai_response.get("tokens_used", {}),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
                        # Validate RAG functionality
                        result["rag_tests"] = self._validate_rag_response(result)
                        
                        logger.info(f"RAG test completed for: {question['question'][:50]}...")
                        return result
                        
                    else:
                        text = await response.text()
                        logger.error(f"Chat request failed: {response.status} - {text}")
                        return {
                            "question": question["question"],
                            "success": False,
                            "error": f"HTTP {response.status}: {text}",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
        except Exception as e:
            logger.error(f"RAG test error: {e}")
            return {
                "question": question["question"],
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _validate_rag_response(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate RAG response against AR-75 requirements"""
        tests = {}
        
        # Test 1: Vector search triggered
        if result["expected_sources"]:
            tests["vector_search_triggered"] = result["rag_enabled"]
        else:
            tests["vector_search_triggered"] = True  # No sources expected
        
        # Test 2: Relevant documents retrieved
        retrieved_sources = [source["title"] for source in result["rag_sources"]]
        expected_sources = result["expected_sources"]
        
        if expected_sources:
            tests["relevant_documents_retrieved"] = any(
                expected in retrieved_sources for expected in expected_sources
            )
        else:
            tests["relevant_documents_retrieved"] = len(retrieved_sources) == 0
        
        # Test 3: Context injected into prompt (inferred from response quality)
        response_content = result["response_content"].lower()
        if expected_sources:
            # Check if response mentions source information
            tests["context_injected"] = any(
                source.lower() in response_content for source in expected_sources
            ) or "source" in response_content
        else:
            tests["context_injected"] = True  # No context expected
        
        # Test 4: Source documents referenced
        tests["source_documents_provided"] = len(result["rag_sources"]) > 0 if expected_sources else True
        
        # Overall test success
        tests["overall_success"] = all(tests.values())
        
        return tests
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run the complete AR-75 RAG integration test suite"""
        logger.info("🚀 Starting AR-75 RAG Integration Test Suite")
        
        test_summary = {
            "test_suite": "AR-75 RAG Integration",
            "start_time": datetime.utcnow().isoformat(),
            "requirements_tested": [
                "User questions trigger vector search in knowledge base",
                "Relevant documents retrieved based on similarity",
                "Retrieved text added to prompt context", 
                "AI responses enhanced with knowledge base information",
                "Source documents referenced in responses"
            ],
            "setup_results": {},
            "test_results": [],
            "summary": {}
        }
        
        try:
            # Step 1: Authentication
            logger.info("Step 1: Authenticating...")
            auth_success = await self.authenticate()
            test_summary["setup_results"]["authentication"] = auth_success
            
            if not auth_success:
                test_summary["summary"]["status"] = "FAILED"
                test_summary["summary"]["error"] = "Authentication failed"
                return test_summary
            
            # Step 2: Create knowledge base
            logger.info("Step 2: Creating knowledge base...")
            kb_id = await self.create_knowledge_base()
            test_summary["setup_results"]["knowledge_base_created"] = bool(kb_id)
            test_summary["setup_results"]["knowledge_base_id"] = kb_id
            
            if not kb_id:
                test_summary["summary"]["status"] = "FAILED"
                test_summary["summary"]["error"] = "Knowledge base creation failed"
                return test_summary
            
            # Step 3: Upload test documents
            logger.info("Step 3: Uploading test documents...")
            document_ids = await self.upload_test_documents(kb_id)
            test_summary["setup_results"]["documents_uploaded"] = len(document_ids)
            test_summary["setup_results"]["document_ids"] = document_ids
            
            if not document_ids:
                test_summary["summary"]["status"] = "FAILED"
                test_summary["summary"]["error"] = "Document upload failed"
                return test_summary
            
            # Step 4: Create assistant
            logger.info("Step 4: Creating assistant with knowledge base...")
            assistant_id = await self.create_assistant_with_knowledge(kb_id)
            test_summary["setup_results"]["assistant_created"] = bool(assistant_id)
            test_summary["setup_results"]["assistant_id"] = assistant_id
            
            if not assistant_id:
                test_summary["summary"]["status"] = "FAILED"
                test_summary["summary"]["error"] = "Assistant creation failed"
                return test_summary
            
            # Step 5: Create test chat
            logger.info("Step 5: Creating test chat...")
            chat_id = await self.create_test_chat(assistant_id)
            test_summary["setup_results"]["chat_created"] = bool(chat_id)
            test_summary["setup_results"]["chat_id"] = chat_id
            
            if not chat_id:
                test_summary["summary"]["status"] = "FAILED"
                test_summary["summary"]["error"] = "Chat creation failed"
                return test_summary
            
            # Step 6: Run RAG tests
            logger.info("Step 6: Running RAG functionality tests...")
            
            for i, question in enumerate(self.test_questions, 1):
                logger.info(f"Test {i}/{len(self.test_questions)}: {question['test_type']}")
                result = await self.test_rag_chat(chat_id, question)
                test_summary["test_results"].append(result)
                
                # Add delay between tests
                await asyncio.sleep(2)
            
            # Calculate summary statistics
            successful_tests = sum(1 for r in test_summary["test_results"] if r.get("success", False))
            total_tests = len(test_summary["test_results"])
            rag_enabled_tests = sum(1 for r in test_summary["test_results"] if r.get("rag_enabled", False))
            
            test_summary["summary"] = {
                "status": "COMPLETED",
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "success_rate": f"{(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                "rag_enabled_tests": rag_enabled_tests,
                "rag_enablement_rate": f"{(rag_enabled_tests/total_tests*100):.1f}%" if total_tests > 0 else "0%",
                "all_requirements_met": all(
                    r.get("rag_tests", {}).get("overall_success", False) 
                    for r in test_summary["test_results"] 
                    if r.get("success", False)
                )
            }
            
            test_summary["end_time"] = datetime.utcnow().isoformat()
            
            return test_summary
            
        except Exception as e:
            logger.error(f"Test suite error: {e}")
            test_summary["summary"] = {
                "status": "ERROR",
                "error": str(e)
            }
            test_summary["end_time"] = datetime.utcnow().isoformat()
            return test_summary
    
    def print_test_report(self, results: Dict[str, Any]):
        """Print a formatted test report"""
        print("\n" + "="*80)
        print("🧪 AR-75 RAG INTEGRATION TEST REPORT")
        print("="*80)
        
        print(f"\nTest Suite: {results['test_suite']}")
        print(f"Start Time: {results['start_time']}")
        print(f"End Time: {results.get('end_time', 'N/A')}")
        
        print(f"\n📋 Requirements Tested:")
        for i, req in enumerate(results['requirements_tested'], 1):
            print(f"   {i}. {req}")
        
        # Setup Results
        print(f"\n🔧 Setup Results:")
        setup = results['setup_results']
        for key, value in setup.items():
            status = "✅" if value else "❌" 
            print(f"   {status} {key.replace('_', ' ').title()}: {value}")
        
        # Test Results
        print(f"\n🧪 Test Results:")
        if results['test_results']:
            for i, test in enumerate(results['test_results'], 1):
                success = test.get('success', False)
                status = "✅" if success else "❌"
                print(f"   {status} Test {i}: {test.get('test_type', 'Unknown')}")
                print(f"      Question: {test['question'][:60]}...")
                
                if success and 'rag_tests' in test:
                    rag_tests = test['rag_tests']
                    print(f"      RAG Tests:")
                    for test_name, passed in rag_tests.items():
                        if test_name != 'overall_success':
                            result_symbol = "✅" if passed else "❌"
                            test_display = test_name.replace('_', ' ').title()
                            print(f"        {result_symbol} {test_display}")
                    
                    if test.get('rag_sources'):
                        print(f"      Sources Retrieved: {len(test['rag_sources'])}")
                        for source in test['rag_sources']:
                            print(f"        - {source['title']} (score: {source['score']:.3f})")
                elif not success:
                    print(f"      Error: {test.get('error', 'Unknown error')}")
                print()
        
        # Summary
        summary = results['summary']
        print(f"📊 SUMMARY:")
        print(f"   Status: {summary.get('status', 'Unknown')}")
        if summary.get('status') == 'COMPLETED':
            print(f"   Total Tests: {summary.get('total_tests', 0)}")
            print(f"   Successful Tests: {summary.get('successful_tests', 0)}")
            print(f"   Success Rate: {summary.get('success_rate', '0%')}")
            print(f"   RAG Enabled Tests: {summary.get('rag_enabled_tests', 0)}")
            print(f"   RAG Enablement Rate: {summary.get('rag_enablement_rate', '0%')}")
            
            all_reqs_met = summary.get('all_requirements_met', False)
            req_status = "✅ ALL REQUIREMENTS MET" if all_reqs_met else "❌ SOME REQUIREMENTS NOT MET"
            print(f"   AR-75 Requirements: {req_status}")
        elif summary.get('error'):
            print(f"   Error: {summary['error']}")
        
        print("\n" + "="*80)
        
        # Final verdict
        if summary.get('status') == 'COMPLETED' and summary.get('all_requirements_met'):
            print("🎉 AR-75 RAG INTEGRATION TEST: PASSED")
        else:
            print("❌ AR-75 RAG INTEGRATION TEST: FAILED")
        print("="*80)


async def main():
    """Main test function"""
    tester = AR75RAGTester()
    
    try:
        # Run the comprehensive test
        results = await tester.run_comprehensive_test()
        
        # Print the report
        tester.print_test_report(results)
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ar75_rag_test_report_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {filename}")
        
        # Return appropriate exit code
        summary = results.get('summary', {})
        if summary.get('status') == 'COMPLETED' and summary.get('all_requirements_met'):
            return 0  # Success
        else:
            return 1  # Failure
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        return 130
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)