"""Test suite for async embedding task processing"""

import pytest
import asyncio
import json
from uuid import uuid4
from datetime import datetime
from unittest.mock import Mock, patch, AsyncMock

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.embedding_task_service import (
    EmbeddingTaskService,
    TaskStatus,
    TaskPriority
)


class TestEmbeddingTaskService:
    """Test cases for EmbeddingTaskService"""
    
    @pytest.fixture
    def service(self):
        """Create a test instance of EmbeddingTaskService"""
        return EmbeddingTaskService()
    
    @pytest.fixture
    def sample_task_data(self):
        """Sample task data for testing"""
        return {
            'document_id': uuid4(),
            'knowledge_base_id': uuid4(),
            'content': "This is a test document with some content that needs to be processed for embeddings.",
            'metadata': {'source': 'test', 'type': 'document'},
            'priority': TaskPriority.NORMAL,
            'user_id': uuid4()
        }
    
    @pytest.mark.asyncio
    async def test_queue_embedding_task(self, service, sample_task_data):
        """Test queuing an embedding task"""
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.zadd = AsyncMock(return_value=1)
            
            task_id = await service.queue_embedding_task(
                **sample_task_data,
                background_tasks=None
            )
            
            assert task_id is not None
            assert isinstance(task_id, str)
            
            # Verify Redis operations were called
            mock_redis.set.assert_called_once()
            mock_redis.zadd.assert_called_once_with(
                "embedding_task_queue",
                {task_id: pytest.Any(float)}
            )
    
    @pytest.mark.asyncio
    async def test_get_task_status(self, service):
        """Test retrieving task status"""
        task_id = str(uuid4())
        task_data = {
            'task_id': task_id,
            'status': TaskStatus.PROCESSING,
            'progress': 50,
            'total_chunks': 10,
            'processed_chunks': 5
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
            
            result = await service.get_task_status(task_id)
            
            assert result is not None
            assert result['task_id'] == task_id
            assert result['status'] == TaskStatus.PROCESSING
            assert result['progress'] == 50
    
    @pytest.mark.asyncio
    async def test_get_task_progress(self, service):
        """Test getting detailed task progress"""
        task_id = str(uuid4())
        task_data = {
            'task_id': task_id,
            'status': TaskStatus.PROCESSING,
            'progress': 75,
            'total_chunks': 100,
            'processed_chunks': 75,
            'started_at': datetime.utcnow().isoformat(),
            'created_at': datetime.utcnow().isoformat()
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
            
            progress = await service.get_task_progress(task_id)
            
            assert progress['task_id'] == task_id
            assert progress['status'] == TaskStatus.PROCESSING
            assert progress['progress'] == 75
            assert progress['processed_chunks'] == 75
            assert progress['total_chunks'] == 100
            assert 'eta' in progress  # ETA should be calculated
    
    @pytest.mark.asyncio
    async def test_cancel_task(self, service):
        """Test cancelling a task"""
        task_id = str(uuid4())
        task_data = {
            'task_id': task_id,
            'status': TaskStatus.PENDING,
            'progress': 0
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.zrem = AsyncMock(return_value=1)
            
            success = await service.cancel_task(task_id)
            
            assert success is True
            mock_redis.zrem.assert_called_once_with("embedding_task_queue", task_id)
    
    @pytest.mark.asyncio
    async def test_cancel_completed_task_fails(self, service):
        """Test that cancelling a completed task fails"""
        task_id = str(uuid4())
        task_data = {
            'task_id': task_id,
            'status': TaskStatus.COMPLETED,
            'progress': 100
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.get = AsyncMock(return_value=json.dumps(task_data))
            
            success = await service.cancel_task(task_id)
            
            assert success is False
    
    @pytest.mark.asyncio
    async def test_get_queue_status(self, service):
        """Test getting queue status"""
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.zcard = AsyncMock(return_value=5)
            mock_redis.keys = AsyncMock(return_value=[
                "embedding_task:1",
                "embedding_task:2",
                "embedding_task:3"
            ])
            mock_redis.get = AsyncMock(side_effect=[
                json.dumps({'status': TaskStatus.PENDING}),
                json.dumps({'status': TaskStatus.PROCESSING}),
                json.dumps({'status': TaskStatus.COMPLETED})
            ])
            
            status = await service.get_queue_status()
            
            assert status['queue_size'] == 5
            assert status['max_concurrent_tasks'] == service.max_concurrent_tasks
            assert 'status_counts' in status
    
    @pytest.mark.asyncio
    async def test_priority_scoring(self, service):
        """Test priority score calculation"""
        score_critical = service._get_priority_score(TaskPriority.CRITICAL)
        score_high = service._get_priority_score(TaskPriority.HIGH)
        score_normal = service._get_priority_score(TaskPriority.NORMAL)
        score_low = service._get_priority_score(TaskPriority.LOW)
        
        # Higher priority should have higher base score
        assert score_critical > score_high > score_normal > score_low
    
    @pytest.mark.asyncio
    async def test_process_batch(self, service):
        """Test batch processing of document chunks"""
        batch_docs = [
            {'content': 'Chunk 1', 'metadata': {'index': 0}},
            {'content': 'Chunk 2', 'metadata': {'index': 1}},
            {'content': 'Chunk 3', 'metadata': {'index': 2}}
        ]
        
        with patch.object(service.pgvector_service, '_generate_placeholder_embeddings') as mock_embed:
            mock_embed.return_value = [[0.1] * 1536] * 3
            
            with patch('services.embedding_task_service.get_async_session') as mock_session:
                mock_session_instance = AsyncMock()
                mock_session_instance.__aenter__ = AsyncMock(return_value=mock_session_instance)
                mock_session_instance.__aexit__ = AsyncMock()
                mock_session_instance.execute = AsyncMock()
                mock_session_instance.commit = AsyncMock()
                mock_session.return_value = mock_session_instance
                
                chunk_ids = await service._process_batch(
                    batch_docs,
                    uuid4(),
                    uuid4(),
                    None
                )
                
                assert len(chunk_ids) == 3
                assert all(isinstance(cid, type(uuid4())) for cid in chunk_ids)
    
    @pytest.mark.asyncio
    async def test_retry_mechanism(self, service):
        """Test task retry mechanism"""
        task_id = str(uuid4())
        task_data = {
            'task_id': task_id,
            'status': TaskStatus.FAILED,
            'retry_count': 0,
            'priority': TaskPriority.NORMAL,
            'error_message': 'Test error'
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.zadd = AsyncMock(return_value=1)
            
            with patch('asyncio.sleep', new_callable=AsyncMock):
                await service._retry_task(task_id, task_data)
                
                assert task_data['retry_count'] == 1
                assert task_data['status'] == TaskStatus.PENDING
                assert task_data['error_message'] is None
                mock_redis.zadd.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_document_status(self, service):
        """Test updating document status"""
        document_id = uuid4()
        
        with patch('services.embedding_task_service.get_async_session') as mock_session:
            mock_session_instance = AsyncMock()
            mock_session_instance.__aenter__ = AsyncMock(return_value=mock_session_instance)
            mock_session_instance.__aexit__ = AsyncMock()
            mock_session_instance.execute = AsyncMock()
            mock_session_instance.commit = AsyncMock()
            mock_session.return_value = mock_session_instance
            
            await service._update_document_status(
                document_id,
                'completed',
                10
            )
            
            mock_session_instance.execute.assert_called_once()
            mock_session_instance.commit.assert_called_once()


@pytest.mark.asyncio
class TestIntegration:
    """Integration tests for embedding task processing"""
    
    async def test_end_to_end_task_processing(self):
        """Test complete task processing flow"""
        service = EmbeddingTaskService()
        
        # Sample document
        document_content = """
        This is a test document with multiple paragraphs.
        It contains enough content to be split into multiple chunks.
        Each chunk will be processed separately to generate embeddings.
        """ * 10  # Make it long enough to require chunking
        
        task_data = {
            'document_id': uuid4(),
            'knowledge_base_id': uuid4(),
            'content': document_content,
            'metadata': {'test': True},
            'priority': TaskPriority.HIGH,
            'user_id': uuid4()
        }
        
        with patch('services.embedding_task_service.redis_service') as mock_redis:
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.zadd = AsyncMock(return_value=1)
            mock_redis.get = AsyncMock(return_value=json.dumps({
                'task_id': 'test-task-id',
                'status': TaskStatus.PENDING,
                **task_data
            }))
            
            # Queue the task
            task_id = await service.queue_embedding_task(
                **task_data,
                background_tasks=None
            )
            
            assert task_id is not None
            
            # Verify task was queued
            mock_redis.zadd.assert_called_with(
                "embedding_task_queue",
                {task_id: pytest.Any(float)}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])