# Arketic AI Services Implementation

This document describes the implementation of AI services for the Arketic backend, including OpenAI integration, vector search, and document processing capabilities.

## Overview

The AI services implementation includes three main components:

1. **AI Assistant Router** (`/api/v1/ai`) - OpenAI chat completions with streaming support
2. **Vector Search Router** (`/api/v1/vector`) - Text embeddings and similarity search
3. **Document Processing Router** (`/api/v1/documents`) - File upload, text extraction, and AI analysis

## Quick Start

### 1. Configure OpenAI API Key

First, start the Settings API:

```bash
python3 settings_api.py
```

Then configure your OpenAI API key by visiting http://localhost:8001 or using the API:

```bash
curl -X POST "http://localhost:8001/api/v1/settings/openai" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-your-openai-api-key-here",
    "model": "gpt-3.5-turbo",
    "max_tokens": 1000,
    "temperature": 0.7
  }'
```

### 2. Start the AI Backend

```bash
python3 start_server.py
```

The server will start at http://localhost:8000 with API documentation at http://localhost:8000/api/docs

## AI Assistant Features

### Chat Completions

**Endpoint:** `POST /api/v1/ai/chat/completions`

```bash
curl -X POST "http://localhost:8000/api/v1/ai/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello! How can you help me?"}
    ],
    "model": "gpt-3.5-turbo",
    "max_tokens": 500,
    "temperature": 0.7
  }'
```

### Streaming Chat Completions

**Endpoint:** `POST /api/v1/ai/chat/completions/stream`

Returns Server-Sent Events (SSE) for real-time streaming responses.

### Cost Estimation

**Endpoint:** `POST /api/v1/ai/cost/estimate`

Estimate the cost of a chat completion request before making it:

```bash
curl -X POST "http://localhost:8000/api/v1/ai/cost/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a detailed essay about artificial intelligence"}
    ],
    "model": "gpt-4",
    "max_tokens": 2000
  }'
```

### Available Models

**Endpoint:** `GET /api/v1/ai/models`

List all available OpenAI models.

## Vector Search Features

### Text Embeddings

**Endpoint:** `POST /api/v1/vector/embed`

```bash
curl -X POST "http://localhost:8000/api/v1/vector/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Hello world", "OpenAI embeddings"],
    "model": "text-embedding-3-small"
  }'
```

### Document Ingestion

**Endpoint:** `POST /api/v1/vector/ingest`

Ingest documents into a vector store for similarity search:

```bash
curl -X POST "http://localhost:8000/api/v1/vector/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "content": "This is a sample document about AI.",
        "metadata": {"title": "AI Overview", "author": "John Doe"}
      }
    ],
    "collection": "my-documents",
    "chunk_size": 1000,
    "overlap": 200
  }'
```

### Vector Search

**Endpoint:** `POST /api/v1/vector/search`

```bash
curl -X POST "http://localhost:8000/api/v1/vector/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence",
    "collection": "my-documents",
    "limit": 5,
    "threshold": 0.7
  }'
```

### Collections Management

- `GET /api/v1/vector/collections` - List all collections
- `GET /api/v1/vector/collections/{collection_name}/stats` - Get collection statistics
- `DELETE /api/v1/vector/collections/{collection_name}` - Delete a collection

## Document Processing Features

### Supported Formats

**Endpoint:** `GET /api/v1/documents/formats`

The system supports:
- PDF files (.pdf)
- Word documents (.docx)
- Plain text (.txt, .md)
- HTML files (.html, .htm)
- CSV files (.csv)

### Document Upload

**Endpoint:** `POST /api/v1/documents/upload`

```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -F "file=@document.pdf" \
  -F "extract_text=true"
```

### Text Extraction

**Endpoint:** `POST /api/v1/documents/extract`

```bash
curl -X POST "http://localhost:8000/api/v1/documents/extract" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "abc123_1234567890",
    "extract_metadata": true,
    "preserve_formatting": false
  }'
```

### AI Document Analysis

**Endpoint:** `POST /api/v1/documents/analyze`

```bash
curl -X POST "http://localhost:8000/api/v1/documents/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "abc123_1234567890",
    "analysis_types": ["summary", "keywords", "sentiment"]
  }'
```

