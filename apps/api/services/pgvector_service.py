"""PGVector Service for Knowledge Base Management

This service handles all vector database operations using PGVector extension.
"""

import os
import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
from uuid import UUID, uuid4
import asyncio
from contextlib import asynccontextmanager

import asyncpg
from sqlalchemy import create_engine, text, pool, select, and_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from pgvector.asyncpg import register_vector
import tiktoken
from openai import AsyncOpenAI
from openai import RateLimitError, APIError, APITimeoutError

from core.config import settings
from core.database import get_db
from core.security import SecurityManager
from models.user import UserApiKey
from services.embedding_service import embedding_service

logger = logging.getLogger(__name__)


class PGVectorService:
    """Service for managing vector embeddings using PGVector"""
    
    def __init__(self, embedding_model: str = "text-embedding-3-small", batch_size: int = 100):
        """Initialize PGVector service with connection pooling
        
        Args:
            embedding_model: OpenAI embedding model to use
            batch_size: Maximum number of texts to embed in a single API call
        """
        self.database_url = settings.DATABASE_URL
        self.embedding_model = embedding_model
        self.embedding_dimensions = 1536  # text-embedding-3-small dimensions
        self.chunk_size = 1000
        self.chunk_overlap = 200
        self.batch_size = min(batch_size, 100)  # OpenAI API max batch size is 100
        self.max_retries = 3
        self.retry_delay = 1.0  # Initial retry delay in seconds
        self.openai_client = None
        self.security_manager = SecurityManager()
        
        # Model dimension mapping
        self.model_dimensions = {
            "text-embedding-3-small": 1536,
            "text-embedding-3-large": 3072,
            "text-embedding-ada-002": 1536
        }
        
        # Update dimensions based on model
        if embedding_model in self.model_dimensions:
            self.embedding_dimensions = self.model_dimensions[embedding_model]
        
        # Connection pooling for sync operations
        self.engine = create_engine(
            self.database_url,
            poolclass=pool.QueuePool,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=3600,
            echo=False
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Async engine for high-performance operations
        async_database_url = self.database_url.replace('postgresql://', 'postgresql+asyncpg://')
        self.async_engine = create_async_engine(
            async_database_url,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=3600,
            echo=False
        )
        self.AsyncSessionLocal = async_sessionmaker(self.async_engine, class_=AsyncSession)
        
        # Performance metrics
        self.metrics = {
            'insert_times': [],
            'search_times': [],
            'total_vectors': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
    
    def _tiktoken_len(self, text: str) -> int:
        """Calculate token length using tiktoken"""
        tokenizer = tiktoken.get_encoding("cl100k_base")
        tokens = tokenizer.encode(text, disallowed_special=())
        return len(tokens)
    
    def configure_embedding_settings(self, model: Optional[str] = None, batch_size: Optional[int] = None):
        """Update embedding configuration at runtime
        
        Args:
            model: New embedding model to use
            batch_size: New batch size for API calls
        """
        if model and model in self.model_dimensions:
            self.embedding_model = model
            self.embedding_dimensions = self.model_dimensions[model]
            logger.info(f"Updated embedding model to {model} with {self.embedding_dimensions} dimensions")
        
        if batch_size is not None:
            self.batch_size = min(batch_size, 100)
            logger.info(f"Updated batch size to {self.batch_size}")
    
    async def check_pgvector_health(self) -> Dict[str, Any]:
        """Check PGVector extension health and availability"""
        try:
            async with self.AsyncSessionLocal() as session:
                # Check if PGVector extension is installed
                result = await session.execute(
                    text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'")
                )
                extension_info = result.fetchone()
                
                if not extension_info:
                    return {
                        'status': 'not_installed',
                        'message': 'PGVector extension is not installed',
                        'fallback_available': False
                    }
                
                # Check vector tables
                result = await session.execute(
                    text("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name IN ('knowledge_embeddings', 'semantic_cache')
                    """)
                )
                tables = [row[0] for row in result.fetchall()]
                
                # Get vector count
                if 'knowledge_embeddings' in tables:
                    result = await session.execute(
                        text("SELECT COUNT(*) FROM knowledge_embeddings")
                    )
                    vector_count = result.scalar()
                else:
                    vector_count = 0
                
                return {
                    'status': 'healthy',
                    'version': extension_info[1],
                    'tables': tables,
                    'vector_count': vector_count,
                    'fallback_available': False,
                    'metrics': self._get_metrics_summary()
                }
        except Exception as e:
            logger.error(f"PGVector health check failed: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'fallback_available': False
            }
    
    async def add_documents(
        self,
        documents: List[Dict[str, Any]],
        knowledge_base_id: UUID,
        document_id: UUID,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None
    ) -> List[UUID]:
        """Add documents to PGVector with automatic chunking"""
        start_time = time.time()
        chunk_ids = []
        
        try:
            # Simple text chunking without langchain
            chunks = []
            for doc in documents:
                content = doc.get('page_content', doc.get('content', ''))
                doc_chunks = self._split_text(content)
                for chunk in doc_chunks:
                    chunks.append({
                        'content': chunk,
                        'metadata': {**doc.get('metadata', {}), **(metadata or {})}
                    })
            
            # Generate embeddings in batches
            batch_size = 100
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                texts = [chunk['content'] for chunk in batch]
                
                # Generate embeddings using enhanced service with fallback
                embeddings, metadata = await embedding_service.generate_embeddings_with_fallback(
                    texts, 
                    user_id=str(user_id) if user_id else None
                )
                logger.info(f"Generated embeddings using {metadata.get('provider', 'unknown')} provider")
                
                # Store in PGVector
                async with self.AsyncSessionLocal() as session:
                    for j, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                        chunk_id = uuid4()
                        chunk_metadata = {
                            **(chunk['metadata'] or {}),
                            'chunk_index': i + j,
                            'total_chunks': len(chunks)
                        }
                        
                        import json
                        await session.execute(
                            text("""
                                INSERT INTO knowledge_embeddings 
                                (id, document_id, knowledge_base_id, chunk_index, chunk_size, 
                                 content, embedding, token_count, metadata, created_at, updated_at)
                                VALUES (:id, :doc_id, :kb_id, :chunk_idx, :chunk_size,
                                        :content, :embedding, :tokens, :metadata, :created_at, :updated_at)
                            """),
                            {
                                'id': chunk_id,
                                'doc_id': document_id,
                                'kb_id': knowledge_base_id,
                                'chunk_idx': i + j,
                                'chunk_size': len(chunk['content']),
                                'content': chunk['content'],
                                'embedding': f"[{','.join(map(str, embedding))}]",  # Format as vector string
                                'tokens': self._tiktoken_len(chunk['content']),
                                'metadata': json.dumps(chunk_metadata) if chunk_metadata else None,
                                'created_at': datetime.utcnow(),
                                'updated_at': datetime.utcnow()
                            }
                        )
                        chunk_ids.append(chunk_id)
                    
                    await session.commit()
            
            # Update metrics
            elapsed_time = time.time() - start_time
            self.metrics['insert_times'].append(elapsed_time)
            self.metrics['total_vectors'] += len(chunks)
            
            # Log performance
            logger.info(f"Added {len(chunks)} chunks in {elapsed_time:.2f}s")
            
            # Update document status
            await self._update_document_status(document_id, 'completed', len(chunks))
            
            return chunk_ids
            
        except Exception as e:
            logger.error(f"Failed to add documents to PGVector: {e}")
            raise
    
    def _split_text(self, text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
        """Simple text splitter without langchain"""
        chunk_size = chunk_size or self.chunk_size
        chunk_overlap = chunk_overlap or self.chunk_overlap
        
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - chunk_overlap
            
        return chunks
    
    async def search_similar(
        self,
        query: str,
        knowledge_base_id: Optional[UUID] = None,
        k: int = 5,
        score_threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None
    ) -> List[Tuple[Dict, float]]:
        """Search for similar documents using cosine similarity"""
        start_time = time.time()
        
        try:
            logger.info(f"PgVector search_similar called - Query: '{query}', Filters: {filters}")
            
            # Generate query embedding using enhanced service with fallback
            embeddings, metadata = await embedding_service.generate_embeddings_with_fallback(
                [query], 
                user_id=str(user_id) if user_id else None
            )
            query_embedding = embeddings[0]
            logger.info(f"Query embedding generated using {metadata.get('provider', 'unknown')} provider, embedding length: {len(query_embedding)}")
            
            # Build filter conditions
            where_conditions = ["1=1"]
            params = {'embedding': f"[{','.join(map(str, query_embedding))}]", 'k': k}
            
            if knowledge_base_id:
                where_conditions.append("knowledge_base_id = :kb_id")
                params['kb_id'] = knowledge_base_id
            
            if filters:
                for key, value in filters.items():
                    if key == 'document_id':
                        # Handle document_id filter directly on the column
                        where_conditions.append("document_id = :document_id")
                        params['document_id'] = value
                    else:
                        # Handle other filters as metadata
                        where_conditions.append(f"metadata->>{key} = :{key}")
                        params[key] = value
            
            where_clause = " AND ".join(where_conditions)
            
            # Perform similarity search
            async with self.AsyncSessionLocal() as session:
                # First check if there are any embeddings at all
                count_query = text(f"""
                    SELECT COUNT(*) FROM knowledge_embeddings WHERE {where_clause}
                """)
                count_params = {k: v for k, v in params.items() if k != 'embedding'}
                count_result = await session.execute(count_query, count_params)
                total_embeddings = count_result.scalar()
                logger.warning(f"Total embeddings matching filters: {total_embeddings}")
                
                if total_embeddings == 0:
                    logger.warning(f"No embeddings found for filters: {filters}")
                    return []
                
                result = await session.execute(
                    text(f"""
                        SELECT 
                            id, content, metadata,
                            1 - (embedding <=> :embedding) as similarity
                        FROM knowledge_embeddings
                        WHERE {where_clause}
                        ORDER BY embedding <=> :embedding
                        LIMIT :k
                    """),
                    params
                )
                logger.info(f"Executed similarity search query")
                
                results = []
                rows = result.fetchall()
                logger.info(f"Got {len(rows)} rows from database")
                
                for row in rows:
                    logger.debug(f"Row similarity: {row[3]}, threshold: {score_threshold}")
                    if row[3] >= score_threshold:
                        doc = {
                            'page_content': row[1],
                            'metadata': row[2] or {}
                        }
                        results.append((doc, row[3]))
                
                logger.info(f"Filtered to {len(results)} results above threshold {score_threshold}")
                
                # Update metrics
                elapsed_time = time.time() - start_time
                self.metrics['search_times'].append(elapsed_time)
                
                # Cache frequently asked questions
                if len(results) > 0 and results[0][1] > 0.95:
                    await self._update_semantic_cache(query, query_embedding, results[0][0])
                    self.metrics['cache_hits'] += 1
                else:
                    self.metrics['cache_misses'] += 1
                
                # Log search history
                await self._log_search_history(
                    knowledge_base_id, query, query_embedding, 
                    len(results), results[0][1] if results else None,
                    elapsed_time * 1000
                )
                
                return results
                
        except Exception as e:
            logger.error(f"PGVector search failed: {e}")
            raise
    
    async def hybrid_search(
        self,
        query: str,
        knowledge_base_id: Optional[UUID] = None,
        k: int = 5,
        keyword_weight: float = 0.3,
        semantic_weight: float = 0.7,
        user_id: Optional[UUID] = None
    ) -> List[Tuple[Dict, float]]:
        """Perform hybrid search combining keyword and semantic search"""
        # Semantic search
        semantic_results = await self.search_similar(query, knowledge_base_id, k * 2, user_id=user_id)
        
        # Keyword search using PostgreSQL full-text search
        async with self.AsyncSessionLocal() as session:
            keyword_query = text("""
                SELECT id, content, metadata,
                       ts_rank(to_tsvector('english', content), 
                              plainto_tsquery('english', :query)) as rank
                FROM knowledge_embeddings
                WHERE to_tsvector('english', content) @@ plainto_tsquery('english', :query)
                AND (:kb_id IS NULL OR knowledge_base_id = :kb_id)
                ORDER BY rank DESC
                LIMIT :k
            """)
            
            result = await session.execute(
                keyword_query,
                {'query': query, 'kb_id': knowledge_base_id, 'k': k * 2}
            )
            
            keyword_results = []
            for row in result.fetchall():
                doc = {'page_content': row[1], 'metadata': row[2] or {}}
                keyword_results.append((doc, float(row[3])))
        
        # Combine and rerank results
        combined_scores = {}
        for doc, score in semantic_results:
            key = doc['page_content'][:100]  # Use first 100 chars as key
            combined_scores[key] = combined_scores.get(key, 0) + score * semantic_weight
        
        for doc, score in keyword_results:
            key = doc['page_content'][:100]
            if key not in combined_scores:
                combined_scores[key] = 0
            # Normalize keyword score to 0-1 range
            normalized_score = min(score * 10, 1.0)
            combined_scores[key] += normalized_score * keyword_weight
        
        # Sort by combined score and return top k
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        final_results = []
        for content_key, score in sorted_results[:k]:
            # Find the original document
            for doc, _ in semantic_results + keyword_results:
                if doc['page_content'][:100] == content_key:
                    final_results.append((doc, score))
                    break
        
        return final_results
    
    async def delete_documents(
        self,
        document_ids: List[UUID]
    ) -> int:
        """Delete documents and their embeddings"""
        try:
            async with self.AsyncSessionLocal() as session:
                result = await session.execute(
                    text("""
                        DELETE FROM knowledge_embeddings 
                        WHERE document_id = ANY(:doc_ids)
                        RETURNING id
                    """),
                    {'doc_ids': document_ids}
                )
                deleted_count = len(result.fetchall())
                await session.commit()
                
                self.metrics['total_vectors'] -= deleted_count
                return deleted_count
                
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            raise
    
    async def update_document(
        self,
        document_id: UUID,
        new_content: str,
        knowledge_base_id: UUID,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None
    ) -> List[UUID]:
        """Update a document by deleting old embeddings and adding new ones"""
        # Delete old embeddings
        await self.delete_documents([document_id])
        
        # Add new document
        doc = {'page_content': new_content, 'metadata': metadata or {}}
        return await self.add_documents([doc], knowledge_base_id, document_id, metadata, user_id)
    
    async def get_statistics(
        self,
        knowledge_base_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get statistics about vector storage"""
        async with self.AsyncSessionLocal() as session:
            # Base query
            base_condition = "1=1"
            params = {}
            if knowledge_base_id:
                base_condition = "knowledge_base_id = :kb_id"
                params['kb_id'] = knowledge_base_id
            
            # Get counts and statistics
            stats_query = text(f"""
                SELECT 
                    COUNT(DISTINCT document_id) as document_count,
                    COUNT(*) as chunk_count,
                    SUM(token_count) as total_tokens,
                    AVG(chunk_size) as avg_chunk_size,
                    MIN(created_at) as first_created,
                    MAX(created_at) as last_created
                FROM knowledge_embeddings
                WHERE {base_condition}
            """)
            
            result = await session.execute(stats_query, params)
            stats = result.fetchone()
            
            # Get index statistics
            index_query = text("""
                SELECT 
                    schemaname, tablename, indexname, 
                    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
                FROM pg_stat_user_indexes
                WHERE indexname LIKE '%embedding%'
            """)
            
            index_result = await session.execute(index_query)
            indexes = [dict(row) for row in index_result.fetchall()]
            
            return {
                'document_count': stats[0] or 0,
                'chunk_count': stats[1] or 0,
                'total_tokens': stats[2] or 0,
                'avg_chunk_size': float(stats[3]) if stats[3] else 0,
                'first_created': stats[4],
                'last_created': stats[5],
                'indexes': indexes,
                'performance_metrics': self._get_metrics_summary()
            }
    
    def _get_metrics_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        return {
            'avg_insert_time': np.mean(self.metrics['insert_times'][-100:]) if self.metrics['insert_times'] else 0,
            'avg_search_time': np.mean(self.metrics['search_times'][-100:]) if self.metrics['search_times'] else 0,
            'total_vectors': self.metrics['total_vectors'],
            'cache_hit_rate': self.metrics['cache_hits'] / max(self.metrics['cache_hits'] + self.metrics['cache_misses'], 1)
        }
    
    async def _get_openai_api_key(self, user_id: Optional[UUID] = None) -> Optional[str]:
        """Get OpenAI API key from database for user or system"""
        try:
            async with self.AsyncSessionLocal() as session:
                # Try to get user-specific API key first
                if user_id:
                    stmt = select(UserApiKey).where(
                        and_(
                            UserApiKey.user_id == user_id,
                            UserApiKey.provider == "openai",
                            UserApiKey.is_active == True
                        )
                    ).order_by(UserApiKey.updated_at.desc()).limit(1)
                else:
                    # Get any available OpenAI API key (for system-level operations)
                    stmt = select(UserApiKey).where(
                        and_(
                            UserApiKey.provider == "openai",
                            UserApiKey.is_active == True
                        )
                    ).order_by(UserApiKey.updated_at.desc()).limit(1)
                
                result = await session.execute(stmt)
                api_key_record = result.scalar_one_or_none()
                
                if api_key_record:
                    # Decrypt the API key
                    decrypted_key = self.security_manager.decrypt_api_key(api_key_record.encrypted_key)
                    return decrypted_key
                    
                # Fall back to environment variable if no database key found
                env_key = os.getenv('OPENAI_API_KEY')
                if env_key:
                    logger.info("Using OpenAI API key from environment variable")
                    return env_key
                    
                return None
                
        except Exception as e:
            # Log at debug level to avoid polluting test output
            logger.debug(f"Database API key retrieval failed: {e}, falling back to environment variable")
            # Fall back to environment variable
            return os.getenv('OPENAI_API_KEY')
    
    async def _generate_embeddings_with_retry(self, texts: List[str], api_key: str) -> List[List[float]]:
        """Generate embeddings with retry logic for handling rate limits and errors"""
        client = AsyncOpenAI(api_key=api_key)
        
        for attempt in range(self.max_retries):
            try:
                response = await client.embeddings.create(
                    model=self.embedding_model,
                    input=texts,
                    encoding_format="float"
                )
                
                embeddings = [item.embedding for item in response.data]
                logger.info(f"Successfully generated {len(embeddings)} embeddings")
                return embeddings
                
            except RateLimitError as e:
                wait_time = self.retry_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{self.max_retries}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Rate limit exceeded after {self.max_retries} attempts")
                    raise
                    
            except APITimeoutError as e:
                logger.warning(f"API timeout on attempt {attempt + 1}/{self.max_retries}: {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                else:
                    logger.error(f"API timeout after {self.max_retries} attempts")
                    raise
                    
            except APIError as e:
                logger.error(f"OpenAI API error on attempt {attempt + 1}: {e}")
                if "invalid_api_key" in str(e).lower():
                    raise ValueError("Invalid OpenAI API key")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                else:
                    raise
                    
            except Exception as e:
                logger.error(f"Unexpected error generating embeddings: {e}")
                raise
    
    async def _generate_placeholder_embeddings(self, texts: List[str], user_id: Optional[UUID] = None) -> List[List[float]]:
        """Generate embeddings using OpenAI API with fallback to placeholder"""
        try:
            # Get API key from database or environment
            api_key = await self._get_openai_api_key(user_id)
            
            if not api_key:
                logger.debug("No OpenAI API key found, using placeholder embeddings")
                # Return placeholder embeddings as fallback
                embeddings = []
                for _ in texts:
                    embedding = np.random.randn(self.embedding_dimensions).tolist()
                    embeddings.append(embedding)
                return embeddings
            
            # Process in batches if necessary
            all_embeddings = []
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i:i + self.batch_size]
                batch_embeddings = await self._generate_embeddings_with_retry(batch, api_key)
                all_embeddings.extend(batch_embeddings)
            
            return all_embeddings
            
        except Exception as e:
            logger.error(f"Failed to generate OpenAI embeddings, falling back to placeholder: {e}")
            # Return placeholder embeddings as fallback
            embeddings = []
            for _ in texts:
                embedding = np.random.randn(self.embedding_dimensions).tolist()
                embeddings.append(embedding)
            return embeddings
    
    async def _update_document_status(
        self,
        document_id: UUID,
        status: str,
        chunk_count: int
    ):
        """Update document processing status"""
        try:
            async with self.AsyncSessionLocal() as session:
                await session.execute(
                    text("""
                        UPDATE knowledge_documents
                        SET processing_status = :status,
                            chunk_count = :chunk_count,
                            processed_at = :processed_at
                        WHERE id = :doc_id
                    """),
                    {
                        'status': status,
                        'chunk_count': chunk_count,
                        'processed_at': datetime.utcnow(),
                        'doc_id': document_id
                    }
                )
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to update document status: {e}")
    
    async def _update_semantic_cache(
        self,
        query: str,
        query_embedding: List[float],
        response_doc: Dict
    ):
        """Update semantic cache for frequently asked questions"""
        try:
            async with self.AsyncSessionLocal() as session:
                # Check if similar query exists
                result = await session.execute(
                    text("""
                        SELECT id, hit_count
                        FROM semantic_cache
                        WHERE 1 - (query_embedding <=> :embedding) > 0.95
                        LIMIT 1
                    """),
                    {'embedding': f"[{','.join(map(str, query_embedding))}]"}
                )
                existing = result.fetchone()
                
                if existing:
                    # Update hit count
                    await session.execute(
                        text("""
                            UPDATE semantic_cache
                            SET hit_count = hit_count + 1,
                                last_accessed_at = :now
                            WHERE id = :id
                        """),
                        {'id': existing[0], 'now': datetime.utcnow()}
                    )
                else:
                    # Insert new cache entry
                    await session.execute(
                        text("""
                            INSERT INTO semantic_cache
                            (id, query, query_embedding, response,
                             expires_at, created_at)
                            VALUES (:id, :query, :embedding, :response,
                                    :expires, :created)
                        """),
                        {
                            'id': uuid4(),
                            'query': query,
                            'embedding': f"[{','.join(map(str, query_embedding))}]",
                            'response': response_doc['page_content'],
                            'expires': datetime.utcnow() + timedelta(days=7),
                            'created': datetime.utcnow()
                        }
                    )
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to update semantic cache: {e}")
    
    async def _log_search_history(
        self,
        knowledge_base_id: Optional[UUID],
        query: str,
        query_embedding: List[float],
        results_count: int,
        top_score: Optional[float],
        execution_time_ms: float
    ):
        """Log search history for analytics"""
        try:
            async with self.AsyncSessionLocal() as session:
                await session.execute(
                    text("""
                        INSERT INTO knowledge_search_history
                        (id, knowledge_base_id, user_id, query, query_embedding,
                         results_count, top_score, execution_time_ms, search_type, created_at)
                        VALUES (:id, :kb_id, :user_id, :query, :embedding,
                                :count, :score, :time, :type, :created)
                    """),
                    {
                        'id': uuid4(),
                        'kb_id': knowledge_base_id,
                        'user_id': None,  # TODO: Get from context
                        'query': query,
                        'embedding': f"[{','.join(map(str, query_embedding))}]",
                        'count': results_count,
                        'score': top_score,
                        'time': int(execution_time_ms),
                        'type': 'semantic',
                        'created': datetime.utcnow()
                    }
                )
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to log search history: {e}")


# Singleton instance
pgvector_service = PGVectorService()