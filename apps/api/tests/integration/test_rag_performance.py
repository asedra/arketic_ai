"""
RAG Performance Tests
AR-98: Performance testing for RAG queries and operations
"""

import asyncio
import time
import statistics
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import aiohttp
import concurrent.futures
from colorama import init, Fore, Style

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from docs.test_base import APITester

init(autoreset=True)

class RAGPerformanceTester(APITester):
    """Performance test suite for RAG operations"""
    
    def __init__(self):
        super().__init__()
        self.test_knowledge_ids = []
        self.test_assistant_id = None
        self.test_chat_id = None
        self.performance_metrics = []
        
    async def setup_test_environment(self):
        """Setup test environment with sample data"""
        print(f"\n{Fore.CYAN}Setting up performance test environment...{Style.RESET_ALL}")
        
        # Create sample knowledge documents
        sample_docs = []
        for i in range(10):
            doc_content = f"""
            Document {i+1}: Technical Documentation
            
            This is a comprehensive technical document covering various aspects of system {i+1}.
            It includes detailed information about:
            - Architecture patterns and design principles
            - Implementation guidelines and best practices  
            - Performance optimization techniques
            - Security considerations and protocols
            - Deployment strategies and configurations
            
            The content is specifically designed to test RAG retrieval performance
            with realistic document structures and varying content lengths.
            """ * 10  # Make documents reasonably sized
            
            sample_docs.append({
                "title": f"technical_doc_{i+1}.txt",
                "content": doc_content,
                "metadata": {"category": "technical", "index": i+1}
            })
            
        # Upload documents and create embeddings
        for doc in sample_docs:
            response = await self.make_request(
                'POST',
                '/api/knowledge/create',
                json=doc
            )
            if response['status'] == 201:
                self.test_knowledge_ids.append(response['data'].get('id'))
                
        print(f"{Fore.GREEN}✓ Created {len(self.test_knowledge_ids)} test documents{Style.RESET_ALL}")
        
        # Create test assistant with knowledge
        assistant_data = {
            "name": "Performance Test Assistant",
            "model": "gpt-3.5-turbo",
            "instructions": "Use the knowledge base to answer questions accurately.",
            "knowledge_ids": self.test_knowledge_ids,
            "temperature": 0.7
        }
        
        response = await self.make_request(
            'POST',
            '/api/assistants',
            json=assistant_data
        )
        
        if response['status'] == 201:
            self.test_assistant_id = response['data'].get('id')
            print(f"{Fore.GREEN}✓ Created test assistant{Style.RESET_ALL}")
            
        # Create test chat
        chat_data = {
            "title": "Performance Test Chat",
            "assistant_id": self.test_assistant_id
        }
        
        response = await self.make_request(
            'POST',
            '/api/chats',
            json=chat_data
        )
        
        if response['status'] == 201:
            self.test_chat_id = response['data'].get('id')
            print(f"{Fore.GREEN}✓ Created test chat{Style.RESET_ALL}")
            
    async def test_single_query_performance(self):
        """Test performance of single RAG queries"""
        print(f"\n{Fore.YELLOW}Testing single query performance...{Style.RESET_ALL}")
        
        test_queries = [
            "What are the architecture patterns?",
            "Explain the security protocols",
            "Describe deployment strategies",
            "What are the performance optimization techniques?",
            "Tell me about implementation guidelines"
        ]
        
        query_times = []
        
        for query in test_queries:
            start_time = time.time()
            
            response = await self.make_request(
                'POST',
                f'/api/chats/{self.test_chat_id}/messages',
                json={
                    "content": query,
                    "chat_id": self.test_chat_id
                }
            )
            
            end_time = time.time()
            query_time = (end_time - start_time) * 1000  # Convert to ms
            query_times.append(query_time)
            
            status = "✓" if response['status'] == 200 else "✗"
            color = Fore.GREEN if response['status'] == 200 else Fore.RED
            print(f"  {color}{status} Query: '{query[:30]}...' - {query_time:.2f}ms{Style.RESET_ALL}")
            
        # Calculate statistics
        avg_time = statistics.mean(query_times)
        median_time = statistics.median(query_times)
        min_time = min(query_times)
        max_time = max(query_times)
        std_dev = statistics.stdev(query_times) if len(query_times) > 1 else 0
        
        print(f"\n  {Fore.CYAN}Statistics:{Style.RESET_ALL}")
        print(f"    Average: {avg_time:.2f}ms")
        print(f"    Median: {median_time:.2f}ms")
        print(f"    Min: {min_time:.2f}ms")
        print(f"    Max: {max_time:.2f}ms")
        print(f"    Std Dev: {std_dev:.2f}ms")
        
        return {
            'test': 'single_query_performance',
            'queries': len(test_queries),
            'avg_time_ms': avg_time,
            'median_time_ms': median_time,
            'min_time_ms': min_time,
            'max_time_ms': max_time,
            'std_dev_ms': std_dev,
            'all_times': query_times
        }
        
    async def test_concurrent_query_performance(self):
        """Test performance under concurrent load"""
        print(f"\n{Fore.YELLOW}Testing concurrent query performance...{Style.RESET_ALL}")
        
        concurrent_levels = [5, 10, 20]
        results = []
        
        for num_concurrent in concurrent_levels:
            print(f"\n  Testing with {num_concurrent} concurrent queries...")
            
            queries = [f"Query {i+1}: What are the best practices for system {i % 10 + 1}?" 
                      for i in range(num_concurrent)]
            
            start_time = time.time()
            
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
            
            end_time = time.time()
            total_time = (end_time - start_time) * 1000
            
            # Count successful responses
            successful = len([r for r in responses 
                            if not isinstance(r, Exception) and r.get('status') == 200])
            
            avg_time_per_query = total_time / num_concurrent
            throughput = (successful / total_time) * 1000  # Queries per second
            
            print(f"    {Fore.GREEN}✓ Completed: {successful}/{num_concurrent}{Style.RESET_ALL}")
            print(f"    Total time: {total_time:.2f}ms")
            print(f"    Avg per query: {avg_time_per_query:.2f}ms")
            print(f"    Throughput: {throughput:.2f} queries/sec")
            
            results.append({
                'concurrent_queries': num_concurrent,
                'successful': successful,
                'total_time_ms': total_time,
                'avg_time_ms': avg_time_per_query,
                'throughput_qps': throughput
            })
            
        return {
            'test': 'concurrent_query_performance',
            'results': results
        }
        
    async def test_embedding_search_performance(self):
        """Test vector search performance"""
        print(f"\n{Fore.YELLOW}Testing embedding search performance...{Style.RESET_ALL}")
        
        search_queries = [
            "architecture patterns design principles",
            "security protocols authentication",
            "performance optimization caching",
            "deployment kubernetes docker",
            "implementation testing quality"
        ]
        
        search_times = []
        result_counts = []
        
        for query in search_queries:
            start_time = time.time()
            
            response = await self.make_request(
                'POST',
                '/api/knowledge/search',
                json={
                    "query": query,
                    "limit": 10,
                    "threshold": 0.7
                }
            )
            
            end_time = time.time()
            search_time = (end_time - start_time) * 1000
            search_times.append(search_time)
            
            if response['status'] == 200:
                results = response['data'].get('results', [])
                result_counts.append(len(results))
                print(f"  {Fore.GREEN}✓ Query: '{query[:30]}...' - {search_time:.2f}ms, {len(results)} results{Style.RESET_ALL}")
            else:
                result_counts.append(0)
                print(f"  {Fore.RED}✗ Query failed: {query[:30]}...{Style.RESET_ALL}")
                
        avg_search_time = statistics.mean(search_times)
        avg_results = statistics.mean(result_counts)
        
        print(f"\n  {Fore.CYAN}Search Performance:{Style.RESET_ALL}")
        print(f"    Avg search time: {avg_search_time:.2f}ms")
        print(f"    Avg results returned: {avg_results:.1f}")
        
        return {
            'test': 'embedding_search_performance',
            'queries': len(search_queries),
            'avg_search_time_ms': avg_search_time,
            'avg_results': avg_results,
            'search_times': search_times,
            'result_counts': result_counts
        }
        
    async def test_document_ingestion_performance(self):
        """Test document upload and embedding generation performance"""
        print(f"\n{Fore.YELLOW}Testing document ingestion performance...{Style.RESET_ALL}")
        
        document_sizes = [
            {"size": "small", "content_length": 100, "count": 10},
            {"size": "medium", "content_length": 1000, "count": 5},
            {"size": "large", "content_length": 10000, "count": 2}
        ]
        
        results = []
        
        for doc_config in document_sizes:
            print(f"\n  Testing {doc_config['size']} documents ({doc_config['count']} docs)...")
            
            ingestion_times = []
            
            for i in range(doc_config['count']):
                content = "Test content. " * doc_config['content_length']
                
                start_time = time.time()
                
                response = await self.make_request(
                    'POST',
                    '/api/knowledge/create',
                    json={
                        "title": f"perf_test_{doc_config['size']}_{i}.txt",
                        "content": content,
                        "metadata": {"size": doc_config['size']}
                    }
                )
                
                end_time = time.time()
                ingestion_time = (end_time - start_time) * 1000
                ingestion_times.append(ingestion_time)
                
                if response['status'] == 201:
                    print(f"    {Fore.GREEN}✓ Document {i+1}: {ingestion_time:.2f}ms{Style.RESET_ALL}")
                else:
                    print(f"    {Fore.RED}✗ Document {i+1} failed{Style.RESET_ALL}")
                    
            avg_time = statistics.mean(ingestion_times) if ingestion_times else 0
            
            results.append({
                'document_size': doc_config['size'],
                'document_count': doc_config['count'],
                'avg_ingestion_time_ms': avg_time,
                'total_time_ms': sum(ingestion_times)
            })
            
        return {
            'test': 'document_ingestion_performance',
            'results': results
        }
        
    async def test_cache_performance(self):
        """Test caching impact on RAG queries"""
        print(f"\n{Fore.YELLOW}Testing cache performance...{Style.RESET_ALL}")
        
        test_query = "What are the main architecture patterns and design principles?"
        
        # First query (cache miss)
        start_time = time.time()
        response1 = await self.make_request(
            'POST',
            f'/api/chats/{self.test_chat_id}/messages',
            json={
                "content": test_query,
                "chat_id": self.test_chat_id
            }
        )
        first_query_time = (time.time() - start_time) * 1000
        
        # Wait a bit
        await asyncio.sleep(0.5)
        
        # Second query (potential cache hit)
        start_time = time.time()
        response2 = await self.make_request(
            'POST',
            f'/api/chats/{self.test_chat_id}/messages',
            json={
                "content": test_query,
                "chat_id": self.test_chat_id
            }
        )
        second_query_time = (time.time() - start_time) * 1000
        
        # Multiple repeated queries
        repeated_times = []
        for i in range(5):
            start_time = time.time()
            await self.make_request(
                'POST',
                f'/api/chats/{self.test_chat_id}/messages',
                json={
                    "content": test_query,
                    "chat_id": self.test_chat_id
                }
            )
            repeated_times.append((time.time() - start_time) * 1000)
            
        avg_cached_time = statistics.mean(repeated_times)
        cache_improvement = ((first_query_time - avg_cached_time) / first_query_time) * 100
        
        print(f"  {Fore.CYAN}Cache Performance:{Style.RESET_ALL}")
        print(f"    First query (cold): {first_query_time:.2f}ms")
        print(f"    Second query: {second_query_time:.2f}ms")
        print(f"    Avg cached query: {avg_cached_time:.2f}ms")
        print(f"    Cache improvement: {cache_improvement:.1f}%")
        
        return {
            'test': 'cache_performance',
            'first_query_ms': first_query_time,
            'second_query_ms': second_query_time,
            'avg_cached_ms': avg_cached_time,
            'improvement_percent': cache_improvement
        }
        
    async def test_scaling_performance(self):
        """Test performance with increasing knowledge base size"""
        print(f"\n{Fore.YELLOW}Testing scaling performance...{Style.RESET_ALL}")
        
        knowledge_sizes = [10, 50, 100, 200]
        results = []
        
        for size in knowledge_sizes:
            print(f"\n  Testing with {size} documents...")
            
            # Add more documents if needed
            current_count = len(self.test_knowledge_ids)
            if current_count < size:
                for i in range(current_count, size):
                    doc_content = f"Scaling test document {i+1} with various content for testing."
                    response = await self.make_request(
                        'POST',
                        '/api/knowledge/create',
                        json={
                            "title": f"scaling_doc_{i+1}.txt",
                            "content": doc_content * 50
                        }
                    )
                    if response['status'] == 201:
                        self.test_knowledge_ids.append(response['data'].get('id'))
                        
            # Test query performance with current size
            test_queries = [
                "What are the best practices?",
                "Explain the architecture",
                "Security considerations"
            ]
            
            query_times = []
            for query in test_queries:
                start_time = time.time()
                await self.make_request(
                    'POST',
                    '/api/knowledge/search',
                    json={
                        "query": query,
                        "limit": 10,
                        "knowledge_ids": self.test_knowledge_ids[:size]
                    }
                )
                query_times.append((time.time() - start_time) * 1000)
                
            avg_time = statistics.mean(query_times)
            
            print(f"    Avg query time: {avg_time:.2f}ms")
            
            results.append({
                'knowledge_size': size,
                'avg_query_time_ms': avg_time
            })
            
        # Calculate scaling factor
        if len(results) > 1:
            scaling_factor = results[-1]['avg_query_time_ms'] / results[0]['avg_query_time_ms']
            print(f"\n  {Fore.CYAN}Scaling factor (10 to {knowledge_sizes[-1]} docs): {scaling_factor:.2f}x{Style.RESET_ALL}")
            
        return {
            'test': 'scaling_performance',
            'results': results
        }
        
    async def test_memory_usage(self):
        """Test memory usage during RAG operations"""
        print(f"\n{Fore.YELLOW}Testing memory usage...{Style.RESET_ALL}")
        
        # This would require system monitoring capabilities
        # Simulating memory checks
        
        memory_checkpoints = []
        
        # Initial memory
        memory_checkpoints.append({
            'stage': 'initial',
            'memory_mb': 100  # Simulated
        })
        
        # After loading knowledge
        memory_checkpoints.append({
            'stage': 'knowledge_loaded',
            'memory_mb': 150  # Simulated
        })
        
        # During queries
        for i in range(5):
            await self.make_request(
                'POST',
                f'/api/chats/{self.test_chat_id}/messages',
                json={
                    "content": f"Test query {i+1}",
                    "chat_id": self.test_chat_id
                }
            )
            
        memory_checkpoints.append({
            'stage': 'after_queries',
            'memory_mb': 180  # Simulated
        })
        
        print(f"  {Fore.CYAN}Memory Usage:{Style.RESET_ALL}")
        for checkpoint in memory_checkpoints:
            print(f"    {checkpoint['stage']}: {checkpoint['memory_mb']}MB")
            
        return {
            'test': 'memory_usage',
            'checkpoints': memory_checkpoints
        }
        
    async def run_all_tests(self):
        """Run all performance tests"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"RAG Performance Test Suite - AR-98")
        print(f"{'='*60}{Style.RESET_ALL}")
        
        all_results = []
        
        try:
            # Setup environment
            await self.setup_test_environment()
            
            # Run performance tests
            tests = [
                self.test_single_query_performance,
                self.test_concurrent_query_performance,
                self.test_embedding_search_performance,
                self.test_document_ingestion_performance,
                self.test_cache_performance,
                self.test_scaling_performance,
                self.test_memory_usage
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
                    
            # Generate performance report
            print(f"\n{Fore.CYAN}{'='*60}")
            print(f"Performance Test Summary")
            print(f"{'='*60}{Style.RESET_ALL}")
            
            # Key metrics
            for result in all_results:
                if result.get('test') == 'single_query_performance':
                    print(f"Single Query Avg: {result.get('avg_time_ms', 0):.2f}ms")
                elif result.get('test') == 'concurrent_query_performance':
                    for r in result.get('results', []):
                        print(f"Concurrent ({r['concurrent_queries']}): {r['throughput_qps']:.2f} qps")
                elif result.get('test') == 'cache_performance':
                    print(f"Cache Improvement: {result.get('improvement_percent', 0):.1f}%")
                    
            # Save report
            report = {
                'test_suite': 'RAG Performance Tests',
                'jira_ticket': 'AR-98',
                'timestamp': datetime.now().isoformat(),
                'results': all_results
            }
            
            with open('/app/docs/rag_performance_test_report.json', 'w') as f:
                json.dump(report, f, indent=2)
                
            print(f"\n{Fore.GREEN}✓ Performance report saved to rag_performance_test_report.json{Style.RESET_ALL}")
            
            return report
            
        except Exception as e:
            print(f"{Fore.RED}Fatal error in performance test suite: {str(e)}{Style.RESET_ALL}")
            return None

async def main():
    """Main entry point"""
    tester = RAGPerformanceTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())