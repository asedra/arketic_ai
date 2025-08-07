"""PGVector Performance Benchmark Tests

This script tests PGVector performance with different vector counts
and measures insert/query speeds to ensure they meet the requirements.
"""

import asyncio
import time
import random
import string
import numpy as np
from uuid import uuid4
from typing import List, Dict, Any, Tuple
import psycopg2
from psycopg2.extras import execute_values
import matplotlib.pyplot as plt
from datetime import datetime
import json
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.pgvector_service import pgvector_service
from core.config import settings
from langchain.schema import Document


class PGVectorBenchmark:
    """Benchmark suite for PGVector performance testing"""
    
    def __init__(self):
        self.results = {
            'insert_times': [],
            'search_times': [],
            'hybrid_search_times': [],
            'memory_usage': [],
            'vector_counts': [],
            'timestamps': []
        }
        self.test_sizes = [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000]
        
    def generate_random_text(self, length: int = 500) -> str:
        """Generate random text for testing"""
        words = [''.join(random.choices(string.ascii_lowercase, k=random.randint(3, 10))) 
                 for _ in range(length // 5)]
        return ' '.join(words)
    
    def generate_test_documents(self, count: int) -> List[Document]:
        """Generate test documents with random content"""
        documents = []
        for i in range(count):
            content = self.generate_random_text(random.randint(300, 800))
            doc = Document(
                page_content=content,
                metadata={
                    'doc_id': str(uuid4()),
                    'index': i,
                    'category': random.choice(['tech', 'science', 'business', 'health']),
                    'timestamp': datetime.utcnow().isoformat()
                }
            )
            documents.append(doc)
        return documents
    
    async def benchmark_insert(self, vector_count: int) -> Dict[str, Any]:
        """Benchmark insert performance"""
        print(f"\n📊 Testing insert performance with {vector_count} vectors...")
        
        # Generate test documents
        documents = self.generate_test_documents(vector_count // 5)  # Each doc creates ~5 chunks
        
        # Measure insert time
        start_time = time.time()
        knowledge_base_id = uuid4()
        document_id = uuid4()
        
        try:
            chunk_ids = await pgvector_service.add_documents(
                documents,
                knowledge_base_id,
                document_id,
                {'test_run': True, 'vector_count': vector_count}
            )
            
            elapsed_time = time.time() - start_time
            
            # Calculate metrics
            vectors_per_second = len(chunk_ids) / elapsed_time
            avg_time_per_batch = (elapsed_time / len(chunk_ids)) * 100  # Time for 100 vectors
            
            result = {
                'vector_count': len(chunk_ids),
                'total_time': elapsed_time,
                'vectors_per_second': vectors_per_second,
                'avg_time_per_100': avg_time_per_batch,
                'status': 'success',
                'meets_target': avg_time_per_batch < 0.1  # Target: <100ms per 100 vectors
            }
            
            print(f"✅ Inserted {len(chunk_ids)} vectors in {elapsed_time:.2f}s")
            print(f"   Speed: {vectors_per_second:.0f} vectors/second")
            print(f"   Batch (100): {avg_time_per_batch*1000:.0f}ms {'✓' if result['meets_target'] else '✗'}")
            
            return result
            
        except Exception as e:
            print(f"❌ Insert failed: {e}")
            return {
                'vector_count': vector_count,
                'status': 'failed',
                'error': str(e)
            }
    
    async def benchmark_search(self, vector_count: int) -> Dict[str, Any]:
        """Benchmark search performance"""
        print(f"\n🔍 Testing search performance with {vector_count} vectors in database...")
        
        test_queries = [
            "machine learning algorithms",
            "database optimization techniques",
            "cloud computing services",
            "artificial intelligence applications",
            "data science best practices"
        ]
        
        search_times = []
        
        for query in test_queries:
            start_time = time.time()
            
            try:
                results = await pgvector_service.search_similar(
                    query,
                    k=10,
                    score_threshold=0.5
                )
                
                elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
                search_times.append(elapsed_time)
                
                print(f"   Query: '{query[:30]}...' - {elapsed_time:.0f}ms - {len(results)} results")
                
            except Exception as e:
                print(f"   Query failed: {e}")
                search_times.append(float('inf'))
        
        avg_search_time = np.mean(search_times)
        
        result = {
            'vector_count': vector_count,
            'avg_search_time_ms': avg_search_time,
            'min_search_time_ms': min(search_times),
            'max_search_time_ms': max(search_times),
            'meets_target': avg_search_time < 50,  # Target: <50ms
            'queries_tested': len(test_queries)
        }
        
        print(f"\n   Average search time: {avg_search_time:.0f}ms {'✓' if result['meets_target'] else '✗'}")
        
        return result
    
    async def benchmark_hybrid_search(self, vector_count: int) -> Dict[str, Any]:
        """Benchmark hybrid search performance"""
        print(f"\n🔄 Testing hybrid search performance...")
        
        test_query = "database optimization and indexing strategies"
        
        start_time = time.time()
        
        try:
            results = await pgvector_service.hybrid_search(
                test_query,
                k=10,
                keyword_weight=0.3,
                semantic_weight=0.7
            )
            
            elapsed_time = (time.time() - start_time) * 1000
            
            result = {
                'vector_count': vector_count,
                'search_time_ms': elapsed_time,
                'results_count': len(results),
                'meets_target': elapsed_time < 100  # Target: <100ms for hybrid
            }
            
            print(f"   Hybrid search: {elapsed_time:.0f}ms - {len(results)} results {'✓' if result['meets_target'] else '✗'}")
            
            return result
            
        except Exception as e:
            print(f"   Hybrid search failed: {e}")
            return {
                'vector_count': vector_count,
                'status': 'failed',
                'error': str(e)
            }
    
    def check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage of the database"""
        try:
            conn = psycopg2.connect(settings.DATABASE_URL)
            cur = conn.cursor()
            
            # Get table sizes
            cur.execute("""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('knowledge_embeddings')) as total_size,
                    pg_size_pretty(pg_relation_size('knowledge_embeddings')) as table_size,
                    pg_size_pretty(pg_indexes_size('knowledge_embeddings')) as indexes_size
            """)
            
            sizes = cur.fetchone()
            
            # Get index information
            cur.execute("""
                SELECT 
                    indexname,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes
                WHERE tablename = 'knowledge_embeddings'
            """)
            
            indexes = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return {
                'total_size': sizes[0],
                'table_size': sizes[1],
                'indexes_size': sizes[2],
                'indexes': indexes
            }
            
        except Exception as e:
            print(f"Failed to check memory usage: {e}")
            return {'error': str(e)}
    
    async def run_progressive_benchmark(self):
        """Run progressive benchmark with increasing vector counts"""
        print("=" * 60)
        print("🚀 Starting PGVector Progressive Benchmark")
        print("=" * 60)
        
        # Check initial health
        health = await pgvector_service.check_pgvector_health()
        print(f"\n📋 Initial health check: {health['status']}")
        
        if health['status'] != 'healthy':
            print("⚠️  PGVector not healthy, attempting to use fallback...")
        
        all_results = []
        
        for size in self.test_sizes:
            if size > 100000:
                print(f"\n⚠️  Skipping {size} vectors (large dataset, run separately if needed)")
                continue
            
            print(f"\n{'='*60}")
            print(f"Testing with {size:,} vectors")
            print(f"{'='*60}")
            
            # Insert benchmark
            insert_result = await self.benchmark_insert(size)
            
            # Allow some time for indexing
            await asyncio.sleep(2)
            
            # Search benchmark
            search_result = await self.benchmark_search(size)
            
            # Hybrid search benchmark
            hybrid_result = await self.benchmark_hybrid_search(size)
            
            # Memory check
            memory_info = self.check_memory_usage()
            
            # Combine results
            combined = {
                'vector_count': size,
                'insert': insert_result,
                'search': search_result,
                'hybrid_search': hybrid_result,
                'memory': memory_info,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            all_results.append(combined)
            
            # Save intermediate results
            self.save_results(all_results)
            
            print(f"\n📊 Summary for {size:,} vectors:")
            print(f"   Insert: {'✓' if insert_result.get('meets_target', False) else '✗'}")
            print(f"   Search: {'✓' if search_result.get('meets_target', False) else '✗'}")
            print(f"   Hybrid: {'✓' if hybrid_result.get('meets_target', False) else '✗'}")
            print(f"   Memory: {memory_info.get('total_size', 'N/A')}")
        
        # Generate report
        self.generate_report(all_results)
        
        return all_results
    
    def save_results(self, results: List[Dict]):
        """Save benchmark results to file"""
        with open('pgvector_benchmark_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print("\n💾 Results saved to pgvector_benchmark_results.json")
    
    def generate_report(self, results: List[Dict]):
        """Generate performance report with visualizations"""
        print("\n" + "=" * 60)
        print("📈 PERFORMANCE REPORT")
        print("=" * 60)
        
        # Extract data for plotting
        vector_counts = []
        insert_times = []
        search_times = []
        hybrid_times = []
        
        for r in results:
            if r['insert'].get('status') == 'success':
                vector_counts.append(r['vector_count'])
                insert_times.append(r['insert'].get('avg_time_per_100', 0) * 1000)
                search_times.append(r['search'].get('avg_search_time_ms', 0))
                hybrid_times.append(r['hybrid_search'].get('search_time_ms', 0))
        
        # Create plots
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # Insert performance
        axes[0, 0].plot(vector_counts, insert_times, 'b-o')
        axes[0, 0].axhline(y=100, color='r', linestyle='--', label='Target (<100ms)')
        axes[0, 0].set_xlabel('Vector Count')
        axes[0, 0].set_ylabel('Time (ms per 100 vectors)')
        axes[0, 0].set_title('Insert Performance')
        axes[0, 0].set_xscale('log')
        axes[0, 0].legend()
        axes[0, 0].grid(True)
        
        # Search performance
        axes[0, 1].plot(vector_counts, search_times, 'g-o')
        axes[0, 1].axhline(y=50, color='r', linestyle='--', label='Target (<50ms)')
        axes[0, 1].set_xlabel('Vector Count')
        axes[0, 1].set_ylabel('Time (ms)')
        axes[0, 1].set_title('Search Performance (k=10)')
        axes[0, 1].set_xscale('log')
        axes[0, 1].legend()
        axes[0, 1].grid(True)
        
        # Hybrid search performance
        axes[1, 0].plot(vector_counts, hybrid_times, 'm-o')
        axes[1, 0].axhline(y=100, color='r', linestyle='--', label='Target (<100ms)')
        axes[1, 0].set_xlabel('Vector Count')
        axes[1, 0].set_ylabel('Time (ms)')
        axes[1, 0].set_title('Hybrid Search Performance')
        axes[1, 0].set_xscale('log')
        axes[1, 0].legend()
        axes[1, 0].grid(True)
        
        # Performance summary
        axes[1, 1].axis('off')
        summary_text = "Performance Summary\n" + "="*25 + "\n\n"
        
        for r in results[-3:]:  # Last 3 results
            count = r['vector_count']
            insert_ok = '✓' if r['insert'].get('meets_target', False) else '✗'
            search_ok = '✓' if r['search'].get('meets_target', False) else '✗'
            hybrid_ok = '✓' if r['hybrid_search'].get('meets_target', False) else '✗'
            
            summary_text += f"{count:,} vectors:\n"
            summary_text += f"  Insert: {insert_ok}\n"
            summary_text += f"  Search: {search_ok}\n"
            summary_text += f"  Hybrid: {hybrid_ok}\n\n"
        
        axes[1, 1].text(0.1, 0.5, summary_text, fontsize=10, family='monospace')
        
        plt.suptitle('PGVector Performance Benchmark Results', fontsize=14, fontweight='bold')
        plt.tight_layout()
        plt.savefig('pgvector_benchmark_report.png', dpi=150)
        print("📊 Performance charts saved to pgvector_benchmark_report.png")
        
        # Print final summary
        print("\n🎯 FINAL RESULTS:")
        print("-" * 40)
        
        max_passing = 0
        for r in results:
            if (r['insert'].get('meets_target', False) and 
                r['search'].get('meets_target', False)):
                max_passing = r['vector_count']
        
        print(f"✅ Maximum vectors meeting all targets: {max_passing:,}")
        
        if max_passing >= 1000000:
            print("🏆 EXCELLENT: Handles 1M+ vectors within performance targets!")
        elif max_passing >= 500000:
            print("👍 GOOD: Handles 500K+ vectors within performance targets")
        elif max_passing >= 100000:
            print("👌 ACCEPTABLE: Handles 100K+ vectors within performance targets")
        else:
            print("⚠️  WARNING: Performance targets not met for large datasets")
            print("   Consider optimizing indexes or using Pinecone fallback")


async def main():
    """Run the benchmark suite"""
    benchmark = PGVectorBenchmark()
    
    # Run progressive benchmark
    results = await benchmark.run_progressive_benchmark()
    
    print("\n" + "=" * 60)
    print("✅ Benchmark Complete!")
    print("=" * 60)
    
    # Final recommendations
    print("\n📝 RECOMMENDATIONS:")
    print("-" * 40)
    
    if results:
        last_result = results[-1]
        
        if last_result['insert'].get('meets_target') and last_result['search'].get('meets_target'):
            print("✅ PGVector is performing well and can be used as primary store")
        else:
            print("⚠️  Consider the following optimizations:")
            print("   1. Adjust HNSW index parameters (m, ef_construction)")
            print("   2. Increase connection pool size")
            print("   3. Enable automatic fallback to Pinecone for large datasets")
            print("   4. Implement caching for frequently accessed queries")


if __name__ == "__main__":
    asyncio.run(main())