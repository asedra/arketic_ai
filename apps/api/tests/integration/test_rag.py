"""
RAG Integration Tests for Knowledge Base, Assistant and Chat
AR-98: E2E Test Suite - RAG Integration
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import aiohttp
import aiofiles
from colorama import init, Fore, Style

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from docs.test_base import APITester

init(autoreset=True)

class RAGIntegrationTester(APITester):
    """RAG Integration Test Suite"""
    
    def __init__(self):
        super().__init__()
        self.test_files = []
        self.test_assistant_id = None
        self.test_chat_id = None
        self.test_knowledge_ids = []
        
    async def setup_test_data(self):
        """Setup test data for RAG testing"""
        print(f"\n{Fore.CYAN}Setting up test data...{Style.RESET_ALL}")
        
        # Create test documents
        test_docs = [
            {
                "filename": "test_document_1.txt",
                "content": "This is a test document about artificial intelligence and machine learning. "
                          "AI is transforming how we work and live. Machine learning enables computers "
                          "to learn from data without explicit programming."
            },
            {
                "filename": "test_document_2.txt", 
                "content": "Cloud computing provides on-demand access to computing resources. "
                          "Major providers include AWS, Azure, and Google Cloud Platform. "
                          "Cloud services enable scalable and flexible infrastructure."
            },
            {
                "filename": "test_document_3.md",
                "content": "# Project Documentation\n\n"
                          "## Architecture Overview\n"
                          "The system uses a microservices architecture with the following components:\n"
                          "- API Gateway\n"
                          "- Authentication Service\n"
                          "- Knowledge Management Service\n"
                          "- Chat Service with RAG capabilities\n\n"
                          "## Technology Stack\n"
                          "- FastAPI for backend\n"
                          "- PostgreSQL with pgvector for embeddings\n"
                          "- Redis for caching\n"
                          "- Next.js for frontend"
            }
        ]
        
        # Create temporary test files
        for doc in test_docs:
            filepath = f"/tmp/{doc['filename']}"
            async with aiofiles.open(filepath, 'w') as f:
                await f.write(doc['content'])
            self.test_files.append(filepath)
            
        print(f"{Fore.GREEN}✓ Created {len(self.test_files)} test documents{Style.RESET_ALL}")
        
    async def cleanup_test_data(self):
        """Cleanup test data after testing"""
        print(f"\n{Fore.CYAN}Cleaning up test data...{Style.RESET_ALL}")
        
        # Remove test files
        for filepath in self.test_files:
            if os.path.exists(filepath):
                os.remove(filepath)
                
        print(f"{Fore.GREEN}✓ Cleaned up test data{Style.RESET_ALL}")
        
    async def test_knowledge_upload_and_embedding(self):
        """Test knowledge upload and embedding generation"""
        print(f"\n{Fore.YELLOW}Testing knowledge upload and embedding...{Style.RESET_ALL}")
        
        results = []
        
        for filepath in self.test_files:
            filename = os.path.basename(filepath)
            
            # Upload file
            with open(filepath, 'rb') as f:
                files = {'file': (filename, f, 'text/plain')}
                response = await self.make_request(
                    'POST',
                    '/api/knowledge/upload',
                    files=files
                )
                
            if response['status'] == 200:
                knowledge_id = response['data'].get('id')
                self.test_knowledge_ids.append(knowledge_id)
                
                # Verify embeddings were created
                verify_response = await self.make_request(
                    'GET',
                    f'/api/knowledge/{knowledge_id}'
                )
                
                has_embeddings = verify_response['data'].get('embedding_count', 0) > 0
                
                results.append({
                    'file': filename,
                    'upload_success': True,
                    'knowledge_id': knowledge_id,
                    'has_embeddings': has_embeddings,
                    'status': 'passed' if has_embeddings else 'failed'
                })
                
                if has_embeddings:
                    print(f"  {Fore.GREEN}✓ {filename}: Upload successful, embeddings created{Style.RESET_ALL}")
                else:
                    print(f"  {Fore.RED}✗ {filename}: Upload successful but no embeddings{Style.RESET_ALL}")
            else:
                results.append({
                    'file': filename,
                    'upload_success': False,
                    'error': response.get('error'),
                    'status': 'failed'
                })
                print(f"  {Fore.RED}✗ {filename}: Upload failed - {response.get('error')}{Style.RESET_ALL}")
                
        return {
            'test': 'knowledge_upload_and_embedding',
            'total': len(results),
            'passed': len([r for r in results if r['status'] == 'passed']),
            'failed': len([r for r in results if r['status'] == 'failed']),
            'details': results
        }
        
    async def test_assistant_knowledge_configuration(self):
        """Test assistant configuration with knowledge base"""
        print(f"\n{Fore.YELLOW}Testing assistant knowledge configuration...{Style.RESET_ALL}")
        
        # Create assistant
        assistant_data = {
            "name": "RAG Test Assistant",
            "description": "Assistant for testing RAG integration",
            "model": "gpt-3.5-turbo",
            "instructions": "You are a helpful assistant that uses the knowledge base to answer questions.",
            "knowledge_ids": self.test_knowledge_ids,
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = await self.make_request(
            'POST',
            '/api/assistants',
            json=assistant_data
        )
        
        if response['status'] == 201:
            self.test_assistant_id = response['data'].get('id')
            
            # Verify knowledge is attached
            verify_response = await self.make_request(
                'GET',
                f'/api/assistants/{self.test_assistant_id}'
            )
            
            attached_knowledge = verify_response['data'].get('knowledge_ids', [])
            all_attached = all(kid in attached_knowledge for kid in self.test_knowledge_ids)
            
            if all_attached:
                print(f"  {Fore.GREEN}✓ Assistant created with {len(self.test_knowledge_ids)} knowledge items{Style.RESET_ALL}")
                return {
                    'test': 'assistant_knowledge_configuration',
                    'status': 'passed',
                    'assistant_id': self.test_assistant_id,
                    'knowledge_count': len(attached_knowledge)
                }
            else:
                print(f"  {Fore.RED}✗ Knowledge not properly attached to assistant{Style.RESET_ALL}")
                return {
                    'test': 'assistant_knowledge_configuration',
                    'status': 'failed',
                    'error': 'Knowledge attachment failed'
                }
        else:
            print(f"  {Fore.RED}✗ Failed to create assistant: {response.get('error')}{Style.RESET_ALL}")
            return {
                'test': 'assistant_knowledge_configuration',
                'status': 'failed',
                'error': response.get('error')
            }
            
    async def test_chat_rag_queries(self):
        """Test chat with RAG queries"""
        print(f"\n{Fore.YELLOW}Testing chat RAG queries...{Style.RESET_ALL}")
        
        # Create chat session
        chat_data = {
            "title": "RAG Test Chat",
            "assistant_id": self.test_assistant_id
        }
        
        response = await self.make_request(
            'POST',
            '/api/chats',
            json=chat_data
        )
        
        if response['status'] != 201:
            print(f"  {Fore.RED}✗ Failed to create chat: {response.get('error')}{Style.RESET_ALL}")
            return {
                'test': 'chat_rag_queries',
                'status': 'failed',
                'error': 'Chat creation failed'
            }
            
        self.test_chat_id = response['data'].get('id')
        
        # Test queries that should use RAG
        test_queries = [
            {
                "query": "What are the main components of the microservices architecture?",
                "expected_keywords": ["API Gateway", "Authentication", "Knowledge", "Chat"]
            },
            {
                "query": "Tell me about machine learning and AI",
                "expected_keywords": ["artificial intelligence", "machine learning", "data", "computers"]
            },
            {
                "query": "What cloud providers are mentioned?",
                "expected_keywords": ["AWS", "Azure", "Google Cloud"]
            }
        ]
        
        results = []
        
        for test_case in test_queries:
            # Send message
            message_data = {
                "content": test_case["query"],
                "chat_id": self.test_chat_id
            }
            
            response = await self.make_request(
                'POST',
                f'/api/chats/{self.test_chat_id}/messages',
                json=message_data
            )
            
            if response['status'] == 200:
                ai_response = response['data'].get('ai_response', {})
                content = ai_response.get('content', '').lower()
                sources = ai_response.get('sources', [])
                
                # Check if expected keywords are in response
                keywords_found = [kw for kw in test_case["expected_keywords"] 
                                 if kw.lower() in content]
                
                has_sources = len(sources) > 0
                has_relevant_content = len(keywords_found) > 0
                
                test_passed = has_sources and has_relevant_content
                
                results.append({
                    'query': test_case["query"],
                    'has_sources': has_sources,
                    'source_count': len(sources),
                    'keywords_found': keywords_found,
                    'status': 'passed' if test_passed else 'failed'
                })
                
                if test_passed:
                    print(f"  {Fore.GREEN}✓ Query: '{test_case['query'][:50]}...' - Found {len(sources)} sources{Style.RESET_ALL}")
                else:
                    print(f"  {Fore.RED}✗ Query: '{test_case['query'][:50]}...' - Sources: {len(sources)}, Keywords: {len(keywords_found)}{Style.RESET_ALL}")
            else:
                results.append({
                    'query': test_case["query"],
                    'status': 'failed',
                    'error': response.get('error')
                })
                print(f"  {Fore.RED}✗ Query failed: {response.get('error')}{Style.RESET_ALL}")
                
        return {
            'test': 'chat_rag_queries',
            'total': len(results),
            'passed': len([r for r in results if r['status'] == 'passed']),
            'failed': len([r for r in results if r['status'] == 'failed']),
            'details': results
        }
        
    async def test_embedding_search_accuracy(self):
        """Test embedding search accuracy"""
        print(f"\n{Fore.YELLOW}Testing embedding search accuracy...{Style.RESET_ALL}")
        
        search_tests = [
            {
                "query": "artificial intelligence machine learning",
                "expected_doc": "test_document_1.txt"
            },
            {
                "query": "cloud computing AWS Azure",
                "expected_doc": "test_document_2.txt"
            },
            {
                "query": "microservices architecture FastAPI",
                "expected_doc": "test_document_3.md"
            }
        ]
        
        results = []
        
        for test in search_tests:
            response = await self.make_request(
                'POST',
                '/api/knowledge/search',
                json={
                    "query": test["query"],
                    "limit": 3
                }
            )
            
            if response['status'] == 200:
                search_results = response['data'].get('results', [])
                
                # Check if expected document is in top results
                top_result = search_results[0] if search_results else None
                correct_match = False
                
                if top_result:
                    filename = top_result.get('metadata', {}).get('filename', '')
                    correct_match = test["expected_doc"] in filename
                    
                results.append({
                    'query': test["query"],
                    'expected': test["expected_doc"],
                    'found': filename if top_result else None,
                    'correct_match': correct_match,
                    'status': 'passed' if correct_match else 'failed'
                })
                
                if correct_match:
                    print(f"  {Fore.GREEN}✓ Query '{test['query'][:30]}...' correctly matched {test['expected_doc']}{Style.RESET_ALL}")
                else:
                    print(f"  {Fore.RED}✗ Query '{test['query'][:30]}...' did not match expected document{Style.RESET_ALL}")
            else:
                results.append({
                    'query': test["query"],
                    'status': 'failed',
                    'error': response.get('error')
                })
                print(f"  {Fore.RED}✗ Search failed: {response.get('error')}{Style.RESET_ALL}")
                
        return {
            'test': 'embedding_search_accuracy',
            'total': len(results),
            'passed': len([r for r in results if r['status'] == 'passed']),
            'failed': len([r for r in results if r['status'] == 'failed']),
            'accuracy': len([r for r in results if r.get('correct_match')]) / len(results) * 100 if results else 0,
            'details': results
        }
        
    async def test_concurrent_rag_queries(self):
        """Test concurrent RAG queries for performance"""
        print(f"\n{Fore.YELLOW}Testing concurrent RAG queries...{Style.RESET_ALL}")
        
        queries = [
            "What is artificial intelligence?",
            "Explain cloud computing",
            "Describe the system architecture",
            "What technology stack is used?",
            "Tell me about machine learning"
        ]
        
        start_time = datetime.now()
        
        # Execute queries concurrently
        tasks = []
        for query in queries:
            task = self.make_request(
                'POST',
                f'/api/chats/{self.test_chat_id}/messages',
                json={
                    "content": query,
                    "chat_id": self.test_chat_id
                }
            )
            tasks.append(task)
            
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        # Analyze results
        successful = [r for r in responses if not isinstance(r, Exception) and r.get('status') == 200]
        failed = len(responses) - len(successful)
        
        avg_response_time = total_time / len(queries)
        
        print(f"  {Fore.GREEN if failed == 0 else Fore.YELLOW}Concurrent queries: {len(successful)}/{len(queries)} successful{Style.RESET_ALL}")
        print(f"  {Fore.CYAN}Total time: {total_time:.2f}s, Avg per query: {avg_response_time:.2f}s{Style.RESET_ALL}")
        
        return {
            'test': 'concurrent_rag_queries',
            'total_queries': len(queries),
            'successful': len(successful),
            'failed': failed,
            'total_time': total_time,
            'avg_response_time': avg_response_time,
            'status': 'passed' if failed == 0 else 'partial'
        }
        
    async def run_all_tests(self):
        """Run all RAG integration tests"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"RAG Integration Test Suite - AR-98")
        print(f"{'='*60}{Style.RESET_ALL}")
        
        all_results = []
        
        try:
            # Setup test data
            await self.setup_test_data()
            
            # Run tests in sequence
            tests = [
                self.test_knowledge_upload_and_embedding,
                self.test_assistant_knowledge_configuration,
                self.test_chat_rag_queries,
                self.test_embedding_search_accuracy,
                self.test_concurrent_rag_queries
            ]
            
            for test_func in tests:
                try:
                    result = await test_func()
                    all_results.append(result)
                except Exception as e:
                    print(f"{Fore.RED}Error in {test_func.__name__}: {str(e)}{Style.RESET_ALL}")
                    all_results.append({
                        'test': test_func.__name__,
                        'status': 'error',
                        'error': str(e)
                    })
                    
            # Cleanup
            await self.cleanup_test_data()
            
            # Generate summary
            total_tests = len(all_results)
            passed_tests = len([r for r in all_results if r.get('status') == 'passed'])
            failed_tests = len([r for r in all_results if r.get('status') == 'failed'])
            error_tests = len([r for r in all_results if r.get('status') == 'error'])
            
            print(f"\n{Fore.CYAN}{'='*60}")
            print(f"Test Summary")
            print(f"{'='*60}{Style.RESET_ALL}")
            print(f"Total Tests: {total_tests}")
            print(f"{Fore.GREEN}Passed: {passed_tests}{Style.RESET_ALL}")
            print(f"{Fore.RED}Failed: {failed_tests}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Errors: {error_tests}{Style.RESET_ALL}")
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
            
            # Save results to file
            report = {
                'test_suite': 'RAG Integration Tests',
                'jira_ticket': 'AR-98',
                'timestamp': datetime.now().isoformat(),
                'summary': {
                    'total': total_tests,
                    'passed': passed_tests,
                    'failed': failed_tests,
                    'errors': error_tests,
                    'success_rate': f"{(passed_tests/total_tests)*100:.1f}%"
                },
                'results': all_results
            }
            
            with open('/app/docs/rag_integration_test_report.json', 'w') as f:
                json.dump(report, f, indent=2)
                
            print(f"\n{Fore.GREEN}✓ Test report saved to rag_integration_test_report.json{Style.RESET_ALL}")
            
            return report
            
        except Exception as e:
            print(f"{Fore.RED}Fatal error in test suite: {str(e)}{Style.RESET_ALL}")
            return None

async def main():
    """Main entry point"""
    tester = RAGIntegrationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())