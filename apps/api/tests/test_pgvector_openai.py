"""
Test PGVector Service with OpenAI Embeddings Integration
"""

import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import numpy as np

from services.pgvector_service import PGVectorService
from openai import RateLimitError, APIError, APITimeoutError


@pytest.fixture
def pgvector_service():
    """Create PGVector service instance for testing"""
    return PGVectorService(embedding_model="text-embedding-3-small", batch_size=50)


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI embeddings response"""
    class MockEmbedding:
        def __init__(self, embedding):
            self.embedding = embedding
    
    class MockResponse:
        def __init__(self, embeddings):
            self.data = [MockEmbedding(emb) for emb in embeddings]
    
    return MockResponse


@pytest.mark.asyncio
async def test_generate_embeddings_with_api_key(pgvector_service, mock_openai_response):
    """Test embedding generation with valid API key"""
    test_texts = ["Hello world", "Testing embeddings", "OpenAI integration"]
    mock_embeddings = [np.random.randn(1536).tolist() for _ in test_texts]
    
    with patch('services.pgvector_service.AsyncOpenAI') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        mock_instance.embeddings.create = AsyncMock(
            return_value=mock_openai_response(mock_embeddings)
        )
        
        with patch.object(pgvector_service, '_get_openai_api_key', return_value='sk-test-key'):
            result = await pgvector_service._generate_placeholder_embeddings(test_texts)
            
            assert len(result) == len(test_texts)
            assert all(len(emb) == 1536 for emb in result)
            mock_instance.embeddings.create.assert_called_once()


@pytest.mark.asyncio
async def test_generate_embeddings_fallback_no_api_key(pgvector_service):
    """Test fallback to placeholder embeddings when no API key"""
    test_texts = ["Hello world", "Testing embeddings"]
    
    with patch.object(pgvector_service, '_get_openai_api_key', return_value=None):
        result = await pgvector_service._generate_placeholder_embeddings(test_texts)
        
        assert len(result) == len(test_texts)
        assert all(len(emb) == 1536 for emb in result)


@pytest.mark.asyncio
async def test_batch_processing(pgvector_service, mock_openai_response):
    """Test batch processing for large text lists"""
    # Create 150 texts to test batching (batch_size=50)
    test_texts = [f"Text {i}" for i in range(150)]
    
    call_count = 0
    async def mock_create(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        batch_size = len(kwargs['input'])
        embeddings = [np.random.randn(1536).tolist() for _ in range(batch_size)]
        return mock_openai_response(embeddings)
    
    with patch('services.pgvector_service.AsyncOpenAI') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        mock_instance.embeddings.create = mock_create
        
        with patch.object(pgvector_service, '_get_openai_api_key', return_value='sk-test-key'):
            result = await pgvector_service._generate_placeholder_embeddings(test_texts)
            
            assert len(result) == 150
            assert call_count == 3  # 150 texts / 50 batch_size = 3 calls


@pytest.mark.asyncio
async def test_rate_limit_retry(pgvector_service, mock_openai_response):
    """Test retry logic on rate limit error"""
    test_texts = ["Test text"]
    mock_embeddings = [np.random.randn(1536).tolist()]
    
    with patch('services.pgvector_service.AsyncOpenAI') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        
        # First call raises RateLimitError, second succeeds
        mock_instance.embeddings.create = AsyncMock(
            side_effect=[
                RateLimitError("Rate limit exceeded", response=None, body=None),
                mock_openai_response(mock_embeddings)
            ]
        )
        
        with patch.object(pgvector_service, '_get_openai_api_key', return_value='sk-test-key'):
            with patch('asyncio.sleep', new_callable=AsyncMock):  # Skip actual sleep
                result = await pgvector_service._generate_embeddings_with_retry(test_texts, 'sk-test-key')
                
                assert len(result) == 1
                assert mock_instance.embeddings.create.call_count == 2


@pytest.mark.asyncio
async def test_api_timeout_retry(pgvector_service, mock_openai_response):
    """Test retry logic on API timeout"""
    test_texts = ["Test text"]
    mock_embeddings = [np.random.randn(1536).tolist()]
    
    with patch('services.pgvector_service.AsyncOpenAI') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        
        # First two calls timeout, third succeeds
        mock_instance.embeddings.create = AsyncMock(
            side_effect=[
                APITimeoutError("Request timeout"),
                APITimeoutError("Request timeout"),
                mock_openai_response(mock_embeddings)
            ]
        )
        
        with patch.object(pgvector_service, '_get_openai_api_key', return_value='sk-test-key'):
            with patch('asyncio.sleep', new_callable=AsyncMock):
                result = await pgvector_service._generate_embeddings_with_retry(test_texts, 'sk-test-key')
                
                assert len(result) == 1
                assert mock_instance.embeddings.create.call_count == 3


@pytest.mark.asyncio
async def test_invalid_api_key_error(pgvector_service):
    """Test handling of invalid API key error"""
    test_texts = ["Test text"]
    
    with patch('services.pgvector_service.AsyncOpenAI') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        
        mock_instance.embeddings.create = AsyncMock(
            side_effect=APIError("Invalid API key: invalid_api_key", response=None, body=None)
        )
        
        with pytest.raises(ValueError, match="Invalid OpenAI API key"):
            await pgvector_service._generate_embeddings_with_retry(test_texts, 'invalid-key')


@pytest.mark.asyncio
async def test_configure_embedding_settings(pgvector_service):
    """Test dynamic configuration of embedding settings"""
    # Test model change
    pgvector_service.configure_embedding_settings(model="text-embedding-3-large")
    assert pgvector_service.embedding_model == "text-embedding-3-large"
    assert pgvector_service.embedding_dimensions == 3072
    
    # Test batch size change
    pgvector_service.configure_embedding_settings(batch_size=75)
    assert pgvector_service.batch_size == 75
    
    # Test batch size limit
    pgvector_service.configure_embedding_settings(batch_size=150)
    assert pgvector_service.batch_size == 100  # Should be capped at 100


@pytest.mark.asyncio
async def test_get_openai_api_key_from_database(pgvector_service):
    """Test retrieving API key from database"""
    user_id = uuid4()
    
    mock_api_key_record = MagicMock()
    mock_api_key_record.encrypted_key = b'encrypted_key_data'
    
    with patch.object(pgvector_service.security_manager, 'decrypt_api_key', return_value='sk-decrypted-key'):
        with patch.object(pgvector_service, 'AsyncSessionLocal') as mock_session:
            mock_session_instance = AsyncMock()
            mock_session.return_value.__aenter__.return_value = mock_session_instance
            
            mock_result = AsyncMock()
            mock_result.scalar_one_or_none.return_value = mock_api_key_record
            mock_session_instance.execute.return_value = mock_result
            
            api_key = await pgvector_service._get_openai_api_key(user_id)
            
            assert api_key == 'sk-decrypted-key'


@pytest.mark.asyncio
async def test_get_openai_api_key_from_environment(pgvector_service):
    """Test fallback to environment variable for API key"""
    with patch.object(pgvector_service, 'AsyncSessionLocal') as mock_session:
        mock_session_instance = AsyncMock()
        mock_session.return_value.__aenter__.return_value = mock_session_instance
        
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session_instance.execute.return_value = mock_result
        
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'sk-env-key'}):
            api_key = await pgvector_service._get_openai_api_key()
            
            assert api_key == 'sk-env-key'


@pytest.mark.asyncio
async def test_add_documents_with_embeddings(pgvector_service):
    """Test adding documents with OpenAI embeddings"""
    documents = [
        {"page_content": "Test document 1", "metadata": {"source": "test1"}},
        {"page_content": "Test document 2", "metadata": {"source": "test2"}}
    ]
    knowledge_base_id = uuid4()
    document_id = uuid4()
    user_id = uuid4()
    
    with patch.object(pgvector_service, '_generate_placeholder_embeddings') as mock_generate:
        mock_generate.return_value = [np.random.randn(1536).tolist() for _ in range(2)]
        
        with patch.object(pgvector_service, 'AsyncSessionLocal') as mock_session:
            mock_session_instance = AsyncMock()
            mock_session.return_value.__aenter__.return_value = mock_session_instance
            
            with patch.object(pgvector_service, '_update_document_status', new_callable=AsyncMock):
                result = await pgvector_service.add_documents(
                    documents, knowledge_base_id, document_id, user_id=user_id
                )
                
                assert len(result) > 0
                mock_generate.assert_called()


@pytest.mark.asyncio
async def test_search_similar_with_embeddings(pgvector_service):
    """Test similarity search with OpenAI embeddings"""
    query = "Test search query"
    knowledge_base_id = uuid4()
    user_id = uuid4()
    
    with patch.object(pgvector_service, '_generate_placeholder_embeddings') as mock_generate:
        mock_generate.return_value = [np.random.randn(1536).tolist()]
        
        with patch.object(pgvector_service, 'AsyncSessionLocal') as mock_session:
            mock_session_instance = AsyncMock()
            mock_session.return_value.__aenter__.return_value = mock_session_instance
            
            mock_result = AsyncMock()
            mock_result.fetchall.return_value = [
                (1, "Test content", {"source": "test"}, 0.95)
            ]
            mock_session_instance.execute.return_value = mock_result
            
            with patch.object(pgvector_service, '_update_semantic_cache', new_callable=AsyncMock):
                with patch.object(pgvector_service, '_log_search_history', new_callable=AsyncMock):
                    results = await pgvector_service.search_similar(
                        query, knowledge_base_id, user_id=user_id
                    )
                    
                    assert len(results) == 1
                    assert results[0][1] == 0.95  # Similarity score
                    mock_generate.assert_called_with([query], user_id)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])