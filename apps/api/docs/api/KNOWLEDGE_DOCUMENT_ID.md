# Knowledge API - Document ID Filtering

## Overview

The Knowledge Management API now supports filtering search and RAG queries by specific document IDs. This allows for more targeted searches within individual documents rather than searching across entire knowledge bases.

## Updated Endpoints

### 1. Semantic Search with Document ID

**Endpoint:** `POST /api/v1/knowledge/search`

**New Parameter:**
- `document_id` (UUID, optional): Filter search to a specific document

**Request Example:**
```json
{
  "query": "Python programming",
  "document_id": "962ae3be-93f0-4a74-8528-420374057b8e",
  "k": 5,
  "score_threshold": 0.5,
  "search_type": "semantic"
}
```

**Use Cases:**
- Search within a specific document for relevant content
- Find specific sections within a large document
- Limit search scope for better performance and relevance

### 2. RAG Query with Document ID

**Endpoint:** `POST /api/v1/knowledge/query`

**New Parameter:**
- `document_id` (UUID, optional): Limit RAG context to a specific document

**Request Example:**
```json
{
  "query": "What is Python used for?",
  "document_id": "962ae3be-93f0-4a74-8528-420374057b8e",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 500,
  "include_sources": true,
  "k": 3
}
```

**Use Cases:**
- Generate answers based on content from a specific document
- Create document-specific summaries or insights
- Ensure responses are grounded in specific source material

## Parameter Combinations

Both endpoints support flexible parameter combinations:

1. **Document-only search:**
   - Provide only `document_id`
   - Searches within the specified document

2. **Knowledge base + Document:**
   - Provide both `knowledge_base_id` and `document_id`
   - Ensures the document belongs to the specified knowledge base
   - Most restrictive search scope

3. **Knowledge base only:**
   - Provide only `knowledge_base_id`
   - Searches across all documents in the knowledge base
   - Previous default behavior

4. **No filters:**
   - Omit both parameters
   - Searches across all accessible documents
   - Broadest search scope

## Access Control

When using `document_id`, the system automatically verifies:
- The document exists
- The user has access to the document (either owns it or it's public)
- Returns 404 if document not found or access denied

## Implementation Details

### Schema Updates
- Added `document_id: Optional[UUID]` to `SearchRequest` schema
- Added `document_id: Optional[UUID]` to `RAGQueryRequest` schema

### Service Layer
- `knowledge_service.semantic_search()` now accepts `document_id` parameter
- `knowledge_service.rag_query()` now accepts `document_id` parameter
- Added `_verify_document_access()` method for access control
- Filters are passed to `pgvector_service` for vector similarity search

### PGVector Integration
- Updated filter handling to recognize `document_id` as a column filter
- Filters on `document_id` column directly in SQL query
- Maintains compatibility with existing metadata filters

## Error Handling

### Document Not Found
**Status Code:** 404
**Response:**
```json
{
  "detail": "Document not found or access denied"
}
```

### Invalid Document ID Format
**Status Code:** 422
**Response:**
```json
{
  "detail": "Invalid UUID format for document_id"
}
```

## Performance Considerations

- Filtering by `document_id` improves query performance by reducing search scope
- Ideal for large knowledge bases with many documents
- Reduces token usage in RAG queries by limiting context

## Testing

A comprehensive test suite is available at:
`/apps/api/tests/test_knowledge_document_id.py`

Test coverage includes:
- Search within specific documents
- RAG queries with document filtering
- Access control validation
- Error handling for invalid document IDs
- Parameter combination testing

## Migration Notes

This feature is backward compatible:
- Existing API calls without `document_id` continue to work
- No changes required for existing integrations
- Optional parameter can be adopted gradually

## Example Usage

### Python Client
```python
import httpx

# Search within a specific document
response = httpx.post(
    "http://localhost:8000/api/v1/knowledge/search",
    headers={"Authorization": f"Bearer {token}"},
    json={
        "query": "machine learning algorithms",
        "document_id": "b361c14b-8a3f-464f-b217-028b486eb7b5",
        "k": 5
    }
)

# RAG query on specific document
response = httpx.post(
    "http://localhost:8000/api/v1/knowledge/query",
    headers={
        "Authorization": f"Bearer {token}",
        "x-api-key": api_key
    },
    json={
        "query": "Explain the main concepts",
        "document_id": "b361c14b-8a3f-464f-b217-028b486eb7b5",
        "model": "gpt-3.5-turbo",
        "include_sources": True
    }
)
```

### TypeScript/JavaScript Client
```typescript
// Search within specific document
const searchResponse = await fetch('/api/v1/knowledge/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'machine learning algorithms',
    document_id: 'b361c14b-8a3f-464f-b217-028b486eb7b5',
    k: 5
  })
});

// RAG query on specific document
const ragResponse = await fetch('/api/v1/knowledge/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Explain the main concepts',
    document_id: 'b361c14b-8a3f-464f-b217-028b486eb7b5',
    model: 'gpt-3.5-turbo',
    include_sources: true
  })
});
```

## Related Documentation

- [Knowledge Management API](./KNOWLEDGE.md) - Main knowledge API documentation
- [Search API Reference](./SEARCH.md) - Detailed search functionality
- [RAG Integration](./RAG.md) - Retrieval Augmented Generation details