Available analysis types:
- `summary` - Generate a concise summary
- `keywords` - Extract key terms and phrases
- `sentiment` - Analyze sentiment with score
- `topics` - Identify main topics
- `entities` - Extract named entities
- `language` - Detect language and formality
- `readability` - Assess readability level

### Document Management

- `GET /api/v1/documents/list` - List all uploaded documents
- `GET /api/v1/documents/documents/{document_id}` - Get document info
- `DELETE /api/v1/documents/documents/{document_id}` - Delete a document

## Cost Tracking

All API calls are automatically logged with usage and cost information in `api_usage.log`. This includes:

- Timestamp
- Model used
- Token usage
- Estimated cost
- Request type

Costs are calculated based on current OpenAI pricing:

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| gpt-4 | $0.03 | $0.06 |
| gpt-4-turbo | $0.01 | $0.03 |
| gpt-4o | $0.005 | $0.015 |
| gpt-3.5-turbo | $0.0015 | $0.002 |
| text-embedding-3-small | $0.00002 | - |

## Data Storage

### Vector Store
Vectors are stored in SQLite database (`vector_store.db`) with the following schema:
- Document content and metadata
- Embeddings (as binary pickled arrays)
- Collection organization
- Timestamps

### Document Store
Uploaded documents are stored in the `document_storage/` directory with metadata in `documents.json`.

### Settings
User settings (including API keys) are stored in `user_settings.json`.

## Security Considerations

1. **API Key Storage**: API keys are stored locally and masked in API responses
2. **File Upload Limits**: 10MB maximum file size
3. **Rate Limiting**: Built-in request validation and limits
4. **Input Validation**: Comprehensive validation for all endpoints
5. **Content Filtering**: Support for content filtering (configurable)

## Error Handling

The system provides comprehensive error handling:

- **400 Bad Request**: Invalid input parameters
- **401 Unauthorized**: Missing or invalid API key
- **404 Not Found**: Document or collection not found
- **413 Payload Too Large**: File size exceeds limits
- **415 Unsupported Media Type**: Unsupported file format
- **422 Unprocessable Entity**: Processing failed
- **500 Internal Server Error**: Server-side errors

## Configuration

The system can be configured through environment variables or the Settings API:

- `OPENAI_API_KEY`: Your OpenAI API key
- `MAX_FILE_SIZE`: Maximum upload size (default: 10MB)
- `VECTOR_STORE_PATH`: Path for vector database
- `DOCUMENT_STORAGE_PATH`: Path for document storage

## Development

### Dependencies

Key Python packages:
```bash
pip install fastapi uvicorn httpx pydantic
pip install beautifulsoup4 PyPDF2 python-docx pandas
```

### Testing

Run the test script to verify all components:
```bash
python3 test_routers_final.py
```

### File Structure

```
backend/
├── routers/
│   ├── ai_assistant.py      # OpenAI chat completions
│   ├── vector_search.py     # Embeddings and search
│   └── document_processing.py # File upload and analysis
├── settings_api.py          # Settings management API
├── start_server.py          # Server startup script
├── user_settings.json       # User configuration
├── vector_store.db          # Vector database
├── document_storage/        # Uploaded files
├── api_usage.log           # Usage tracking
└── AI_SERVICES_README.md   # This documentation
```

## Integration Examples

### Chat with Document Analysis

1. Upload a document
2. Extract and analyze the text
3. Use the analysis in chat completions

### Semantic Search Pipeline

1. Ingest documents into vector store
2. Perform similarity search on user queries
3. Use search results to provide context for AI responses

### Content Processing Workflow

1. Upload multiple documents
2. Extract text and generate embeddings
3. Perform batch analysis
4. Create summaries and insights

## Performance Optimization

- Embedding caching to avoid duplicate API calls
- Chunked document processing for large files
- Background task processing for usage logging
- Efficient vector similarity calculations
- SQLite indexing for fast searches

## Monitoring and Logging

All operations are logged with:
- Request/response times
- Token usage and costs
- Error rates and types
- User activity patterns

This comprehensive AI services implementation provides a solid foundation for building intelligent applications with document processing, semantic search, and conversational AI capabilities.
