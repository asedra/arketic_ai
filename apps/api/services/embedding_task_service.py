"""Async Embedding Task Processing Service

This service handles asynchronous processing of document embeddings using FastAPI BackgroundTasks.
"""

import os
import time
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from enum import Enum
import json

from fastapi import BackgroundTasks
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.pgvector_service import PGVectorService
from services.embedding_service import embedding_service
from core.database import async_session_maker, get_db
from core.redis import get_redis

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Task status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class EmbeddingTaskService:
    """Service for managing async embedding generation tasks"""
    
    def __init__(self):
        """Initialize the embedding task service"""
        self.pgvector_service = PGVectorService()
        self.embedding_service = embedding_service
        self.active_tasks: Dict[str, Dict[str, Any]] = {}
        self.task_queue: List[Dict[str, Any]] = []
        self.max_concurrent_tasks = 5
        self.task_timeout = 300  # 5 minutes timeout
        self.retry_limit = 3
        
    async def queue_embedding_task(
        self,
        document_id: UUID,
        knowledge_base_id: UUID,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        user_id: Optional[UUID] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> str:
        """Queue a document for async embedding generation
        
        Args:
            document_id: ID of the document
            knowledge_base_id: ID of the knowledge base
            content: Document content to process
            metadata: Additional metadata
            priority: Task priority level
            user_id: User ID for API key retrieval
            background_tasks: FastAPI BackgroundTasks instance
            
        Returns:
            Task ID for tracking
        """
        task_id = str(uuid4())
        
        # Create task record
        task_data = {
            'task_id': task_id,
            'document_id': str(document_id),
            'knowledge_base_id': str(knowledge_base_id),
            'content': content,
            'metadata': metadata or {},
            'priority': priority,
            'user_id': str(user_id) if user_id else None,
            'status': TaskStatus.PENDING,
            'progress': 0,
            'total_chunks': 0,
            'processed_chunks': 0,
            'error_message': None,
            'created_at': datetime.utcnow().isoformat(),
            'started_at': None,
            'completed_at': None,
            'retry_count': 0
        }
        
        # Store task in Redis for persistence
        redis = get_redis()
        await redis.setex(
            f"embedding_task:{task_id}",
            86400,  # 24 hours TTL
            json.dumps(task_data)
        )
        
        # Add to priority queue in Redis
        priority_score = self._get_priority_score(priority)
        redis = get_redis()
        await redis.zadd(
            "embedding_task_queue",
            {task_id: priority_score}
        )
        
        # If BackgroundTasks is provided, start processing
        if background_tasks:
            background_tasks.add_task(
                self._process_embedding_task,
                task_id,
                task_data
            )
        
        logger.info(f"Queued embedding task {task_id} for document {document_id}")
        return task_id
    
    def _get_priority_score(self, priority: TaskPriority) -> float:
        """Convert priority to numeric score for sorting"""
        priority_scores = {
            TaskPriority.LOW: 1.0,
            TaskPriority.NORMAL: 2.0,
            TaskPriority.HIGH: 3.0,
            TaskPriority.CRITICAL: 4.0
        }
        # Add timestamp component to ensure FIFO within same priority
        return priority_scores[priority] * 1000000 - time.time()
    
    async def _process_embedding_task(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Process a single embedding task in the background
        
        Args:
            task_id: Task identifier
            task_data: Task details
        """
        try:
            # Update task status to processing
            task_data['status'] = TaskStatus.PROCESSING
            task_data['started_at'] = datetime.utcnow().isoformat()
            await self._update_task_status(task_id, task_data)
            
            # Parse IDs
            document_id = UUID(task_data['document_id'])
            knowledge_base_id = UUID(task_data['knowledge_base_id'])
            user_id = UUID(task_data['user_id']) if task_data.get('user_id') else None
            
            # Split content into chunks
            chunks = self.pgvector_service._split_text(
                task_data['content'],
                chunk_size=1000,
                chunk_overlap=200
            )
            task_data['total_chunks'] = len(chunks)
            
            # Process chunks in batches
            batch_size = 50  # Process 50 chunks at a time
            chunk_ids = []
            
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                batch_docs = []
                
                for j, chunk in enumerate(batch):
                    batch_docs.append({
                        'content': chunk,
                        'metadata': {
                            **task_data.get('metadata', {}),
                            'chunk_index': i + j,
                            'total_chunks': len(chunks),
                            'task_id': task_id
                        }
                    })
                
                # Generate embeddings for batch
                try:
                    batch_chunk_ids = await self._process_batch(
                        batch_docs,
                        knowledge_base_id,
                        document_id,
                        user_id
                    )
                    chunk_ids.extend(batch_chunk_ids)
                    
                    # Update progress
                    task_data['processed_chunks'] = i + len(batch)
                    task_data['progress'] = int((task_data['processed_chunks'] / task_data['total_chunks']) * 100)
                    
                    # Store progress update
                    await self._update_task_status(task_id, task_data)
                    
                    # Send WebSocket notification if available
                    await self._send_progress_notification(task_id, task_data)
                    
                except Exception as e:
                    logger.error(f"Failed to process batch {i//batch_size + 1}: {e}")
                    # Continue with next batch instead of failing entire task
                    continue
            
            # Mark task as completed
            task_data['status'] = TaskStatus.COMPLETED
            task_data['completed_at'] = datetime.utcnow().isoformat()
            task_data['progress'] = 100
            task_data['chunk_ids'] = [str(cid) for cid in chunk_ids]
            await self._update_task_status(task_id, task_data)
            
            # Update document status
            await self._update_document_status(
                document_id,
                'completed',
                len(chunk_ids)
            )
            
            # Send completion notification
            await self._send_completion_notification(task_id, task_data)
            
            logger.info(f"Completed embedding task {task_id}: {len(chunk_ids)} chunks processed")
            
        except Exception as e:
            logger.error(f"Failed to process embedding task {task_id}: {e}")
            
            # Update task as failed
            task_data['status'] = TaskStatus.FAILED
            task_data['error_message'] = str(e)
            task_data['completed_at'] = datetime.utcnow().isoformat()
            await self._update_task_status(task_id, task_data)
            
            # Retry if within limit
            if task_data['retry_count'] < self.retry_limit:
                await self._retry_task(task_id, task_data)
            else:
                # Update document status as failed
                await self._update_document_status(
                    UUID(task_data['document_id']),
                    'failed',
                    0
                )
                
                # Send failure notification
                await self._send_failure_notification(task_id, task_data)
    
    async def _process_batch(
        self,
        batch_docs: List[Dict[str, Any]],
        knowledge_base_id: UUID,
        document_id: UUID,
        user_id: Optional[UUID] = None
    ) -> List[UUID]:
        """Process a batch of document chunks
        
        Args:
            batch_docs: List of document chunks to process
            knowledge_base_id: Knowledge base ID
            document_id: Document ID
            user_id: User ID for API key
            
        Returns:
            List of chunk IDs created
        """
        texts = [doc['content'] for doc in batch_docs]
        
        # Generate embeddings using enhanced service with fallback
        embeddings, metadata = await self.embedding_service.generate_embeddings_with_fallback(
            texts, 
            user_id=str(user_id) if user_id else None
        )
        
        # Log provider used
        logger.info(f"Generated embeddings using {metadata.get('provider', 'unknown')} provider")
        
        chunk_ids = []
        
        # Store embeddings in database
        async with async_session_maker() as session:
            for doc, embedding in zip(batch_docs, embeddings):
                chunk_id = uuid4()
                
                await session.execute(
                    text("""
                        INSERT INTO knowledge_embeddings 
                        (id, document_id, knowledge_base_id, chunk_index, chunk_size, 
                         content, embedding, token_count, metadata, created_at)
                        VALUES (:id, :doc_id, :kb_id, :chunk_idx, :chunk_size,
                                :content, :embedding, :tokens, :metadata, :created_at)
                    """),
                    {
                        'id': chunk_id,
                        'doc_id': document_id,
                        'kb_id': knowledge_base_id,
                        'chunk_idx': doc['metadata'].get('chunk_index', 0),
                        'chunk_size': len(doc['content']),
                        'content': doc['content'],
                        'embedding': f"[{','.join(map(str, embedding))}]",
                        'tokens': self.pgvector_service._tiktoken_len(doc['content']),
                        'metadata': json.dumps(doc['metadata']) if doc.get('metadata') else None,
                        'created_at': datetime.utcnow()
                    }
                )
                chunk_ids.append(chunk_id)
            
            await session.commit()
        
        return chunk_ids
    
    async def _update_task_status(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Update task status in Redis
        
        Args:
            task_id: Task identifier
            task_data: Updated task data
        """
        redis = get_redis()
        await redis.setex(
            f"embedding_task:{task_id}",
            86400,  # 24 hours TTL
            json.dumps(task_data)
        )
    
    async def _update_document_status(
        self,
        document_id: UUID,
        status: str,
        chunk_count: int
    ):
        """Update document processing status
        
        Args:
            document_id: Document ID
            status: Processing status
            chunk_count: Number of chunks processed
        """
        try:
            async with async_session_maker() as session:
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
    
    async def _retry_task(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Retry a failed task
        
        Args:
            task_id: Task identifier
            task_data: Task data
        """
        task_data['retry_count'] += 1
        task_data['status'] = TaskStatus.PENDING
        task_data['error_message'] = None
        
        # Exponential backoff
        delay = min(60 * (2 ** task_data['retry_count']), 300)  # Max 5 minutes
        await asyncio.sleep(delay)
        
        # Requeue task
        priority_score = self._get_priority_score(TaskPriority(task_data['priority']))
        redis = get_redis()
        await redis.zadd(
            "embedding_task_queue",
            {task_id: priority_score}
        )
        
        logger.info(f"Retrying task {task_id} (attempt {task_data['retry_count']})")
    
    async def get_task_status(
        self,
        task_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get the status of an embedding task
        
        Args:
            task_id: Task identifier
            
        Returns:
            Task data if found, None otherwise
        """
        redis = get_redis()
        task_data = await redis.get(f"embedding_task:{task_id}")
        if task_data:
            return json.loads(task_data)
        return None
    
    async def get_task_progress(
        self,
        task_id: str
    ) -> Dict[str, Any]:
        """Get detailed progress information for a task
        
        Args:
            task_id: Task identifier
            
        Returns:
            Progress information
        """
        task_data = await self.get_task_status(task_id)
        
        if not task_data:
            return {
                'status': 'not_found',
                'message': f'Task {task_id} not found'
            }
        
        # Calculate ETA if processing
        eta = None
        if task_data['status'] == TaskStatus.PROCESSING and task_data.get('started_at'):
            started = datetime.fromisoformat(task_data['started_at'])
            elapsed = (datetime.utcnow() - started).total_seconds()
            
            if task_data['processed_chunks'] > 0:
                rate = task_data['processed_chunks'] / elapsed
                remaining = task_data['total_chunks'] - task_data['processed_chunks']
                eta_seconds = remaining / rate if rate > 0 else None
                
                if eta_seconds:
                    eta = (datetime.utcnow() + timedelta(seconds=eta_seconds)).isoformat()
        
        return {
            'task_id': task_id,
            'status': task_data['status'],
            'progress': task_data.get('progress', 0),
            'processed_chunks': task_data.get('processed_chunks', 0),
            'total_chunks': task_data.get('total_chunks', 0),
            'eta': eta,
            'created_at': task_data.get('created_at'),
            'started_at': task_data.get('started_at'),
            'completed_at': task_data.get('completed_at'),
            'error_message': task_data.get('error_message'),
            'retry_count': task_data.get('retry_count', 0)
        }
    
    async def cancel_task(
        self,
        task_id: str
    ) -> bool:
        """Cancel a pending or processing task
        
        Args:
            task_id: Task identifier
            
        Returns:
            True if cancelled, False otherwise
        """
        task_data = await self.get_task_status(task_id)
        
        if not task_data:
            return False
        
        if task_data['status'] in [TaskStatus.PENDING, TaskStatus.PROCESSING]:
            task_data['status'] = TaskStatus.CANCELLED
            task_data['completed_at'] = datetime.utcnow().isoformat()
            await self._update_task_status(task_id, task_data)
            
            # Remove from queue
            redis = get_redis()
            await redis.zrem("embedding_task_queue", task_id)
            
            logger.info(f"Cancelled task {task_id}")
            return True
        
        return False
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get overall queue status and statistics
        
        Returns:
            Queue statistics
        """
        # Get queue size
        redis = get_redis()
        queue_size = await redis.zcard("embedding_task_queue")
        
        # Get task counts by status
        all_tasks = await redis.keys("embedding_task:*")
        status_counts = {
            TaskStatus.PENDING: 0,
            TaskStatus.PROCESSING: 0,
            TaskStatus.COMPLETED: 0,
            TaskStatus.FAILED: 0,
            TaskStatus.CANCELLED: 0
        }
        
        for task_key in all_tasks:
            task_data = await redis.get(task_key)
            if task_data:
                task = json.loads(task_data)
                status = task.get('status')
                if status in status_counts:
                    status_counts[status] += 1
        
        return {
            'queue_size': queue_size,
            'status_counts': status_counts,
            'max_concurrent_tasks': self.max_concurrent_tasks,
            'active_tasks': len(self.active_tasks)
        }
    
    async def process_queue(self):
        """Process tasks from the queue
        
        This method should be called periodically or run in a background worker
        """
        while True:
            try:
                # Check if we can process more tasks
                if len(self.active_tasks) >= self.max_concurrent_tasks:
                    await asyncio.sleep(1)
                    continue
                
                # Get highest priority task from queue
                redis = get_redis()
                tasks = await redis.zrevrange(
                    "embedding_task_queue",
                    0, 0,
                    withscores=False
                )
                
                if not tasks:
                    await asyncio.sleep(5)  # No tasks, wait before checking again
                    continue
                
                task_id = tasks[0]
                
                # Remove from queue
                await redis.zrem("embedding_task_queue", task_id)
                
                # Get task data
                task_data = await self.get_task_status(task_id)
                if not task_data:
                    continue
                
                # Add to active tasks
                self.active_tasks[task_id] = task_data
                
                # Process task
                asyncio.create_task(self._process_and_cleanup(task_id, task_data))
                
            except Exception as e:
                logger.error(f"Error processing queue: {e}")
                await asyncio.sleep(5)
    
    async def _process_and_cleanup(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Process a task and cleanup when done
        
        Args:
            task_id: Task identifier
            task_data: Task data
        """
        try:
            await self._process_embedding_task(task_id, task_data)
        finally:
            # Remove from active tasks
            self.active_tasks.pop(task_id, None)
    
    async def _send_progress_notification(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Send progress notification via WebSocket
        
        Args:
            task_id: Task identifier
            task_data: Task data with progress
        """
        # This will be implemented when WebSocket endpoints are added
        pass
    
    async def _send_completion_notification(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Send completion notification via WebSocket
        
        Args:
            task_id: Task identifier
            task_data: Task data
        """
        # This will be implemented when WebSocket endpoints are added
        pass
    
    async def _send_failure_notification(
        self,
        task_id: str,
        task_data: Dict[str, Any]
    ):
        """Send failure notification via WebSocket
        
        Args:
            task_id: Task identifier
            task_data: Task data with error
        """
        # This will be implemented when WebSocket endpoints are added
        pass


# Singleton instance
embedding_task_service = EmbeddingTaskService()