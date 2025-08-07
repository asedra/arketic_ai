# Arketic Knowledge Management Service - API Documentation

## Overview

This document provides comprehensive documentation for the Knowledge Management API endpoints in the Arketic platform. The service enables document management, semantic search, RAG (Retrieval Augmented Generation) queries, and collection management using PGVector for embeddings and LangChain for document processing.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication**: JWT Bearer Token  
**Key Technologies**: 
- PGVector for semantic search
- LangChain for document processing
- PostgreSQL for data persistence
- OpenAI/Anthropic for embeddings and RAG

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Document Management Endpoints](#document-management-endpoints)
3. [Search & Retrieval Endpoints](#search--retrieval-endpoints)
4. [Collection Management Endpoints](#collection-management-endpoints)
5. [Request/Response Schemas](#requestresponse-schemas)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Integration Features](#integration-features)
9. [Examples](#examples)

---

## Authentication Requirements

All endpoints require JWT Bearer token authentication.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**JWT Payload Structure**:
```json
{
  "user_id": "42c9a688-e24a-4cd6-b5e2-4e77f1894a6b",
  "sub": "user@arketic.com",
  "email": "user@arketic.com",
  "exp": 1704123456,
  "iat": 1704119856,
  "roles": ["user"],
  "permissions": ["read", "write"]
}
```

---

## Document Management Endpoints

### 1. Upload Document (Text)

**Endpoint**: `POST /api/v1/knowledge/upload`  
**Summary**: Upload text content as a document  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "knowledge_base_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Python Programming Guide",
  "content": "Python is a high-level programming language...",
  "source_type": "text",
  "metadata": {
    "category": "programming",
    "language": "python",
    "tags": ["tutorial", "basics"]
  }
}
```

**Field Descriptions**:
- `knowledge_base_id` (required): UUID of the knowledge base
- `title` (required): Document title (max 500 chars)
- `content` (required): Document content (max 1MB)
- `source_type`: Type of source ("text", "url", "api")
- `metadata`: Additional metadata as JSON object

**Successful Response (201)**:
```json
{
  "document_id": "456e7890-e89b-12d3-a456-426614174000",
  "chunk_ids": ["chunk-1", "chunk-2", "chunk-3"],
  "chunk_count": 3,
  "token_count": 450,
  "processing_time_ms": 234.5,
  "status": "completed"
}
```

**Responses**:
- **201 Created**: Document uploaded successfully
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing token
- **413 Payload Too Large**: Content exceeds size limit
- **500 Internal Server Error**: Processing failed

---

### 2. Upload Document (File)

**Endpoint**: `POST /api/v1/knowledge/upload/file`  
**Summary**: Upload a file as a document  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Form Data**:
- `knowledge_base_id`: UUID of the knowledge base
- `file`: File upload (PDF, TXT, MD, DOCX)

**Supported File Types**:
- PDF (.pdf) - Max 50MB
- Text (.txt) - Max 10MB
- Markdown (.md) - Max 10MB
- Word (.docx) - Max 50MB

**Successful Response (201)**:
```json
{
  "document_id": "789e0123-e89b-12d3-a456-426614174000",
  "chunk_ids": ["chunk-1", "chunk-2"],
  "chunk_count": 2,
  "token_count": 320,
  "processing_time_ms": 567.8,
  "status": "completed",
  "file_info": {
    "filename": "document.pdf",
    "file_type": "pdf",
    "file_size": 1024567
  }
}
```

**Responses**:
- **201 Created**: File uploaded successfully
- **400 Bad Request**: Unsupported file type
- **401 Unauthorized**: Invalid or missing token
- **413 Payload Too Large**: File exceeds size limit
- **500 Internal Server Error**: Processing failed

---

### 3. List Documents

**Endpoint**: `GET /api/v1/knowledge/list`  
**Summary**: List all documents in a knowledge base  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `knowledge_base_id`: UUID of the knowledge base (required)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort_by`: Sort field ("created_at", "updated_at", "title")
- `sort_order`: Sort order ("asc", "desc")
- `search`: Search in title and content
- `source_type`: Filter by source type
- `status`: Filter by processing status

**Successful Response (200)**:
```json
{
  "documents": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Python Programming Guide",
      "source_type": "text",
      "file_name": null,
      "file_type": null,
      "chunk_count": 3,
      "token_count": 450,
      "processing_status": "completed",
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z",
      "metadata": {
        "category": "programming"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Responses**:
- **200 OK**: Documents retrieved successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Knowledge base not found

---

### 4. Get Document Details

**Endpoint**: `GET /api/v1/knowledge/:id`  
**Summary**: Get detailed information about a document  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `id`: UUID of the document

**Successful Response (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "knowledge_base_id": "base-123",
  "title": "Python Programming Guide",
  "content": "Full document content...",
  "source_type": "text",
  "source_url": null,
  "file_name": null,
  "file_type": null,
  "file_size": null,
  "chunk_count": 3,
  "token_count": 450,
  "processing_status": "completed",
  "error_message": null,
  "tags": ["python", "programming"],
  "metadata": {
    "category": "programming",
    "language": "python"
  },
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z",
  "processed_at": "2024-01-01T12:00:05Z",
  "chunks": [
    {
      "id": "chunk-1",
      "chunk_index": 0,
      "content": "Chunk content...",
      "token_count": 150
    }
  ]
}
```

**Responses**:
- **200 OK**: Document details retrieved
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Document not found

---

### 5. Delete Document

**Endpoint**: `DELETE /api/v1/knowledge/:id`  
**Summary**: Delete a document and all its embeddings  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `id`: UUID of the document

**Successful Response (200)**:
```json
{
  "message": "Document deleted successfully",
  "document_id": "123e4567-e89b-12d3-a456-426614174000",
  "chunks_deleted": 3
}
```

**Responses**:
- **200 OK**: Document deleted successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Document not found
- **403 Forbidden**: No permission to delete

---

## Search & Retrieval Endpoints

### 6. Semantic Search

**Endpoint**: `POST /api/v1/knowledge/search`  
**Summary**: Perform semantic search using vector similarity  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "query": "Python programming features",
  "knowledge_base_id": "123e4567-e89b-12d3-a456-426614174000",
  "k": 5,
  "score_threshold": 0.7,
  "search_type": "semantic",
  "filters": {
    "category": "programming",
    "created_after": "2024-01-01"
  }
}
```

**Field Descriptions**:
- `query` (required): Search query (max 1000 chars)
- `knowledge_base_id`: Limit search to specific knowledge base
- `k`: Number of results to return (default: 5, max: 50)
- `score_threshold`: Minimum similarity score (0-1, default: 0.7)
- `search_type`: Type of search ("semantic", "keyword", "hybrid")
- `filters`: Additional filters as JSON object

**Successful Response (200)**:
```json
{
  "query": "Python programming features",
  "results": [
    {
      "content": "Python supports multiple programming paradigms...",
      "score": 0.92,
      "document_id": "123e4567-e89b-12d3-a456-426614174000",
      "document_title": "Python Programming Guide",
      "chunk_index": 1,
      "metadata": {
        "category": "programming"
      }
    }
  ],
  "search_type": "semantic",
  "execution_time_ms": 125.4,
  "total_results": 5
}
```

**Responses**:
- **200 OK**: Search completed successfully
- **400 Bad Request**: Invalid query parameters
- **401 Unauthorized**: Invalid or missing token
- **500 Internal Server Error**: Search failed

---

### 7. RAG Query

**Endpoint**: `POST /api/v1/knowledge/query`  
**Summary**: Perform Retrieval Augmented Generation query  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
x-api-key: <openai_or_anthropic_api_key> (optional)
```

**Request Body**:
```json
{
  "query": "What are the key features of Python?",
  "knowledge_base_id": "123e4567-e89b-12d3-a456-426614174000",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 500,
  "include_sources": true,
  "k": 5,
  "system_prompt": "You are a helpful programming assistant."
}
```

**Field Descriptions**:
- `query` (required): Question to answer
- `knowledge_base_id` (required): Knowledge base to search
- `model`: LLM model to use (default: "gpt-3.5-turbo")
- `temperature`: Creativity level (0-2, default: 0.7)
- `max_tokens`: Max response tokens (default: 500)
- `include_sources`: Include source documents (default: true)
- `k`: Number of documents to retrieve (default: 5)
- `system_prompt`: Custom system prompt

**Successful Response (200)**:
```json
{
  "query": "What are the key features of Python?",
  "answer": "Python has several key features:\n1. Simple and readable syntax\n2. Dynamic typing\n3. Extensive standard library\n4. Cross-platform compatibility\n5. Support for multiple programming paradigms",
  "sources": [
    {
      "document_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Python Programming Guide",
      "content": "Relevant excerpt...",
      "score": 0.92
    }
  ],
  "model_used": "gpt-3.5-turbo",
  "tokens_used": {
    "prompt": 450,
    "completion": 120,
    "total": 570
  },
  "execution_time_ms": 1234.5
}
```

**Responses**:
- **200 OK**: Query answered successfully
- **400 Bad Request**: Invalid parameters or missing API key
- **401 Unauthorized**: Invalid or missing token
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Query failed

---

### 8. Find Similar Documents

**Endpoint**: `GET /api/v1/knowledge/similar/:id`  
**Summary**: Find documents similar to a given document  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `id`: UUID of the reference document

**Query Parameters**:
- `k`: Number of similar documents (default: 5, max: 20)
- `score_threshold`: Minimum similarity score (default: 0.5)

**Successful Response (200)**:
```json
{
  "reference_document": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Python Programming Guide"
  },
  "similar_documents": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "title": "Python Advanced Topics",
      "similarity_score": 0.89,
      "chunk_overlap": 5,
      "metadata": {
        "category": "programming"
      }
    }
  ],
  "total_found": 3
}
```

**Responses**:
- **200 OK**: Similar documents found
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Reference document not found

---

## Collection Management Endpoints

### 9. Create Collection

**Endpoint**: `POST /api/v1/collections`  
**Summary**: Create a new document collection  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Python Tutorials",
  "description": "Collection of Python programming tutorials",
  "type": "documentation",
  "is_public": false,
  "embedding_model": "text-embedding-3-small",
  "metadata": {
    "category": "education",
    "level": "beginner"
  }
}
```

**Field Descriptions**:
- `name` (required): Collection name (max 200 chars)
- `description`: Collection description
- `type`: Collection type ("documentation", "faq", "product", "general", "custom")
- `is_public`: Make collection publicly accessible (default: false)
- `embedding_model`: Model for embeddings (default: "text-embedding-3-small")
- `metadata`: Additional metadata as JSON

**Successful Response (201)**:
```json
{
  "collection_id": "coll-123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Tutorials",
  "type": "documentation",
  "is_public": false,
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **201 Created**: Collection created successfully
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing token
- **409 Conflict**: Collection name already exists

---

### 10. List Collections

**Endpoint**: `GET /api/v1/collections`  
**Summary**: List all accessible collections  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by collection type
- `is_public`: Filter by public status
- `search`: Search in name and description

**Successful Response (200)**:
```json
{
  "collections": [
    {
      "id": "coll-123e4567-e89b-12d3-a456-426614174000",
      "name": "Python Tutorials",
      "description": "Collection of Python programming tutorials",
      "type": "documentation",
      "is_public": false,
      "is_active": true,
      "total_documents": 15,
      "total_chunks": 145,
      "total_tokens": 12500,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1
  }
}
```

**Responses**:
- **200 OK**: Collections retrieved successfully
- **401 Unauthorized**: Invalid or missing token

---

### 11. Update Collection

**Endpoint**: `PUT /api/v1/collections/:id`  
**Summary**: Update collection properties  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**URL Parameters**:
- `id`: UUID of the collection

**Request Body**:
```json
{
  "name": "Python Advanced Tutorials",
  "description": "Updated collection description",
  "is_public": true,
  "metadata": {
    "category": "education",
    "level": "advanced",
    "updated": true
  }
}
```

**Successful Response (200)**:
```json
{
  "collection_id": "coll-123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Advanced Tutorials",
  "updated_at": "2024-01-01T13:00:00Z"
}
```

**Responses**:
- **200 OK**: Collection updated successfully
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Collection not found
- **403 Forbidden**: No permission to update

---

### 12. Delete Collection

**Endpoint**: `DELETE /api/v1/collections/:id`  
**Summary**: Delete a collection and optionally its documents  
**Authentication**: **Required**  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `id`: UUID of the collection

**Query Parameters**:
- `cascade`: Delete all documents in collection (default: false)

**Successful Response (200)**:
```json
{
  "message": "Collection deleted successfully",
  "collection_id": "coll-123e4567-e89b-12d3-a456-426614174000",
  "documents_deleted": 0
}
```

**Responses**:
- **200 OK**: Collection deleted successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Collection not found
- **403 Forbidden**: No permission to delete

---

## Request/Response Schemas

### Document Upload Schema

```typescript
interface DocumentUploadRequest {
  knowledge_base_id: string;  // UUID
  title: string;              // Max 500 chars
  content: string;            // Max 1MB
  source_type: 'text' | 'url' | 'file' | 'api';
  metadata?: Record<string, any>;
}

interface DocumentUploadResponse {
  document_id: string;        // UUID
  chunk_ids: string[];
  chunk_count: number;
  token_count: number;
  processing_time_ms: number;
  status: 'completed' | 'failed';
}
```

### Search Request Schema

```typescript
interface SearchRequest {
  query: string;              // Max 1000 chars
  knowledge_base_id?: string; // UUID
  k?: number;                 // 1-50, default 5
  score_threshold?: number;   // 0-1, default 0.7
  search_type?: 'semantic' | 'keyword' | 'hybrid';
  filters?: Record<string, any>;
}

interface SearchResult {
  content: string;
  score: number;
  document_id: string;
  document_title: string;
  chunk_index: number;
  metadata: Record<string, any>;
}
```

### RAG Query Schema

```typescript
interface RAGQueryRequest {
  query: string;
  knowledge_base_id: string;
  model?: string;             // Default: gpt-3.5-turbo
  temperature?: number;       // 0-2, default 0.7
  max_tokens?: number;        // Default: 500
  include_sources?: boolean;  // Default: true
  k?: number;                 // Default: 5
  system_prompt?: string;
}

interface RAGQueryResponse {
  query: string;
  answer: string;
  sources?: DocumentSource[];
  model_used: string;
  tokens_used: TokenUsage;
  execution_time_ms: number;
}
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)",
    "field": "Field that caused the error (optional)"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `UNAUTHORIZED` | Invalid or missing JWT token | 401 |
| `FORBIDDEN` | Access denied | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource already exists | 409 |
| `PAYLOAD_TOO_LARGE` | Request size exceeds limit | 413 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `PROCESSING_ERROR` | Document processing failed | 500 |
| `VECTOR_DB_ERROR` | PGVector operation failed | 500 |
| `INTERNAL_ERROR` | Internal server error | 500 |

---

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Document Upload | 10 requests | per minute |
| Search | 60 requests | per minute |
| RAG Query | 20 requests | per minute |
| Collection Management | 30 requests | per minute |
| Document List/Get | 100 requests | per minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704120000
```

### Rate Limit Response (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "retry_after": 30
  }
}
```

---

## Integration Features

### PGVector Configuration

The Knowledge Management API uses PGVector for semantic search:

```sql
-- Vector configuration
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for fast similarity search
CREATE INDEX idx_embedding_vector_hnsw 
ON knowledge_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Embedding Models

Supported embedding models:
- **OpenAI**: text-embedding-3-small (1536 dimensions)
- **OpenAI**: text-embedding-3-large (3072 dimensions)
- **OpenAI**: text-embedding-ada-002 (1536 dimensions)

### Document Processing

Documents are processed using LangChain:
1. **Text Extraction**: Extract text from various file formats
2. **Chunking**: Split into optimal chunk sizes (default: 1000 tokens)
3. **Embedding**: Generate vector embeddings for each chunk
4. **Storage**: Store in PGVector with metadata

### Chunking Strategies

- **Fixed Size**: Fixed token count per chunk
- **Semantic**: Split at semantic boundaries
- **Recursive**: Hierarchical splitting with overlap

---

## Examples

### Example 1: Complete Document Upload and Search Flow

```bash
# 1. Authenticate
TOKEN="your_jwt_token"
KB_ID="123e4567-e89b-12d3-a456-426614174000"

# 2. Upload a document
curl -X POST http://localhost:8000/api/v1/knowledge/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "knowledge_base_id": "'$KB_ID'",
    "title": "Python Basics",
    "content": "Python is a versatile programming language...",
    "source_type": "text"
  }'

# 3. Search for documents
curl -X POST http://localhost:8000/api/v1/knowledge/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Python programming",
    "knowledge_base_id": "'$KB_ID'",
    "k": 5
  }'

# 4. Perform RAG query
curl -X POST http://localhost:8000/api/v1/knowledge/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-your-openai-key" \
  -d '{
    "query": "What makes Python good for beginners?",
    "knowledge_base_id": "'$KB_ID'",
    "model": "gpt-3.5-turbo"
  }'
```

### Example 2: File Upload

```bash
curl -X POST http://localhost:8000/api/v1/knowledge/upload/file \
  -H "Authorization: Bearer $TOKEN" \
  -F "knowledge_base_id=$KB_ID" \
  -F "file=@document.pdf"
```

### Example 3: Collection Management

```bash
# Create collection
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technical Documentation",
    "description": "Company technical docs",
    "type": "documentation"
  }'

# List collections
curl -X GET http://localhost:8000/api/v1/collections \
  -H "Authorization: Bearer $TOKEN"

# Update collection
curl -X PUT http://localhost:8000/api/v1/collections/$COLLECTION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Documentation",
    "is_public": true
  }'

# Delete collection
curl -X DELETE http://localhost:8000/api/v1/collections/$COLLECTION_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Example 4: Python Client

```python
import requests
import json

class KnowledgeClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def upload_document(self, kb_id, title, content):
        response = requests.post(
            f"{self.base_url}/api/v1/knowledge/upload",
            headers=self.headers,
            json={
                "knowledge_base_id": kb_id,
                "title": title,
                "content": content,
                "source_type": "text"
            }
        )
        return response.json()
    
    def search(self, query, kb_id=None, k=5):
        response = requests.post(
            f"{self.base_url}/api/v1/knowledge/search",
            headers=self.headers,
            json={
                "query": query,
                "knowledge_base_id": kb_id,
                "k": k
            }
        )
        return response.json()
    
    def rag_query(self, query, kb_id, api_key):
        headers = {**self.headers, "x-api-key": api_key}
        response = requests.post(
            f"{self.base_url}/api/v1/knowledge/query",
            headers=headers,
            json={
                "query": query,
                "knowledge_base_id": kb_id
            }
        )
        return response.json()

# Usage
client = KnowledgeClient("http://localhost:8000", "your_token")
result = client.search("Python programming", kb_id="123...")
print(result)
```

---

## Performance Considerations

### Optimization Tips

1. **Chunk Size**: Optimize chunk size based on content type
   - Technical docs: 500-1000 tokens
   - Narrative content: 1000-1500 tokens
   - Code: 200-500 tokens

2. **Embedding Cache**: Frequently accessed documents are cached

3. **Batch Operations**: Use batch upload for multiple documents

4. **Index Tuning**: HNSW parameters can be adjusted:
   ```sql
   -- For higher accuracy (slower)
   SET hnsw.ef_search = 100;
   
   -- For faster search (lower accuracy)
   SET hnsw.ef_search = 40;
   ```

5. **Connection Pooling**: API uses connection pooling for database

### Performance Metrics

Typical response times:
- Document upload: 200-500ms per MB
- Semantic search: 50-150ms
- RAG query: 1-3 seconds
- Collection operations: 20-50ms

---

## Security Best Practices

1. **API Key Management**
   - Store LLM API keys securely
   - Rotate keys regularly
   - Use environment variables

2. **Input Validation**
   - Sanitize all user inputs
   - Enforce size limits
   - Validate file types

3. **Access Control**
   - Use JWT with short expiration
   - Implement role-based access
   - Audit document access

4. **Data Protection**
   - Encrypt sensitive documents
   - Implement data retention policies
   - Regular backups

---

## Deployment Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/arketic
DATABASE_POOL_SIZE=20

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_HOURS=1

# LLM Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# PGVector Configuration
PGVECTOR_DIMENSIONS=1536
PGVECTOR_INDEX_TYPE=hnsw

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_SEARCH=60
RATE_LIMIT_QUERY=20

# File Upload
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,txt,md,docx

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Database Migrations

Ensure the PGVector extension and tables are created:

```bash
# Run migrations
alembic upgrade head

# Specifically for PGVector
alembic upgrade 005_add_pgvector_extension
```

---

## Support & Resources

- **API Testing Script**: `/apps/api/docs/knowledge_test.py`
- **Database Schema**: `/apps/api/migrations/versions/005_add_pgvector_extension.py`
- **PGVector Service**: `/apps/api/services/pgvector_service.py`
- **Issue Tracking**: GitHub Issues
- **Documentation Updates**: Submit PRs to `/apps/api/docs/api/`

For additional support or questions about the Knowledge Management API, please contact the development team.