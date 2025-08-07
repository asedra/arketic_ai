# 📚 Arketic Platform - API Documentation

## Overview

The Arketic Platform provides a comprehensive REST API for integrating AI-powered organizational management capabilities into your applications. This documentation covers all available endpoints, authentication, request/response formats, and integration examples.

## Base URL

```
Production: https://api.arketic.com
Staging: https://staging-api.arketic.com
Development: http://localhost:8000
```

## Authentication

### JWT Token Authentication

All API requests require authentication using JWT (JSON Web Tokens). Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining Tokens

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## API Endpoints

### 🔐 Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "organization": "Acme Corp"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "full_name": "John Doe",
  "organization": "Acme Corp",
  "created_at": "2025-01-08T12:00:00Z"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

#### Password Reset
```http
POST /api/v1/auth/password-reset
```

**Request:**
```json
{
  "email": "user@example.com"
}
```

### 👥 People Management API

#### List People
```http
GET /api/v1/organization/people
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `search` (string): Search term for name, email, or title
- `department` (string): Filter by department
- `role` (string): Filter by role
- `status` (string): Filter by status (active, inactive)

**Response:**
```json
{
  "people": [
    {
      "id": "person_123",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@company.com",
      "title": "Software Engineer",
      "department": "Engineering",
      "role": "employee",
      "status": "active",
      "hire_date": "2023-01-15",
      "manager_id": "person_456",
      "phone": "+1-555-0123",
      "location": "San Francisco, CA",
      "skills": ["Python", "JavaScript", "AI/ML"],
      "created_at": "2025-01-08T12:00:00Z",
      "updated_at": "2025-01-08T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Get Person
```http
GET /api/v1/organization/people/{person_id}
Authorization: Bearer <token>
```

#### Create Person
```http
POST /api/v1/organization/people
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@company.com",
  "title": "Product Manager",
  "department": "Product",
  "role": "employee",
  "hire_date": "2025-01-15",
  "manager_id": "person_789",
  "phone": "+1-555-0124",
  "location": "New York, NY",
  "skills": ["Product Strategy", "Analytics", "Leadership"]
}
```

#### Update Person
```http
PUT /api/v1/organization/people/{person_id}
Authorization: Bearer <token>
Content-Type: application/json
```

#### Delete Person
```http
DELETE /api/v1/organization/people/{person_id}
Authorization: Bearer <token>
```

#### Create User Account
```http
POST /api/v1/organization/people/{person_id}/create-account
Authorization: Bearer <token>
```

**Request:**
```json
{
  "send_invitation": true,
  "temporary_password": "TempPass123!",
  "roles": ["user", "employee"]
}
```

### 🤖 AI Assistant API

#### Chat Completion
```http
POST /api/v1/ai/chat/completions
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant for organizational management."
    },
    {
      "role": "user",
      "content": "What are the key metrics for employee engagement?"
    }
  ],
  "model": "gpt-3.5-turbo",
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**Response:**
```json
{
  "id": "chatcmpl_123",
  "object": "chat.completion",
  "created": 1641234567,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Key employee engagement metrics include:\n\n1. **Employee Net Promoter Score (eNPS)**\n2. **Employee Satisfaction Scores**\n3. **Retention Rates**\n4. **Absenteeism Rates**\n5. **Performance Ratings**\n..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 156,
    "total_tokens": 201
  },
  "cost": {
    "input_cost": 0.00009,
    "output_cost": 0.000312,
    "total_cost": 0.000402
  }
}
```

#### Streaming Chat
```http
POST /api/v1/ai/chat/stream
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "messages": [...],
  "model": "gpt-3.5-turbo",
  "stream": true
}
```

**Response (Server-Sent Events):**
```
data: {"id":"chatcmpl_123","object":"chat.completion.chunk","created":1641234567,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":"Key"},"finish_reason":null}]}

data: {"id":"chatcmpl_123","object":"chat.completion.chunk","created":1641234567,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" employee"},"finish_reason":null}]}

