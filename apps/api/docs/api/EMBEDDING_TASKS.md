# Embedding Tasks API Documentation

## Overview

The Embedding Tasks API provides asynchronous processing capabilities for generating document embeddings. This system is designed to handle large documents efficiently by processing them in the background, allowing the API to remain responsive while handling computationally intensive embedding generation tasks.

## Features

- **Asynchronous Processing**: Documents are processed in the background using FastAPI BackgroundTasks
- **Batch Processing**: Large documents are split into chunks and processed in batches for efficiency
- **Priority Queue**: Tasks can be assigned different priority levels (LOW, NORMAL, HIGH, CRITICAL)
- **Progress Tracking**: Real-time progress updates via REST API and WebSocket connections
- **Error Recovery**: Automatic retry mechanism with exponential backoff
- **WebSocket Support**: Real-time notifications for task progress and completion

## Architecture

### Components

1. **EmbeddingTaskService**: Core service for managing embedding generation tasks
2. **Task Queue**: Redis-based priority queue for task management
3. **Background Workers**: FastAPI BackgroundTasks for processing
4. **WebSocket Manager**: Real-time update system for connected clients

### Task Flow

```
1. Document Upload → 2. Task Creation → 3. Queue Assignment
                                            ↓
6. Completion ← 5. Embedding Storage ← 4. Background Processing
     ↓
7. Notification (WebSocket/API)
```

## API Endpoints

### 1. Create Embedding Task

**Endpoint**: `POST /api/v1/embedding-tasks/`

Creates a new background task for document embedding generation.

#### Request

```json
{
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "knowledge_base_id": "456e7890-e89b-12d3-a456-426614174000",
  "content": "Document content to be processed...",
  "metadata": {
    "source": "pdf",
    "author": "John Doe"
  },
  "priority": "normal"
}
```

#### Response

```json
{
  "task_id": "abc123-def456-ghi789",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Task queued successfully"
}
```

### 2. Get Task Progress

**Endpoint**: `GET /api/v1/embedding-tasks/{task_id}`

Retrieves detailed progress information for a specific task.

#### Response

```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "processing",
  "progress": 45,
  "processed_chunks": 45,
  "total_chunks": 100,
  "eta": "2024-01-01T12:30:00Z",
  "created_at": "2024-01-01T12:00:00Z",
  "started_at": "2024-01-01T12:01:00Z",
  "completed_at": null,
  "error_message": null,
  "retry_count": 0
}
```

### 3. Cancel Task

**Endpoint**: `POST /api/v1/embedding-tasks/{task_id}/cancel`

Cancels a pending or processing task.

#### Response

```json
{
  "message": "Task abc123-def456-ghi789 cancelled successfully",
  "task_id": "abc123-def456-ghi789"
}
```

### 4. Get Queue Status

**Endpoint**: `GET /api/v1/embedding-tasks/queue/status`

Returns overall queue statistics and system capacity information.

#### Response

```json
{
  "queue_size": 5,
  "status_counts": {
    "pending": 3,
    "processing": 2,
    "completed": 10,
    "failed": 1,
    "cancelled": 0
  },
  "max_concurrent_tasks": 5,
  "active_tasks": 2
}
```

### 5. Batch Task Creation

**Endpoint**: `POST /api/v1/embedding-tasks/batch`

Creates multiple embedding tasks in a single request.

#### Request

```json
[
  {
    "document_id": "123e4567-e89b-12d3-a456-426614174000",
    "knowledge_base_id": "456e7890-e89b-12d3-a456-426614174000",
    "content": "First document content...",
    "priority": "high"
  },
  {
    "document_id": "789e0123-e89b-12d3-a456-426614174000",
    "knowledge_base_id": "456e7890-e89b-12d3-a456-426614174000",
    "content": "Second document content...",
    "priority": "normal"
  }
]
```

#### Response

```json
{
  "total": 2,
  "queued": 2,
  "failed": 0,
  "tasks": [
    {
      "document_id": "123e4567-e89b-12d3-a456-426614174000",
      "task_id": "task-1",
      "status": "queued"
    },
    {
      "document_id": "789e0123-e89b-12d3-a456-426614174000",
      "task_id": "task-2",
      "status": "queued"
    }
  ]
}
```

## WebSocket Connection

### Endpoint

`ws://localhost:8000/api/v1/ws/embedding-tasks?token={auth_token}`

### Connection Protocol

1. **Authentication**: Pass JWT token as query parameter
2. **Connection**: WebSocket upgrade and connection establishment
3. **Subscription**: Send subscription messages for specific tasks
4. **Updates**: Receive real-time progress updates

### Message Types

#### Client → Server

**Subscribe to Task**:
```json
{
  "action": "subscribe",
  "task_id": "abc123-def456-ghi789"
}
```

**Unsubscribe from Task**:
```json
{
  "action": "unsubscribe",
  "task_id": "abc123-def456-ghi789"
}
```

**Ping**:
```json
{
  "action": "ping"
}
```

**Get Queue Status**:
```json
{
  "action": "get_queue_status"
}
```

#### Server → Client

