# Arketic AI/ML Backend - Assistant API Documentation

## Overview

This document provides comprehensive documentation for the Assistant API endpoints in the Arketic AI/ML Backend platform. The API enables comprehensive AI assistant management with configurable AI models, knowledge base integration, and seamless chat system integration.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication Method**: HTTP Bearer Token

## Latest Updates (2025-08-07)

- Fixed enum handling for AI models and assistant status
- Improved test coverage from 30% to 82.4%
- Resolved database enum value conversion issues

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Core Assistant Management Endpoints](#core-assistant-management-endpoints)
3. [Knowledge Management Endpoints](#knowledge-management-endpoints)
4. [Chat Integration Endpoints](#chat-integration-endpoints)
5. [Administrative Endpoints](#administrative-endpoints)
6. [Request/Response Schemas](#requestresponse-schemas)
7. [Error Handling](#error-handling)
8. [AI Integration Features](#ai-integration-features)
9. [Examples](#examples)

---

## Authentication Requirements

### HTTP Bearer Token

All Assistant API endpoints require authentication using HTTP Bearer tokens.

**Header Format**:
```
Authorization: Bearer <access_token>
```

**Security Scheme**:
- Type: HTTP Bearer
- Scheme: bearer

---

## Core Assistant Management Endpoints

### 1. Create Assistant

**Endpoint**: `POST /api/v1/assistants/`  
**Summary**: Create a new AI assistant  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Creates a new AI assistant with configurable AI model, system prompt, temperature settings, and knowledge base associations.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Python Coding Assistant",
  "description": "Expert Python programmer and tutor specializing in web development",
  "system_prompt": "You are an expert Python developer with extensive experience in web frameworks like FastAPI, Django, and Flask. Always provide clear, well-commented code examples and explain best practices.",
  "ai_model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 2048,
  "is_public": false,
  "knowledge_base_ids": ["kb-123", "kb-456"],
  "document_ids": ["doc-789", "doc-101"],
  "configuration": {
    "specialty": "web_development",
    "code_style": "python_pep8"
  }
}
```

**Successful Response (200)**:
```json
{
  "id": "assistant-123e4567-e89b-12d3-a456-426614174000",
  "name": "Python Coding Assistant",
  "description": "Expert Python programmer and tutor specializing in web development",
  "system_prompt": "You are an expert Python developer...",
  "ai_model": "gpt-4o",
  "ai_model_display": "GPT-4o",
  "temperature": 0.7,
  "max_tokens": 2048,
  "status": "active",
  "is_public": false,
  "creator_id": "user-456",
  "total_conversations": 0,
  "total_messages": 0,
  "total_tokens_used": 0,
  "knowledge_count": 2,
  "document_count": 2,
  "created_at": "2025-08-07T15:30:00Z",
  "updated_at": "2025-08-07T15:30:00Z",
  "last_used_at": null,
  "configuration": {
    "specialty": "web_development",
    "code_style": "python_pep8"
  },
  "knowledge_bases": [
    {
      "knowledge_base_id": "kb-123",
      "name": "Python Documentation",
      "description": "Official Python documentation and tutorials"
    }
  ],
  "documents": [
    {
      "document_id": "doc-789",
      "title": "FastAPI Best Practices",
      "knowledge_base_id": "kb-123"
    }
  ]
}
```

**Responses**:
- **200 OK**: Assistant created successfully
- **401 Unauthorized**: Invalid or expired access token
- **422 Validation Error**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 2. List Assistants

**Endpoint**: `GET /api/v1/assistants/`  
**Summary**: List user's assistants with filtering and pagination  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns paginated list of assistants accessible to the user (owned + public) with comprehensive filtering and sorting options.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `query` (optional): Search query for name/description
- `ai_model` (optional): Filter by AI model (gpt-4o, gpt-4o-mini, etc.)
- `status` (optional): Filter by status (active, inactive, draft, archived)
- `is_public` (optional): Filter by public/private status
- `creator_id` (optional): Filter by creator
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sort_by` (optional): Sort field (name, created_at, updated_at, last_used_at, total_messages)
- `sort_order` (optional): Sort direction (asc, desc)

**Successful Response (200)**:
```json
{
  "assistants": [
    {
      "id": "assistant-123",
      "name": "Python Coding Assistant",
      "description": "Expert Python programmer and tutor",
      "ai_model": "gpt-4o",
      "ai_model_display": "GPT-4o",
      "temperature": 0.7,
      "max_tokens": 2048,
      "status": "active",
      "is_public": false,
      "creator_id": "user-456",
      "total_conversations": 15,
      "total_messages": 150,
      "total_tokens_used": 12500,
      "knowledge_count": 2,
      "document_count": 5,
      "created_at": "2025-08-07T15:30:00Z",
      "updated_at": "2025-08-07T16:30:00Z",
      "last_used_at": "2025-08-07T16:25:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "has_next": false,
  "has_prev": false
}
```

---

### 3. Get Assistant Details

**Endpoint**: `GET /api/v1/assistants/{assistant_id}`  
**Summary**: Get detailed information about a specific assistant  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns comprehensive information about an assistant including full configuration, knowledge bases, and usage statistics.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Query Parameters**:
- `include_details` (optional): Include full details including system prompt (default: true)

**Successful Response (200)**:
```json
{
  "id": "assistant-123",
  "name": "Python Coding Assistant",
  "description": "Expert Python programmer and tutor",
  "system_prompt": "You are an expert Python developer...",
  "ai_model": "gpt-4o",
  "ai_model_display": "GPT-4o",
  "temperature": 0.7,
  "max_tokens": 2048,
  "status": "active",
  "is_public": false,
  "creator_id": "user-456",
  "total_conversations": 15,
  "total_messages": 150,
  "total_tokens_used": 12500,
  "knowledge_count": 2,
  "document_count": 5,
  "created_at": "2025-08-07T15:30:00Z",
  "updated_at": "2025-08-07T16:30:00Z",
  "last_used_at": "2025-08-07T16:25:00Z",
  "configuration": {
    "specialty": "web_development",
    "code_style": "python_pep8"
  },
  "knowledge_bases": [
    {
      "knowledge_base_id": "kb-123",
      "name": "Python Documentation",
      "description": "Official Python documentation and tutorials"
    }
  ],
  "documents": [
    {
      "document_id": "doc-789",
      "title": "FastAPI Best Practices",
      "knowledge_base_id": "kb-123"
    }
  ]
}
```

**Responses**:
- **200 OK**: Assistant retrieved successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Access denied to this assistant
- **404 Not Found**: Assistant not found
- **500 Internal Server Error**: Server error

---

### 4. Update Assistant

**Endpoint**: `PUT /api/v1/assistants/{assistant_id}`  
**Summary**: Update an existing assistant  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Updates assistant configuration. Only the assistant creator can update their assistants.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Request Body** (all fields optional):
```json
{
  "name": "Updated Python Assistant",
  "description": "Updated description",
  "system_prompt": "Updated system prompt...",
  "ai_model": "gpt-4-turbo",
  "temperature": 0.8,
  "max_tokens": 3000,
  "status": "active",
  "is_public": true,
  "knowledge_base_ids": ["kb-123", "kb-789"],
  "document_ids": ["doc-456"],
  "configuration": {
    "updated": true
  }
}
```

**Successful Response (200)**:
```json
{
  "id": "assistant-123",
  "name": "Updated Python Assistant",
  "description": "Updated description",
  "system_prompt": "Updated system prompt...",
  "ai_model": "gpt-4-turbo",
  "ai_model_display": "GPT-4 Turbo",
  "temperature": 0.8,
  "max_tokens": 3000,
  "status": "active",
  "is_public": true,
  "creator_id": "user-456",
  "total_conversations": 15,
  "total_messages": 150,
  "total_tokens_used": 12500,
  "knowledge_count": 2,
  "document_count": 1,
  "created_at": "2025-08-07T15:30:00Z",
  "updated_at": "2025-08-07T17:00:00Z",
  "last_used_at": "2025-08-07T16:25:00Z",
  "configuration": {
    "updated": true
  }
}
```

**Responses**:
- **200 OK**: Assistant updated successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: No permission to edit this assistant
- **404 Not Found**: Assistant not found
- **422 Validation Error**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 5. Delete Assistant

**Endpoint**: `DELETE /api/v1/assistants/{assistant_id}`  
**Summary**: Delete an assistant (soft delete)  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Soft deletes an assistant by setting its status to 'archived'. Only the assistant creator can delete their assistants.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Successful Response (200)**:
```json
{
  "message": "Assistant 'Python Coding Assistant' deleted successfully",
  "assistant_id": "assistant-123"
}
```

**Responses**:
- **200 OK**: Assistant deleted successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: No permission to delete this assistant
- **404 Not Found**: Assistant not found
- **500 Internal Server Error**: Server error

---

## Knowledge Management Endpoints

### 6. Manage Assistant Knowledge

**Endpoint**: `POST /api/v1/assistants/{assistant_id}/knowledge`  
**Summary**: Manage assistant's knowledge bases and documents  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Add, remove, or replace knowledge bases and documents associated with an assistant.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Request Body**:
```json
{
  "knowledge_base_ids": ["kb-123", "kb-456"],
  "document_ids": ["doc-789", "doc-101"],
  "action": "add"
}
```

**Request Body Schema**:
- `knowledge_base_ids` (optional): Array of knowledge base IDs
- `document_ids` (optional): Array of document IDs  
- `action` (required): Action to perform ("add", "remove", "replace")

**Successful Response (200)**:
```json
{
  "message": "Assistant knowledge updated successfully",
  "action": "add",
  "result": {
    "knowledge_bases": ["kb-123", "kb-456"],
    "documents": ["doc-789", "doc-101"]
  }
}
```

**Responses**:
- **200 OK**: Knowledge updated successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: No permission to edit this assistant
- **404 Not Found**: Assistant not found or knowledge resources not accessible
- **422 Validation Error**: Invalid action or resource IDs
- **500 Internal Server Error**: Server error

---

## Chat Integration Endpoints

### 7. Get Assistant Chat Configuration

**Endpoint**: `GET /api/v1/assistants/{assistant_id}/chat-config`  
**Summary**: Get assistant configuration for chat integration  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns assistant configuration optimized for chat system integration including system prompt, model settings, and knowledge base IDs.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Successful Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "assistant-123",
    "name": "Python Coding Assistant",
    "description": "Expert Python programmer and tutor",
    "system_prompt": "You are an expert Python developer...",
    "ai_model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 2048,
    "knowledge_base_ids": ["kb-123", "kb-456"],
    "document_ids": ["doc-789", "doc-101"],
    "configuration": {
      "specialty": "web_development"
    }
  },
  "timestamp": "2025-08-07T17:30:00Z"
}
```

---

### 8. Get Available Assistants for Chat

**Endpoint**: `GET /api/v1/chat/assistants/available`  
**Summary**: Get assistants available for chat integration  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns list of active assistants that can be used in chat conversations, formatted for chat system integration.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "success": true,
  "data": {
    "assistants": [
      {
        "id": "assistant-123",
        "name": "Python Coding Assistant",
        "description": "Expert Python programmer and tutor",
        "ai_model": "gpt-4o",
        "ai_model_display": "GPT-4o",
        "is_public": false,
        "creator_id": "user-456",
        "total_conversations": 15,
        "is_owner": true
      }
    ],
    "total": 1
  },
  "timestamp": "2025-08-07T17:30:00Z"
}
```

---

## Administrative Endpoints

### 9. Get Available AI Models

**Endpoint**: `GET /api/v1/assistants/models/available`  
**Summary**: Get list of available AI models for assistants  
**Authentication**: **Not Required**  

**Description**: Returns comprehensive list of supported AI models with their capabilities, token limits, and cost information.

**Successful Response (200)**:
```json
{
  "models": [
    {
      "value": "gpt-4o",
      "label": "GPT-4o",
      "description": "Most capable GPT-4 model, great for complex tasks",
      "max_tokens": 4096,
      "cost_per_1k_tokens": 0.03
    },
    {
      "value": "gpt-4o-mini",
      "label": "GPT-4o Mini",
      "description": "Smaller, faster GPT-4 model, good for simple tasks",
      "max_tokens": 4096,
      "cost_per_1k_tokens": 0.015
    },
    {
      "value": "claude-3-5-sonnet",
      "label": "Claude 3.5 Sonnet",
      "description": "Anthropic's most capable model",
      "max_tokens": 4096,
      "cost_per_1k_tokens": 0.03
    }
  ],
  "default_model": "gpt-4o"
}
```

---

### 10. Get Featured Public Assistants

**Endpoint**: `GET /api/v1/assistants/public/featured`  
**Summary**: Get featured public assistants  
**Authentication**: **Not Required**  

**Description**: Returns list of featured public assistants that are highly rated or frequently used.

**Query Parameters**:
- `limit` (optional): Number of featured assistants to return (default: 10, max: 50)

**Successful Response (200)**:
```json
[
  {
    "id": "assistant-456",
    "name": "Code Review Assistant",
    "description": "Expert code reviewer for multiple programming languages",
    "ai_model": "gpt-4-turbo",
    "ai_model_display": "GPT-4 Turbo",
    "is_public": true,
    "total_conversations": 250,
    "created_at": "2025-08-01T10:00:00Z",
    "last_used_at": "2025-08-07T17:00:00Z"
  }
]
```

---

### 11. Log Assistant Usage

**Endpoint**: `POST /api/v1/assistants/{assistant_id}/usage`  
**Summary**: Log assistant usage for analytics (background task)  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Logs assistant usage for analytics and statistics tracking. Executed as background task to avoid blocking responses.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `assistant_id` (required): Unique identifier of the assistant

**Query Parameters**:
- `action` (required): Action performed ("message", "conversation_start", etc.)
- `chat_id` (optional): Chat ID if related to conversation
- `tokens_used` (optional): Number of tokens consumed (default: 0)
- `processing_time_ms` (optional): Processing time in milliseconds

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "Usage logged successfully",
  "timestamp": "2025-08-07T17:30:00Z"
}
```

---

### 12. Assistant Service Health Check

**Endpoint**: `GET /api/v1/assistants/health`  
**Summary**: Health check for assistant service  
**Authentication**: **Not Required**  

**Description**: Returns health status of the assistant service including version information.

**Successful Response (200)**:
```json
{
  "status": "healthy",
  "service": "assistant_service",
  "timestamp": "2025-08-07T17:30:00Z",
  "version": "1.0.0"
}
```

---

## Request/Response Schemas

### AssistantCreateRequest
```json
{
  "name": "string (required, 1-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "system_prompt": "string (optional, max 50000 chars)",
  "ai_model": "string (default: gpt-4o)",
  "temperature": "float (0.0-2.0, default: 0.7)",
  "max_tokens": "integer (1-32000, default: 2048)",
  "is_public": "boolean (default: false)",
  "knowledge_base_ids": "array of UUIDs (optional)",
  "document_ids": "array of UUIDs (optional)",
  "configuration": "object (optional)"
}
```

### AssistantUpdateRequest
```json
{
  "name": "string (optional, 1-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "system_prompt": "string (optional, max 50000 chars)",
  "ai_model": "string (optional)",
  "temperature": "float (optional, 0.0-2.0)",
  "max_tokens": "integer (optional, 1-32000)",
  "status": "string (optional: active, inactive, draft, archived)",
  "is_public": "boolean (optional)",
  "knowledge_base_ids": "array of UUIDs (optional)",
  "document_ids": "array of UUIDs (optional)",
  "configuration": "object (optional)"
}
```

### AssistantResponse
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string | null",
  "ai_model": "string",
  "ai_model_display": "string",
  "temperature": "float",
  "max_tokens": "integer",
  "status": "string",
  "is_public": "boolean",
  "creator_id": "string (UUID)",
  "total_conversations": "integer",
  "total_messages": "integer",
  "total_tokens_used": "integer",
  "knowledge_count": "integer",
  "document_count": "integer",
  "created_at": "string (ISO datetime)",
  "updated_at": "string (ISO datetime)",
  "last_used_at": "string (ISO datetime) | null"
}
```

### AssistantDetailResponse
```json
{
  "...all fields from AssistantResponse": "...",
  "system_prompt": "string | null",
  "configuration": "object | null",
  "knowledge_bases": [
    {
      "knowledge_base_id": "string (UUID)",
      "name": "string",
      "description": "string | null"
    }
  ],
  "documents": [
    {
      "document_id": "string (UUID)",
      "title": "string",
      "knowledge_base_id": "string (UUID)"
    }
  ]
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request or missing data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Access denied to resource
- **404 Not Found**: Assistant or resource not found
- **422 Validation Error**: Input validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Standard Error Response
```json
{
  "detail": "Error message describing what went wrong"
}
```

### Validation Error Response
```json
{
  "detail": [
    {
      "loc": ["field_name"],
      "msg": "Error message",
      "type": "error_type"
    }
  ]
}
```

---

## AI Integration Features

### 1. Multi-Model Support

#### Supported AI Models (ai_model field values)
- `gpt-4o` - GPT-4o (Most capable GPT-4 model)
- `gpt-4o-mini` - GPT-4o Mini (Smaller, faster GPT-4 model)
- `gpt-4-turbo` - GPT-4 Turbo (Enhanced GPT-4 with improved performance)
- `gpt-4` - GPT-4 (Most capable model, best for complex reasoning)
- `gpt-3.5-turbo` - GPT-3.5 Turbo (Fast and efficient)
- `gpt-3.5-turbo-16k` - GPT-3.5 Turbo 16K (Extended context window)
- `claude-3-5-sonnet` - Claude 3.5 Sonnet (Anthropic's most capable model)
- `claude-3-opus` - Claude 3 Opus (Anthropic's most powerful model)
- `claude-3-haiku` - Claude 3 Haiku (Fast and cost-effective Anthropic model)

#### Supported Status Values
- `active` - Assistant is active and available for use
- `inactive` - Assistant is temporarily disabled
- `draft` - Assistant is in draft state (not yet published)
- `archived` - Assistant is archived (soft deleted)

**Note**: All enum values must be provided in lowercase format as shown above

### 2. Knowledge Integration
- **Knowledge Bases**: Connect assistants to structured knowledge repositories
- **Document Access**: Granular document-level permissions and access
- **RAG Integration**: Automatic retrieval-augmented generation for enhanced responses

### 3. Advanced Configuration
- **System Prompts**: Custom system prompts up to 50,000 characters
- **Temperature Control**: Fine-tune creativity vs. consistency (0.0-2.0)
- **Token Management**: Configurable max tokens per response (1-32,000)
- **Custom Configuration**: Extensible configuration object for specialized settings

### 4. Usage Analytics
- **Conversation Tracking**: Track total conversations and messages
- **Token Usage**: Monitor token consumption across all interactions
- **Performance Metrics**: Response times and usage patterns
- **Activity Monitoring**: Last used timestamps and activity tracking

### 5. Access Control
- **Ownership Model**: Users own their created assistants
- **Public/Private**: Control assistant visibility and access
- **Permission Checks**: Granular permissions for view, edit, delete operations
- **Knowledge Security**: Secure access to knowledge bases and documents

---

## Examples

### Complete Assistant Management Flow

#### 1. Create an Assistant
```bash
curl -X POST "http://localhost:8000/api/v1/assistants/" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python Coding Assistant",
    "description": "Expert Python developer and code reviewer",
    "system_prompt": "You are an expert Python developer with 10+ years of experience. Provide clear, well-documented code examples and explain best practices. Focus on readability, performance, and maintainability.",
    "ai_model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 3000,
    "is_public": false
  }'
```

#### 2. List User's Assistants
```bash
curl -X GET "http://localhost:8000/api/v1/assistants/?limit=10&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. Get Assistant Details
```bash
curl -X GET "http://localhost:8000/api/v1/assistants/assistant-123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 4. Update Assistant
```bash
curl -X PUT "http://localhost:8000/api/v1/assistants/assistant-123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Python Architect",
    "temperature": 0.8,
    "is_public": true
  }'
```

#### 5. Add Knowledge to Assistant
```bash
curl -X POST "http://localhost:8000/api/v1/assistants/assistant-123/knowledge" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "knowledge_base_ids": ["kb-python-docs", "kb-fastapi-guide"],
    "document_ids": ["doc-pep8", "doc-async-patterns"]
  }'
```

#### 6. Create Chat with Assistant
```bash
curl -X POST "http://localhost:8000/api/v1/chat/chats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Architecture Discussion",
    "assistant_id": "assistant-123",
    "chat_type": "DIRECT"
  }'