data: [DONE]
```

#### Cost Estimation
```http
POST /api/v1/ai/cost/estimate
Authorization: Bearer <token>
```

**Request:**
```json
{
  "messages": [...],
  "model": "gpt-3.5-turbo",
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "estimated_tokens": {
    "prompt_tokens": 45,
    "completion_tokens": 156,
    "total_tokens": 201
  },
  "estimated_cost": {
    "input_cost": 0.00009,
    "output_cost": 0.000312,
    "total_cost": 0.000402
  },
  "model": "gpt-3.5-turbo",
  "pricing": {
    "input_price_per_token": 0.000002,
    "output_price_per_token": 0.000002
  }
}
```

### 🔍 Vector Search API

#### Create Embedding
```http
POST /api/v1/vector/embeddings
Authorization: Bearer <token>
```

**Request:**
```json
{
  "text": "Employee onboarding process and best practices",
  "model": "text-embedding-ada-002"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, 0.789, ...],
  "model": "text-embedding-ada-002",
  "usage": {
    "tokens": 8,
    "cost": 0.000016
  }
}
```

#### Add Documents
```http
POST /api/v1/vector/documents
Authorization: Bearer <token>
```

**Request:**
```json
{
  "documents": [
    {
      "id": "doc_123",
      "text": "Employee handbook section on vacation policies...",
      "metadata": {
        "title": "Vacation Policy",
        "category": "HR Policies",
        "last_updated": "2025-01-01"
      }
    }
  ],
  "collection": "hr_documents"
}
```

#### Search Documents
```http
POST /api/v1/vector/search
Authorization: Bearer <token>
```

**Request:**
```json
{
  "query": "What is the vacation policy?",
  "collection": "hr_documents",
  "limit": 5,
  "similarity_threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "doc_123",
      "text": "Employee handbook section on vacation policies...",
      "metadata": {
        "title": "Vacation Policy",
        "category": "HR Policies",
        "last_updated": "2025-01-01"
      },
      "similarity_score": 0.89
    }
  ],
  "query_embedding": [0.123, -0.456, ...],
  "collection": "hr_documents"
}
```

#### List Collections
```http
GET /api/v1/vector/collections
Authorization: Bearer <token>
```

**Response:**
```json
{
  "collections": [
    {
      "name": "hr_documents",
      "document_count": 245,
      "created_at": "2025-01-01T00:00:00Z",
      "last_updated": "2025-01-08T12:00:00Z"
    },
    {
      "name": "technical_docs",
      "document_count": 156,
      "created_at": "2025-01-01T00:00:00Z",
      "last_updated": "2025-01-07T15:30:00Z"
    }
  ]
}
```

### 📄 Document Processing API

#### Upload Document
```http
POST /api/v1/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:**
```
file: <binary_file_data>
category: hr_policies
tags: vacation,policy,2025
```

**Response:**
```json
{
  "id": "doc_456",
  "filename": "vacation_policy.pdf",
  "size": 2048576,
  "content_type": "application/pdf",
  "category": "hr_policies",
  "tags": ["vacation", "policy", "2025"],
  "status": "processing",
  "upload_url": "https://cdn.arketic.com/documents/doc_456.pdf",
  "created_at": "2025-01-08T12:00:00Z"
}
```

#### Get Document Status
```http
GET /api/v1/documents/{document_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "doc_456",
  "filename": "vacation_policy.pdf",
  "status": "completed",
  "extracted_text": "Vacation Policy\n\nEmployees are entitled to...",
  "analysis": {
    "summary": "This document outlines the company's vacation policy...",
    "key_points": [
      "Employees accrue 2 weeks vacation per year",
      "Must request vacation 2 weeks in advance",
      "Maximum carryover is 40 hours"
    ],
    "sentiment": "neutral",
    "language": "en"
  },
  "metadata": {
    "pages": 3,
    "word_count": 1247,
    "reading_time_minutes": 5
  }
}
```

#### Analyze Document
```http
POST /api/v1/documents/{document_id}/analyze
Authorization: Bearer <token>
```

**Request:**
```json
{
  "analysis_type": "summary",
  "custom_prompt": "Summarize the key policy changes from the previous version"
}
```