**Progress Update**:
```json
{
  "type": "progress_update",
  "task_id": "abc123-def456-ghi789",
  "data": {
    "progress": 75,
    "processed_chunks": 75,
    "total_chunks": 100,
    "eta": "2024-01-01T12:30:00Z"
  }
}
```

**Task Completed**:
```json
{
  "type": "task_update",
  "task_id": "abc123-def456-ghi789",
  "data": {
    "type": "completed",
    "chunk_ids": ["chunk-1", "chunk-2", "chunk-3"]
  }
}
```

**Task Failed**:
```json
{
  "type": "task_update",
  "task_id": "abc123-def456-ghi789",
  "data": {
    "type": "failed",
    "error_message": "Rate limit exceeded",
    "retry_count": 3
  }
}
```

## Task Status Values

- **pending**: Task is in the queue waiting to be processed
- **processing**: Task is currently being processed
- **completed**: Task has been successfully completed
- **failed**: Task failed after all retry attempts
- **cancelled**: Task was cancelled by user request

## Priority Levels

Tasks are processed based on priority, with higher priority tasks being processed first:

1. **CRITICAL**: Immediate processing required
2. **HIGH**: Process as soon as possible
3. **NORMAL**: Standard processing priority (default)
4. **LOW**: Process when system is idle

## Configuration

### Environment Variables

```bash
# Maximum concurrent tasks
MAX_CONCURRENT_TASKS=5

# Task timeout in seconds
TASK_TIMEOUT=300

# Retry limit for failed tasks
RETRY_LIMIT=3

# Batch size for embedding generation
EMBEDDING_BATCH_SIZE=50

# Chunk size for text splitting
CHUNK_SIZE=1000

# Chunk overlap for context preservation
CHUNK_OVERLAP=200
```

## Performance Metrics

The system tracks the following metrics:

- **Average Processing Time**: Time taken to process documents
- **Queue Depth**: Number of pending tasks
- **Success Rate**: Percentage of successfully completed tasks
- **Retry Rate**: Percentage of tasks requiring retries
- **Throughput**: Documents processed per minute

## Error Handling

### Automatic Retries

Failed tasks are automatically retried with exponential backoff:
- First retry: 2 seconds delay
- Second retry: 4 seconds delay
- Third retry: 8 seconds delay

### Error Types

1. **Rate Limit Errors**: OpenAI API rate limits
2. **API Timeout**: Request timeout errors
3. **Invalid API Key**: Authentication failures
4. **Processing Errors**: Document parsing or chunking failures

## Best Practices

1. **Document Size**: For documents larger than 10MB, consider splitting them before submission
2. **Batch Processing**: Use batch endpoints for multiple documents
3. **Priority Assignment**: Reserve HIGH and CRITICAL priorities for time-sensitive tasks
4. **Progress Monitoring**: Use WebSocket connections for real-time updates on long-running tasks
5. **Error Recovery**: Implement client-side retry logic for failed tasks

## Example Usage

### Python Client

```python
import asyncio
import aiohttp
import json

async def process_document():
    # Create embedding task
    async with aiohttp.ClientSession() as session:
        # Submit task
        async with session.post(
            "http://localhost:8000/api/v1/embedding-tasks/",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "document_id": document_id,
                "knowledge_base_id": kb_id,
                "content": document_content,
                "priority": "high"
            }
        ) as response:
            result = await response.json()
            task_id = result["task_id"]
        
        # Monitor progress
        while True:
            async with session.get(
                f"http://localhost:8000/api/v1/embedding-tasks/{task_id}",
                headers={"Authorization": f"Bearer {token}"}
            ) as response:
                progress = await response.json()
                print(f"Progress: {progress['progress']}%")
                
                if progress["status"] in ["completed", "failed"]:
                    break
            
            await asyncio.sleep(2)
        
        return progress

# Run
result = asyncio.run(process_document())
```

### JavaScript WebSocket Client

```javascript
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/embedding-tasks?token=${token}`);

ws.onopen = () => {
    console.log('Connected to WebSocket');
    
    // Subscribe to task
    ws.send(JSON.stringify({
        action: 'subscribe',
        task_id: 'abc123-def456-ghi789'
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'progress_update') {
        console.log(`Progress: ${data.data.progress}%`);
    } else if (data.type === 'task_update' && data.data.type === 'completed') {
        console.log('Task completed!');
        ws.close();
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};
```

## Testing

Run the test suite:

```bash
# Run embedding task tests
docker exec -it arketic-api-1 python -m pytest apps/api/tests/test_embedding_tasks.py -v

# Run integration tests
docker exec -it arketic-api-1 python apps/api/tests/test_embedding_integration.py
```

## Monitoring

Monitor system performance using the metrics endpoint:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/metrics/embedding-tasks
```

## Troubleshooting

### Common Issues

1. **Tasks stuck in PENDING**: Check if background workers are running
2. **High retry rates**: Verify OpenAI API key and rate limits
3. **WebSocket disconnections**: Check network stability and token expiration
4. **Memory issues**: Reduce batch size for large documents

### Debug Logging

Enable debug logging for detailed task processing information:

```python
import logging
logging.getLogger("services.embedding_task_service").setLevel(logging.DEBUG)
```