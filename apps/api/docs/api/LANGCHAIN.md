# Arketic LangChain Service - API Documentation

## Overview

This document provides comprehensive documentation for the LangChain Service API endpoints in the Arketic platform. The service enables AI-powered chat conversations using LangChain integration with support for multiple LLM providers (OpenAI, Anthropic), caching, conversation management, and comprehensive monitoring.

**Base URL**: `http://localhost:3001`  
**Default Port**: `3001` (The LangChain service always runs on port 3001)  
**API Version**: v1  
**Authentication Methods**: 
- JWT Bearer Token (for public endpoints)
- Internal Service Key (for service-to-service communication)

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Health & Monitoring Endpoints](#health--monitoring-endpoints)
3. [Chat Processing Endpoints](#chat-processing-endpoints)
4. [Conversation Management](#conversation-management)
5. [Provider Testing](#provider-testing)
6. [Internal Service Endpoints](#internal-service-endpoints)
7. [Request/Response Schemas](#requestresponse-schemas)
8. [Error Handling](#error-handling)
9. [Integration Features](#integration-features)
10. [Examples](#examples)

---

## Authentication Requirements

### JWT Bearer Token

Most endpoints require authentication using JWT Bearer tokens.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**JWT Payload Structure**:
```json
{
  "user_id": "user-123",
  "sub": "user-123",
  "email": "user@arketic.com",
  "exp": 1704123456,
  "iat": 1704119856,
  "roles": ["user"],
  "permissions": ["read", "write"]
}
```

### Internal Service Authentication

Internal endpoints use service-to-service authentication.

**Required Headers**:
```
x-internal-service-key: <service_key>
x-user-id: <user_id>
x-api-key: <llm_api_key>
```

---

## Health & Monitoring Endpoints

### 1. Service Health Check

**Endpoint**: `GET /health`  
**Summary**: Check overall service health  
**Authentication**: Not required  

**Successful Response (200)**:
```json
{
  "status": "healthy",
  "service": "langchain-chat",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "endpoints": [
    "POST /api/chat/message - Process chat message",
    "GET /api/chat/:chatId/history - Get chat history",
    "POST /api/provider/test - Test provider connection",
    "DELETE /api/chat/:chatId/clear - Clear conversation",
    "GET /api/chat/:chatId/summary - Get conversation summary",
    "GET /health - Health check",
    "GET /metrics - Service metrics"
  ]
}
```

**Responses**:
- **200 OK**: Service is healthy
- **503 Service Unavailable**: Service is unhealthy

---

### 2. Database Health Check

**Endpoint**: `GET /health/database`  
**Summary**: Check database connection health  
**Authentication**: Not required  

**Successful Response (200)**:
```json
{
  "status": "healthy",
  "responseTime": 15,
  "details": {
    "connected": true,
    "poolSize": 10,
    "activeConnections": 2
  }
}
```

**Responses**:
- **200 OK**: Database is healthy
- **503 Service Unavailable**: Database connection failed

---

### 3. Redis Health Check

**Endpoint**: `GET /health/redis`  
**Summary**: Check Redis cache health  
**Authentication**: Not required  

**Successful Response (200)**:
```json
{
  "status": "healthy",
  "responseTime": 5,
  "details": {
    "connected": true,
    "memoryUsage": "45MB",
    "uptime": 86400
  }
}
```

**Responses**:
- **200 OK**: Redis is healthy
- **503 Service Unavailable**: Redis connection failed

---

### 4. Service Metrics

**Endpoint**: `GET /metrics`  
**Summary**: Get service performance metrics  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Successful Response (200)**:
```json
{
  "activeChains": 5,
  "totalRequests": 1024,
  "averageResponseTime": 250,
  "memoryUsage": {
    "rss": 104857600,
    "heapTotal": 52428800,
    "heapUsed": 41943040,
    "external": 1048576
  },
  "uptime": 3600.5,
  "timestamp": "2024-01-01T12:00:00Z",
  "chatServiceHealth": {
    "status": "healthy",
    "activeConversations": 3,
    "cacheHitRate": 0.75
  }
}
```

**Responses**:
- **200 OK**: Metrics retrieved successfully
- **401 Unauthorized**: Invalid or missing token
- **500 Internal Server Error**: Failed to retrieve metrics

---

## Chat Processing Endpoints

### 5. Process Chat Message

**Endpoint**: `POST /api/chat/message`  
**Summary**: Process a chat message with AI  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
x-api-key: <openai_or_anthropic_api_key> (optional)
```

**Request Body**:
```json
{
  "chatId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Hello, can you help me with Python programming?",
  "settings": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "You are a helpful programming assistant.",
    "streaming": false
  }
}
```

**Field Descriptions**:
- `chatId` (required): UUID of the chat conversation
- `message` (required): User message (1-10000 characters)
- `settings.provider`: LLM provider ("openai" or "anthropic")
- `settings.model`: Model to use (default: "gpt-3.5-turbo")
- `settings.temperature`: Creativity level (0-2, default: 0.7)
- `settings.maxTokens`: Max response tokens (1-4096, default: 2048)
- `settings.systemPrompt`: System prompt (max 1000 characters)
- `settings.streaming`: Enable streaming response (default: false)

**Successful Response (200)**:
```json
{
  "success": true,
  "chatId": "123e4567-e89b-12d3-a456-426614174000",
  "userMessage": {
    "id": "msg-789",
    "content": "Hello, can you help me with Python programming?",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "aiMessage": {
    "id": "msg-790",
    "content": "Of course! I'd be happy to help you with Python programming...",
    "timestamp": "2024-01-01T12:00:01Z"
  },
  "processingTime": 1250,
  "tokensUsed": {
    "prompt": 45,
    "completion": 120,
    "total": 165
  },
  "provider": "openai",
  "model": "gpt-3.5-turbo"
}
```

**Error Response (400)**:
```json
{
  "error": "API key not found",
  "code": "API_KEY_MISSING",
  "message": "Please provide an API key either in headers (x-api-key) or configure it in your settings"
}
```

**Responses**:
- **200 OK**: Message processed successfully
- **400 Bad Request**: Validation error or missing API key
- **401 Unauthorized**: Invalid or missing token
- **500 Internal Server Error**: Processing failed

---

### 6. Get Chat History

**Endpoint**: `GET /api/chat/:chatId/history`  
**Summary**: Retrieve chat conversation history  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `chatId`: UUID of the chat conversation

**Successful Response (200)**:
```json
{
  "chatId": "123e4567-e89b-12d3-a456-426614174000",
  "history": [
    {
      "id": "msg-001",
      "content": "Hello!",
      "message_type": "user",
      "ai_model_used": null,
      "tokens_used": null,
      "processing_time_ms": null,
      "created_at": "2024-01-01T11:00:00Z"
    },
    {
      "id": "msg-002",
      "content": "Hello! How can I help you today?",
      "message_type": "assistant",
      "ai_model_used": "gpt-3.5-turbo",
      "tokens_used": 25,
      "processing_time_ms": 450,
      "created_at": "2024-01-01T11:00:01Z"
    }
  ],
  "cached": false
}
```

**Responses**:
- **200 OK**: History retrieved successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Chat not found or access denied
- **500 Internal Server Error**: Failed to retrieve history

---

## Conversation Management

### 7. Clear Conversation

**Endpoint**: `DELETE /api/chat/:chatId/clear`  
**Summary**: Clear all messages in a conversation  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `chatId`: UUID of the chat conversation

**Successful Response (200)**:
```json
{
  "success": true,
  "chatId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Conversation cleared successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **200 OK**: Conversation cleared successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Chat not found or access denied
- **500 Internal Server Error**: Failed to clear conversation

---

### 8. Get Conversation Summary

**Endpoint**: `GET /api/chat/:chatId/summary`  
**Summary**: Get AI-generated summary of conversation  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**URL Parameters**:
- `chatId`: UUID of the chat conversation

**Successful Response (200)**:
```json
{
  "success": true,
  "summary": {
    "messageCount": 10,
    "topics": ["Python programming", "Data structures", "Algorithms"],
    "summary": "The conversation covered Python basics, list comprehensions, and sorting algorithms...",
    "keyPoints": [
      "Discussed list comprehension syntax",
      "Explained quicksort algorithm",
      "Provided examples of dictionary operations"
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**Responses**:
- **200 OK**: Summary generated successfully
- **401 Unauthorized**: Invalid or missing token
- **404 Not Found**: Chat not found or access denied
- **500 Internal Server Error**: Failed to generate summary

---

## Provider Testing

### 9. Test Provider Connection

**Endpoint**: `POST /api/provider/test`  
**Summary**: Test LLM provider API connection  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-3.5-turbo"
}
```

**Field Descriptions**:
- `provider` (required): LLM provider ("openai" or "anthropic")
- `apiKey` (required): API key for the provider
- `model`: Model to test (default: "gpt-3.5-turbo")

**Successful Response (200)**:
```json
{
  "success": true,
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "testMessage": "Test connection - respond with 'OK'",
  "response": "OK",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "PROVIDER_TEST_FAILED"
}
```

**Responses**:
- **200 OK**: Provider test successful
- **400 Bad Request**: Invalid API key or provider
- **401 Unauthorized**: Invalid or missing token

---

### 10. Authentication Test

**Endpoint**: `GET /api/auth-test`  
**Summary**: Test JWT authentication  
**Authentication**: **Required** (JWT Bearer)  

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "user_id": "user-123",
    "email": "user@arketic.com",
    "roles": ["user"],
    "permissions": ["read", "write"]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **200 OK**: Authentication successful
- **401 Unauthorized**: Invalid or missing token

---

## Internal Service Endpoints

### 11. Internal Chat Message

**Endpoint**: `POST /internal/chat/message`  
**Summary**: Process chat message (service-to-service)  
**Authentication**: **Required** (Internal Service Key)  

**Headers**:
```
x-internal-service-key: <service_key>
x-user-id: <user_id>
x-api-key: <llm_api_key>
Content-Type: application/json
```

**Request Body**: Same as [Process Chat Message](#5-process-chat-message)

**Successful Response (200)**: Same as [Process Chat Message](#5-process-chat-message)

**Responses**:
- **200 OK**: Message processed successfully
- **400 Bad Request**: Validation error or missing API key
- **401 Unauthorized**: Invalid service key
- **403 Forbidden**: Access denied
- **500 Internal Server Error**: Processing failed

---

### 12. Internal Health Check

**Endpoint**: `GET /internal/health`  
**Summary**: Internal service health check  
**Authentication**: **Required** (Internal Service Key)  

**Headers**:
```
x-internal-service-key: <service_key>
```

**Successful Response (200)**:
```json
{
  "status": "healthy",
  "service": "langchain-chat-internal",
  "details": {
    "status": "operational",
    "activeChains": 3,
    "queueLength": 0
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **200 OK**: Service is healthy
- **401 Unauthorized**: Invalid service key
- **403 Forbidden**: Access denied
- **503 Service Unavailable**: Service is unhealthy

---

## Request/Response Schemas

### Message Settings Schema

```typescript
interface MessageSettings {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature?: number;      // 0-2, default: 0.7
  maxTokens?: number;        // 1-4096, default: 2048
  systemPrompt?: string;     // Max 1000 chars
  streaming?: boolean;       // Default: false
}
```

### Token Usage Schema

```typescript
interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}
```

### Message History Item Schema

```typescript
interface MessageHistoryItem {
  id: string;
  content: string;
  message_type: 'user' | 'assistant' | 'system';
  ai_model_used?: string;
  tokens_used?: number;
  processing_time_ms?: number;
  created_at: string;
}
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details (optional)",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request data | 400 |
| `API_KEY_MISSING` | LLM API key not provided | 400 |
| `API_KEY_INVALID` | Invalid LLM API key | 400 |
| `CHAT_NOT_FOUND` | Chat conversation not found | 404 |
| `UNAUTHORIZED` | Invalid or missing JWT token | 401 |
| `FORBIDDEN` | Access denied | 403 |
| `CHAT_PROCESSING_ERROR` | Failed to process message | 500 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |

---

## Integration Features

### Supported LLM Providers

1. **OpenAI**
   - Models: gpt-3.5-turbo, gpt-4, gpt-4-turbo
   - Features: Function calling, streaming, embeddings
   - Required: OPENAI_API_KEY

2. **Anthropic**
   - Models: claude-2, claude-instant
   - Features: Constitutional AI, longer context
   - Required: ANTHROPIC_API_KEY

### Caching Strategy

- **Redis Cache**: Responses cached for 5 minutes
- **Cache Key Pattern**: `chat:{chatId}:{messageHash}`
- **Cache Invalidation**: On conversation clear or summary generation

### Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  model VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  model VARCHAR(50),
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User API keys table
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Examples

### Example 1: Complete Chat Flow

```bash
# 1. Authenticate (get JWT token)
TOKEN="your_jwt_token"

# 2. Create a new chat and send first message
curl -X POST http://localhost:3001/api/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-your-openai-key" \
  -d '{
    "chatId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "What is Python?",
    "settings": {
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "temperature": 0.7
    }
  }'

# 3. Get chat history
curl -X GET http://localhost:3001/api/chat/550e8400-e29b-41d4-a716-446655440000/history \
  -H "Authorization: Bearer $TOKEN"

# 4. Continue conversation
curl -X POST http://localhost:3001/api/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-your-openai-key" \
  -d '{
    "chatId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Can you show me a simple example?",
    "settings": {
      "provider": "openai",
      "model": "gpt-3.5-turbo"
    }
  }'

# 5. Get conversation summary
curl -X GET http://localhost:3001/api/chat/550e8400-e29b-41d4-a716-446655440000/summary \
  -H "Authorization: Bearer $TOKEN"

# 6. Clear conversation
curl -X DELETE http://localhost:3001/api/chat/550e8400-e29b-41d4-a716-446655440000/clear \
  -H "Authorization: Bearer $TOKEN"
```

### Example 2: Testing Provider Connection

```bash
curl -X POST http://localhost:3001/api/provider/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-your-api-key",
    "model": "gpt-3.5-turbo"
  }'
```

### Example 3: Internal Service Communication

```bash
curl -X POST http://localhost:3001/internal/chat/message \
  -H "x-internal-service-key: your-service-key" \
  -H "x-user-id: user-123" \
  -H "x-api-key: sk-your-openai-key" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Internal service test",
    "settings": {
      "provider": "openai",
      "model": "gpt-3.5-turbo"
    }
  }'
```

### Example 4: Health Monitoring

```bash
# Check overall health
curl http://localhost:3001/health

# Check database health
curl http://localhost:3001/health/database

# Check Redis health
curl http://localhost:3001/health/redis

# Get service metrics (requires auth)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/metrics
```

---

## Performance Considerations

### Rate Limiting

- Default: 100 requests per minute per user
- Configurable via environment variables
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Timeouts

- Request timeout: 30 seconds
- LLM API timeout: 25 seconds
- Database query timeout: 5 seconds
- Redis operation timeout: 2 seconds

### Optimization Tips

1. **Enable Caching**: Frequently asked questions are cached
2. **Use Appropriate Models**: Use smaller models for simple tasks
3. **Batch Operations**: Process multiple messages in sequence
4. **Monitor Metrics**: Track token usage and response times
5. **Configure System Prompts**: Optimize prompts for efficiency

---

## Security Best Practices

1. **API Key Management**
   - Never expose API keys in client-side code
   - Use environment variables for sensitive data
   - Rotate keys regularly

2. **JWT Token Security**
   - Use short expiration times (1 hour recommended)
   - Implement token refresh mechanism
   - Validate token signatures

3. **Input Validation**
   - Sanitize user messages
   - Enforce message length limits
   - Validate UUID formats

4. **Rate Limiting**
   - Implement per-user rate limits
   - Monitor for abuse patterns
   - Use circuit breakers for external APIs

---

## Deployment Configuration

### Important Notes

⚠️ **Port Configuration**: The LangChain service is configured to always run on port 3001. This is a fixed configuration and should not be changed to ensure proper communication with other services in the Arketic ecosystem.

### Environment Variables

```bash
# Server Configuration
PORT=3001  # Fixed port - do not change
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/langchain
DATABASE_POOL_SIZE=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRY_HOURS=1

# LLM Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Internal Service
INTERNAL_SERVICE_KEY=your-internal-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
```

### Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Support & Resources

- **API Testing Script**: `/apps/api/docs/langchain_test.py`
- **Service Repository**: `/apps/langchain`
- **Issue Tracking**: GitHub Issues
- **Documentation Updates**: Submit PRs to `/apps/api/docs/api/`

For additional support or questions about the LangChain Service API, please contact the development team.