#### List Documents
```http
GET /api/v1/documents
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (string): Filter by category
- `status` (string): Filter by processing status
- `tags` (string): Filter by tags (comma-separated)
- `search` (string): Search in filename or content

### ⚙️ Settings API

#### Get Settings
```http
GET /api/v1/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "openai": {
      "api_key": "sk-***••••****",
      "model": "gpt-3.5-turbo",
      "max_tokens": 1000,
      "temperature": 0.7
    },
    "platform": {
      "theme": "light",
      "language": "en",
      "notifications_enabled": true,
      "auto_save": true
    }
  }
}
```

#### Update OpenAI Settings
```http
POST /api/v1/settings/openai
Authorization: Bearer <token>
```

**Request:**
```json
{
  "api_key": "sk-your-openai-api-key-here",
  "model": "gpt-4",
  "max_tokens": 2000,
  "temperature": 0.5
}
```

#### Test OpenAI Connection
```http
POST /api/v1/settings/test-openai
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "OpenAI API connection successful",
  "data": {
    "model": "gpt-4",
    "response_time_ms": 245,
    "test_query": "Hello, this is a test",
    "test_response": "Hello! I'm working correctly."
  }
}
```

### 📊 System Health & Monitoring

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "arketic-platform",
  "version": "1.0.0",
  "timestamp": "2025-01-08T12:00:00Z",
  "components": {
    "database": "healthy",
    "redis": "healthy",
    "vector_db": "healthy",
    "ai_services": "healthy"
  },
  "uptime_seconds": 3600
}
```

#### System Status
```http
GET /api/v1/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "ai_chat": "enabled",
    "vector_search": "enabled",
    "document_processing": "enabled",
    "people_management": "enabled"
  },
  "usage": {
    "total_users": 1247,
    "active_users_24h": 892,
    "api_calls_24h": 45623,
    "ai_requests_24h": 12456
  },
  "performance": {
    "avg_response_time_ms": 89,
    "uptime_percentage": 99.98,
    "error_rate_percentage": 0.02
  }
}
```

#### Metrics
```http
GET /metrics
```

**Response (Prometheus format):**
```
# HELP arketic_api_requests_total Total number of API requests
# TYPE arketic_api_requests_total counter
arketic_api_requests_total{method="GET",endpoint="/api/v1/people"} 1234

# HELP arketic_response_time_seconds API response time in seconds
# TYPE arketic_response_time_seconds histogram
arketic_response_time_seconds_bucket{le="0.1"} 8954
arketic_response_time_seconds_bucket{le="0.5"} 9875
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_123456789"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `SERVICE_UNAVAILABLE` | External service error |

## Rate Limiting

### Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|---------|
| Authentication | 10 requests | 1 minute |
| Standard API | 1000 requests | 1 hour |
| AI Endpoints | 100 requests | 1 hour |
| File Upload | 50 requests | 1 hour |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1641234567
X-RateLimit-Window: 3600
```

## Webhooks

### Webhook Events

Arketic can send webhooks for various events:

- `person.created` - New person added
- `person.updated` - Person information changed
- `document.processed` - Document processing completed
- `ai.request.completed` - AI request finished
- `user.login` - User logged in
- `system.alert` - System alert triggered

### Webhook Configuration

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/arketic",
  "events": ["person.created", "document.processed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "id": "evt_123456789",
  "type": "person.created",
  "created": 1641234567,
  "data": {
    "object": {
      "id": "person_123",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@company.com"
    }
  }
}
```

## SDK & Libraries

### Official SDKs

#### Python SDK
```python
from arketic import ArketicClient

client = ArketicClient(
    api_key="your-api-key",
    base_url="https://api.arketic.com"
)

# List people
people = client.people.list(limit=10)

# Create person
person = client.people.create({
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
})

# AI chat
response = client.ai.chat({
    "messages": [{"role": "user", "content": "Hello"}]
})
```

#### JavaScript/TypeScript SDK
```javascript
import { ArketicClient } from '@arketic/sdk';

const client = new ArketicClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.arketic.com'
});

// List people
const people = await client.people.list({ limit: 10 });