```

#### 7. Get Available Models
```bash
curl -X GET "http://localhost:8000/api/v1/assistants/models/available"
```

#### 8. Get Featured Public Assistants
```bash
curl -X GET "http://localhost:8000/api/v1/assistants/public/featured?limit=5"
```

#### 9. Search Assistants
```bash
curl -X GET "http://localhost:8000/api/v1/assistants/?query=python&ai_model=gpt-4o&is_public=true" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 10. Delete Assistant
```bash
curl -X DELETE "http://localhost:8000/api/v1/assistants/assistant-123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Integration with Chat System

### Creating Chat with Assistant
When creating a chat with an assistant, the chat system automatically:
- Inherits the assistant's AI model and configuration
- Uses the assistant's system prompt
- Applies temperature and token settings
- Connects to associated knowledge bases for RAG
- Tracks usage statistics for the assistant

### Assistant Selection in Chat
The chat frontend can:
- Get available assistants via `/api/v1/chat/assistants/available`
- Display assistant information including model and specialization
- Create chats with specific assistants
- Switch between different assistants in conversation

---

## Notes

1. **Ownership Model**: Users can only edit/delete assistants they created
2. **Public Assistants**: Public assistants can be used by all users but only edited by creators
3. **Knowledge Integration**: Assistants automatically use connected knowledge for enhanced responses
4. **Usage Tracking**: All interactions are tracked for analytics and billing
5. **Model Flexibility**: Different assistants can use different AI models based on use case
6. **Rate Limiting**: Assistant creation and modification have rate limits to prevent abuse
7. **Soft Delete**: Deleted assistants are archived, not permanently removed
8. **Search Optimization**: Full-text search available on assistant names and descriptions

---

## Support

For questions or issues related to the Assistant API, please refer to the main project documentation or contact the development team.

**Last Updated**: 2025-08-07  
**API Version**: 1.0.0