// Create person
const person = await client.people.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// AI chat
const response = await client.ai.chat({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### Community SDKs

- **Go**: `github.com/arketic/go-sdk`
- **Java**: `com.arketic:arketic-java-sdk`
- **Ruby**: `gem 'arketic'`
- **PHP**: `composer require arketic/php-sdk`

## Integration Examples

### Basic People Management Integration

```python
import os
from arketic import ArketicClient

# Initialize client
client = ArketicClient(api_key=os.getenv('ARKETIC_API_KEY'))

# Sync employees from your HR system
def sync_employees(hr_employees):
    for hr_emp in hr_employees:
        try:
            # Check if person exists
            existing = client.people.search(email=hr_emp['email'])
            
            if existing:
                # Update existing person
                client.people.update(existing[0]['id'], {
                    'title': hr_emp['title'],
                    'department': hr_emp['department'],
                    'manager_id': find_manager_id(hr_emp['manager_email'])
                })
            else:
                # Create new person
                client.people.create({
                    'first_name': hr_emp['first_name'],
                    'last_name': hr_emp['last_name'],
                    'email': hr_emp['email'],
                    'title': hr_emp['title'],
                    'department': hr_emp['department']
                })
        except Exception as e:
            print(f"Error syncing {hr_emp['email']}: {e}")
```

### AI-Powered HR Assistant

```javascript
const express = require('express');
const { ArketicClient } = require('@arketic/sdk');

const app = express();
const arketic = new ArketicClient({ apiKey: process.env.ARKETIC_API_KEY });

app.post('/hr-assistant', async (req, res) => {
  const { question, context } = req.body;
  
  try {
    // Get relevant people data for context
    const people = await arketic.people.search(context.search_term);
    
    // Create AI prompt with context
    const messages = [
      {
        role: 'system',
        content: 'You are an HR assistant with access to employee data.'
      },
      {
        role: 'user',
        content: `${question}\n\nEmployee context: ${JSON.stringify(people)}`
      }
    ];
    
    // Get AI response
    const response = await arketic.ai.chat({ messages });
    
    res.json({
      answer: response.choices[0].message.content,
      sources: people.map(p => p.id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Document Processing Pipeline

```python
import asyncio
from arketic import ArketicClient

async def process_document_pipeline(file_path, category):
    client = ArketicClient(api_key=os.getenv('ARKETIC_API_KEY'))
    
    # Upload document
    with open(file_path, 'rb') as f:
        doc = await client.documents.upload(
            file=f,
            category=category
        )
    
    # Wait for processing
    while doc['status'] == 'processing':
        await asyncio.sleep(5)
        doc = await client.documents.get(doc['id'])
    
    if doc['status'] == 'completed':
        # Add to vector search
        await client.vector.add_documents([{
            'id': doc['id'],
            'text': doc['extracted_text'],
            'metadata': {
                'filename': doc['filename'],
                'category': doc['category'],
                'summary': doc['analysis']['summary']
            }
        }], collection=f"{category}_docs")
        
        return doc
    else:
        raise Exception(f"Document processing failed: {doc.get('error')}")
```

## Testing

### API Testing with curl

```bash
# Set your API token
export ARKETIC_TOKEN="your-jwt-token"

# List people
curl -H "Authorization: Bearer $ARKETIC_TOKEN" \
     https://api.arketic.com/api/v1/organization/people

# Create person
curl -X POST \
     -H "Authorization: Bearer $ARKETIC_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"first_name":"Jane","last_name":"Doe","email":"jane@example.com"}' \
     https://api.arketic.com/api/v1/organization/people

# AI chat
curl -X POST \
     -H "Authorization: Bearer $ARKETIC_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello"}]}' \
     https://api.arketic.com/api/v1/ai/chat/completions
```

### Postman Collection

Import our Postman collection for easy API testing:

```
https://api.arketic.com/postman/collection.json
```

## Support

### Documentation
- **API Reference**: https://docs.arketic.com/api
- **SDKs**: https://docs.arketic.com/sdks
- **Tutorials**: https://docs.arketic.com/tutorials

### Support Channels
- **Email**: api-support@arketic.com
- **Discord**: https://discord.gg/arketic
- **GitHub Issues**: https://github.com/arketic/platform/issues

### SLA
- **Response Time**: < 24 hours for support requests
- **API Uptime**: 99.9% availability guarantee
- **Status Page**: https://status.arketic.com

---

**Ready to build with Arketic?** Start with our [Quick Start Guide](https://docs.arketic.com/quickstart) or explore our [SDK documentation](https://docs.arketic.com/sdks).