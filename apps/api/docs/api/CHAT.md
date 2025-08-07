# Arketic AI/ML Backend - Chat API Documentation

## Overview

This document provides comprehensive documentation for the Chat API endpoints in the Arketic AI/ML Backend platform. The API enables real-time chat conversations with AI integration, WebSocket connections, and comprehensive chat management capabilities with streaming responses and connection management.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication Method**: HTTP Bearer Token  
**WebSocket URL**: `ws://localhost:8000`

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Core Chat Management Endpoints](#core-chat-management-endpoints)
3. [Message Management Endpoints](#message-management-endpoints)
4. [WebSocket Real-time Communication](#websocket-real-time-communication)
5. [Chat Participants & Status](#chat-participants--status)
6. [Testing & Monitoring Endpoints](#testing--monitoring-endpoints)
7. [Request/Response Schemas](#requestresponse-schemas)
8. [Error Handling](#error-handling)
9. [AI Integration Features](#ai-integration-features)
10. [Examples](#examples)

---

## Authentication Requirements

### HTTP Bearer Token

All Chat API endpoints require authentication using HTTP Bearer tokens.

**Header Format**:
```
Authorization: Bearer <access_token>
```

**Security Scheme**:
- Type: HTTP Bearer
- Scheme: bearer

---

## Core Chat Management Endpoints

### 1. Create Chat

**Endpoint**: `POST /api/v1/chat/chats`  
**Summary**: Create a new chat conversation  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Creates a new chat conversation with AI integration capabilities, configurable AI models, and custom settings.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "My AI Chat",
  "description": "Chat about AI development topics",
  "chat_type": "DIRECT",
  "ai_model": "gpt-4",
  "ai_persona": "helpful assistant",
  "system_prompt": "You are a helpful AI assistant specialized in software development.",
  "temperature": 0.7,
  "max_tokens": 2048,
  "is_private": false,
  "tags": ["ai", "development", "assistance"]
}
```

**Successful Response (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My AI Chat",
  "description": "Chat about AI development topics",
  "chat_type": "DIRECT",
  "ai_model": "gpt-4",
  "ai_persona": "helpful assistant",
  "message_count": 0,
  "last_activity_at": "2024-01-01T12:00:00Z",
  "created_at": "2024-01-01T12:00:00Z",
  "is_private": false,
  "tags": ["ai", "development", "assistance"]
}
```

**Responses**:
- **200 OK**: Chat created successfully
- **401 Unauthorized**: Invalid or expired access token
- **422 Validation Error**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 2. Get User Chats

**Endpoint**: `GET /api/v1/chat/chats`  
**Summary**: Retrieve user's chat conversations  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns paginated list of user's chat conversations ordered by last activity.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `limit` (optional): Maximum number of chats to return (default: 50)
- `offset` (optional): Number of chats to skip (default: 0)

**Successful Response (200)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My AI Chat",
    "description": "Chat about AI development topics",
    "chat_type": "DIRECT",
    "ai_model": "gpt-4",
    "ai_persona": "helpful assistant",
    "message_count": 15,
    "last_activity_at": "2024-01-01T12:30:00Z",
    "created_at": "2024-01-01T12:00:00Z",
    "is_private": false,
    "tags": ["ai", "development"]
  }
]
```

---

### 3. Get Chat History

**Endpoint**: `GET /api/v1/chat/chats/{chat_id}`  
**Summary**: Get chat history with messages and metadata  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns comprehensive chat history including messages, participant information, and chat metadata with pagination support.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat

**Query Parameters**:
- `limit` (optional): Maximum number of messages to return (default: 100, max: 1000)
- `offset` (optional): Number of messages to skip (default: 0)

**Successful Response (200)**:
```json
{
  "chat": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "My AI Chat",
    "description": "Chat about AI development topics",
    "chat_type": "DIRECT",
    "ai_model": "gpt-4",
    "ai_persona": "helpful assistant",
    "message_count": 15,
    "last_activity_at": "2024-01-01T12:30:00Z",
    "created_at": "2024-01-01T12:00:00Z",
    "is_private": false,
    "tags": ["ai", "development"]
  },
  "messages": [
    {
      "id": "msg-123",
      "chat_id": "123e4567-e89b-12d3-a456-426614174000",
      "sender_id": "user-456",
      "content": "Hello, how can you help me with Python?",
      "message_type": "USER",
      "ai_model_used": null,
      "tokens_used": null,
      "processing_time_ms": null,
      "status": "DELIVERED",
      "created_at": "2024-01-01T12:30:00Z",
      "is_edited": false
    },
    {
      "id": "msg-124",
      "chat_id": "123e4567-e89b-12d3-a456-426614174000",
      "sender_id": null,
      "content": "I'd be happy to help you with Python! What specific aspect would you like to learn about?",
      "message_type": "AI",
      "ai_model_used": "gpt-4",
      "tokens_used": 25,
      "processing_time_ms": 850,
      "status": "DELIVERED",
      "created_at": "2024-01-01T12:30:15Z",
      "is_edited": false
    }
  ],
  "participant_count": 1
}
```

**Responses**:
- **200 OK**: Chat history retrieved successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Access denied to this chat
- **404 Not Found**: Chat not found or archived
- **500 Internal Server Error**: Server error

---

## Message Management Endpoints

### 4. Send Message

**Endpoint**: `POST /api/v1/chat/chats/{chat_id}/messages`  
**Summary**: Send a message to a chat conversation  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Sends a message to the specified chat. If AI responses are enabled, will automatically generate an AI response using the user's configured OpenAI API key.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat

**Request Body**:
```json
{
  "content": "Can you explain how async/await works in Python?",
  "message_type": "USER",
  "reply_to_id": null,
  "message_metadata": {
    "source": "web_app",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Successful Response (200)**:
```json
{
  "id": "msg-125",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "sender_id": "user-456",
  "content": "Can you explain how async/await works in Python?",
  "message_type": "USER",
  "ai_model_used": null,
  "tokens_used": null,
  "processing_time_ms": null,
  "status": "DELIVERED",
  "created_at": "2024-01-01T12:31:00Z",
  "is_edited": false
}
```

**Responses**:
- **200 OK**: Message sent successfully
- **400 Bad Request**: Empty message content
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Cannot send messages to this chat
- **404 Not Found**: Chat not found
- **500 Internal Server Error**: Server error

---

### 5. Send Typing Indicator

**Endpoint**: `POST /api/v1/chat/chats/{chat_id}/typing`  
**Summary**: Send typing indicator to chat participants  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Broadcasts typing indicator to all connected participants in the chat via WebSocket.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat

**Successful Response (200)**:
```json
{
  "status": "sent",
  "timestamp": "2024-01-01T12:31:30Z"
}
```

---

## WebSocket Real-time Communication

### 6. WebSocket Connection

**Endpoint**: `ws://localhost:8000/api/v1/chat/chats/{chat_id}/ws`  
**Summary**: Real-time WebSocket connection for chat  
**Authentication**: **Required** (JWT token in query parameter)  

**Description**: Establishes real-time WebSocket connection for live chat communication with streaming AI responses, typing indicators, and message broadcasting.

**Connection URL**:
```
ws://localhost:8000/api/v1/chat/chats/{chat_id}/ws?token={jwt_token}
```

**Authentication Methods**:
- Query parameter: `?token=jwt_token`
- Header: `Authorization: Bearer jwt_token`

**Message Types**:

#### Client to Server:
```json
// Ping message
{
  "type": "ping",
  "timestamp": "2024-01-01T12:00:00Z"
}

// Heartbeat
{
  "type": "heartbeat",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Server to Client:
```json
// Welcome message
{
  "type": "welcome",
  "message": "Connected to chat",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-456",
  "username": "johndoe",
  "timestamp": "2024-01-01T12:00:00Z",
  "server_time": "2024-01-01T12:00:00Z"
}

// New message broadcast
{
  "type": "new_message",
  "message": {
    "id": "msg-125",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_id": "user-456",
    "content": "Hello everyone!",
    "message_type": "USER",
    "created_at": "2024-01-01T12:31:00Z"
  }
}

// AI response streaming
{
  "type": "ai_response_start",
  "message": {
    "id": "msg-126",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_id": null,
    "content": "",
    "message_type": "AI",
    "ai_model_used": "gpt-4",
    "created_at": "2024-01-01T12:31:15Z",
    "status": "PROCESSING",
    "is_streaming": true
  }
}

// AI response chunk
{
  "type": "ai_response_chunk",
  "message_id": "msg-126",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "chunk": "Hello! I'd be happy to help you",
  "full_content": "Hello! I'd be happy to help you"
}

// AI response complete
{
  "type": "ai_response_complete",
  "message": {
    "id": "msg-126",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_id": null,
    "content": "Hello! I'd be happy to help you with your Python questions.",
    "message_type": "AI",
    "ai_model_used": "gpt-4",
    "tokens_used": 15,
    "processing_time_ms": 1250,
    "created_at": "2024-01-01T12:31:15Z",
    "status": "DELIVERED",
    "is_streaming": false
  }
}

// Typing indicator
{
  "type": "typing_indicator",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-456",
  "username": "johndoe",
  "timestamp": "2024-01-01T12:31:30Z"
}

// Pong response
{
  "type": "pong",
  "timestamp": "2024-01-01T12:00:00Z",
  "server_time": "2024-01-01T12:00:15Z"
}
```

---

## Chat Participants & Status

### 7. Get Chat Participants

**Endpoint**: `GET /api/v1/chat/chats/{chat_id}/participants`  
**Summary**: Get chat participants with their status and permissions  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns list of all active participants in the chat with their roles, permissions, and activity status.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat

**Successful Response (200)**:
```json
{
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "participants": [
    {
      "user_id": "user-456",
      "role": "OWNER",
      "joined_at": "2024-01-01T12:00:00Z",
      "can_send_messages": true,
      "can_upload_files": true,
      "message_count": 25,
      "last_read_at": "2024-01-01T12:30:00Z"
    }
  ],
  "total_participants": 1
}
```

**Responses**:
- **200 OK**: Participants retrieved successfully
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Access denied to this chat
- **500 Internal Server Error**: Server error

---

## Testing & Monitoring Endpoints

### 8. Get Chat System Statistics

**Endpoint**: `GET /api/v1/chat/stats`  
**Summary**: Get chat system statistics and WebSocket connections  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns real-time statistics about the chat system including WebSocket connections, active chats, and system status.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "websocket_connections": {
    "total_connections": 15,
    "active_chats": 8,
    "connections_per_chat": {
      "chat-123": 2,
      "chat-456": 1,
      "chat-789": 3
    }
  },
  "system_status": "operational",
  "timestamp": "2024-01-01T12:31:45Z"
}
```

---

### 9. Test Chat Connection

**Endpoint**: `POST /api/v1/chat/test/connection`  
**Summary**: Test chat system connectivity and user's API keys  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Comprehensive test of chat system components including database connectivity, WebSocket manager, and OpenAI API key validation.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "Chat system connectivity test completed",
  "data": {
    "database": {
      "status": "healthy",
      "response_time_ms": 5
    },
    "websocket_manager": {
      "status": "operational",
      "connections": {
        "total_connections": 15,
        "active_chats": 8
      }
    },
    "openai_api": {
      "success": true,
      "message": "Connection test completed successfully",
      "model_info": {
        "model": "gpt-4",
        "max_tokens": 2048,
        "temperature": 0.7
      },
      "response_time_ms": 245
    },
    "user_id": "user-456",
    "username": "johndoe"
  },
  "timestamp": "2024-01-01T12:32:00Z"
}
```

---

### 10. WebSocket Test Endpoint

**Endpoint**: `GET /api/v1/chat/websocket/test/{chat_id}`  
**Summary**: Generate WebSocket test URL and connection instructions  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Provides WebSocket connection URL with authentication token and testing instructions for developers.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat to test

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "WebSocket test endpoint ready",
  "data": {
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "websocket_url": "ws://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000/ws?token=eyJhbGciOiJIUzI1NiIs...",
    "test_instructions": {
      "1": "Use the WebSocket URL above to connect",
      "2": "Send a ping message: {\"type\": \"ping\", \"timestamp\": \"2024-01-01T00:00:00Z\"}",
      "3": "You should receive a pong response",
      "4": "Connection will be authenticated and validated for chat access"
    },
    "authentication": {
      "method": "JWT token in query parameter",
      "parameter": "token",
      "token_provided": true,
      "user_id": "user-456"
    }
  },
  "timestamp": "2024-01-01T12:32:15Z"
}
```

---

## Request/Response Schemas

### CreateChatRequest
```json
{
  "title": "string (required, 1-200 chars)",
  "description": "string (optional, max 1000 chars)",
  "chat_type": "string (DIRECT, GROUP, CHANNEL, default: DIRECT)",
  "ai_model": "string (default: gpt-3.5-turbo)",
  "ai_persona": "string (optional)",
  "system_prompt": "string (optional)",
  "temperature": "float (0.0-1.0, default: 0.7)",
  "max_tokens": "integer (1-32000, default: 2048)",
  "is_private": "boolean (default: false)",
  "tags": "array of strings (optional)"
}
```

### SendMessageRequest
```json
{
  "content": "string (required, 1-50000 chars)",
  "message_type": "string (USER, AI, SYSTEM, default: USER)",
  "reply_to_id": "string (optional)",
  "message_metadata": "object (optional)"
}
```

### ChatResponse
```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string | null",
  "chat_type": "string",
  "ai_model": "string | null",
  "ai_persona": "string | null",
  "message_count": "integer",
  "last_activity_at": "string (ISO datetime)",
  "created_at": "string (ISO datetime)",
  "is_private": "boolean",
  "tags": "array of strings | null"
}
```

### MessageResponse
```json
{
  "id": "string (UUID)",
  "chat_id": "string (UUID)",
  "sender_id": "string (UUID) | null",
  "content": "string",
  "message_type": "string",
  "ai_model_used": "string | null",
  "tokens_used": "integer | null",
  "processing_time_ms": "integer | null",
  "status": "string",
  "created_at": "string (ISO datetime)",
  "is_edited": "boolean"
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request or missing data
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Access denied to resource
- **404 Not Found**: Resource not found
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

### WebSocket Error Messages
```json
{
  "type": "ai_error",
  "error": "Please set up your OpenAI API key in Settings to enable AI responses.",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "error_code": "no_api_key",
  "timestamp": "2024-01-01T12:32:30Z"
}
```

---

## AI Integration Features

### 1. Streaming Responses
- **Real-time streaming**: AI responses are streamed word-by-word via WebSocket
- **Progressive display**: Clients can display responses as they are generated
- **Cancellation support**: Responses can be interrupted if needed

### 2. Model Configuration
- **Multiple models**: Support for GPT-3.5 Turbo, GPT-4, and other OpenAI models
- **Custom parameters**: Configurable temperature, max tokens, and system prompts
- **Per-chat settings**: Each chat can have different AI configurations

### 3. Context Management
- **Chat history**: AI maintains context using recent message history
- **System prompts**: Custom system prompts for specialized AI personas
- **Token optimization**: Automatic token counting and management

### 4. Security & Privacy
- **User API keys**: Each user provides their own OpenAI API key
- **Encrypted storage**: API keys are encrypted before storage
- **Private chats**: Support for private chat conversations

---

## Examples

### Complete Chat Flow Example

#### 1. Create a Chat
```bash
curl -X POST "http://localhost:8000/api/v1/chat/chats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Learning Chat",
    "description": "Chat about Python programming",
    "ai_model": "gpt-4",
    "system_prompt": "You are a Python programming tutor",
    "temperature": 0.7,
    "max_tokens": 2048
  }'
```

#### 2. Send a Message
```bash
curl -X POST "http://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000/messages" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Can you explain Python decorators?",
    "message_type": "USER"
  }'
```

#### 3. Connect via WebSocket
```javascript
const websocket = new WebSocket(
  'ws://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000/ws?token=your_jwt_token'
);

websocket.onopen = function(event) {
  console.log('Connected to chat');
};

websocket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  if (data.type === 'ai_response_chunk') {
    // Display streaming AI response
    appendToResponse(data.chunk);
  } else if (data.type === 'new_message') {
    // Display new message
    displayMessage(data.message);
  }
};

// Send ping message
websocket.send(JSON.stringify({
  type: 'ping',
  timestamp: new Date().toISOString()
}));
```

#### 4. Get Chat History
```bash
curl -X GET "http://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000?limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 5. Test Connection
```bash
curl -X POST "http://localhost:8000/api/v1/chat/test/connection" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 6. Chat with AI (Production)
```bash
# Non-streaming response
curl -X POST "http://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000/ai-message" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain how neural networks work?",
    "stream": false,
    "save_to_history": true
  }'

# Streaming response (WebSocket required)
curl -X POST "http://localhost:8000/api/v1/chat/chats/123e4567-e89b-12d3-a456-426614174000/ai-message" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain machine learning in simple terms",
    "stream": true,
    "save_to_history": true
  }'
```

#### 7. Test Direct OpenAI Integration
```bash
curl -X POST "http://localhost:8000/api/v1/chat/openai/test" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the benefits of using direct OpenAI API for AI applications?",
    "model": "gpt-4",
    "temperature": 0.7,
    "system_prompt": "You are an expert in AI development. Provide detailed technical explanations."
  }'
```

---

## Notes

1. **WebSocket Authentication**: WebSocket connections require JWT token authentication
2. **AI Integration**: Requires user's OpenAI API key for AI responses
3. **Rate Limiting**: Chat endpoints have rate limiting to prevent abuse
4. **Message Limits**: Messages have character limits (50,000 chars max)
5. **Real-time Updates**: Use WebSocket connections for real-time chat experience
6. **Token Management**: AI responses consume tokens from user's OpenAI quota
7. **Connection Timeouts**: WebSocket connections have 5-minute timeout for inactivity

---

### 11. Chat with AI (Production)

**Endpoint**: `POST /api/v1/chat/chats/{chat_id}/ai-message`  
**Summary**: Send message to AI and get response in production chat  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Production endpoint for chatting with AI in a specific chat. Sends a message to AI and returns response, with options for streaming and saving to chat history. This is the main endpoint used by frontend for AI chat functionality.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters**:
- `chat_id` (required): Unique identifier of the chat

**Request Body**:
```json
{
  "message": "Hello! Can you explain the concept of machine learning?",
  "stream": false,
  "save_to_history": true
}
```

**Request Body Schema**:
- `message` (string, required): Message to send to AI (1-50000 chars)
- `stream` (boolean, optional): Whether to stream the response via WebSocket (default: false)
- `save_to_history` (boolean, optional): Whether to save messages to chat history (default: true)

**Successful Response - Non-Streaming (200)**:
```json
{
  "success": true,
  "message": "AI response generated successfully",
  "streaming": false,
  "data": {
    "user_message": {
      "id": "msg-123",
      "content": "Hello! Can you explain the concept of machine learning?",
      "timestamp": "2024-01-01T12:35:00Z"
    },
    "ai_response": {
      "id": "msg-124",
      "content": "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from data without being explicitly programmed...",
      "model_used": "gpt-4",
      "processing_time_ms": 1250,
      "tokens_used": {
        "input": 45,
        "output": 120,
        "total": 165
      },
      "finish_reason": "stop",
      "timestamp": "2024-01-01T12:35:15Z"
    },
    "chat_info": {
      "chat_id": "123e4567-e89b-12d3-a456-426614174000",
      "total_messages": 25,
      "total_tokens_used": 2450
    }
  },
  "timestamp": "2024-01-01T12:35:15Z"
}
```

**Successful Response - Streaming (200)**:
```json
{
  "success": true,
  "message": "AI response generation started",
  "streaming": true,
  "data": {
    "user_message_id": "msg-123",
    "ai_message_id": "msg-124",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "model_used": "gpt-4",
    "stream_via": "websocket"
  },
  "timestamp": "2024-01-01T12:35:00Z"
}
```

**WebSocket Streaming Messages**:
When `stream: true`, the AI response will be sent via WebSocket in real-time:

```json
// AI Response Start
{
  "type": "ai_response_start",
  "message": {
    "id": "msg-124",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_id": null,
    "content": "",
    "message_type": "AI",
    "ai_model_used": "gpt-4",
    "created_at": "2024-01-01T12:35:15Z",
    "status": "PROCESSING",
    "is_streaming": true
  }
}

// AI Response Chunks (multiple)
{
  "type": "ai_response_chunk",
  "message_id": "msg-124",
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "chunk": "Machine learning is",
  "full_content": "Machine learning is"
}

// AI Response Complete
{
  "type": "ai_response_complete",
  "message": {
    "id": "msg-124",
    "chat_id": "123e4567-e89b-12d3-a456-426614174000",
    "sender_id": null,
    "content": "Machine learning is a subset of artificial intelligence...",
    "message_type": "AI",
    "ai_model_used": "gpt-4",
    "tokens_used": 165,
    "processing_time_ms": 1250,
    "created_at": "2024-01-01T12:35:15Z",
    "status": "DELIVERED",
    "is_streaming": false
  }
}
```

**Responses**:
- **200 OK**: AI response generated successfully
- **400 Bad Request**: OpenAI API key not configured or invalid message
- **401 Unauthorized**: Invalid or expired access token
- **403 Forbidden**: Access denied to this chat
- **404 Not Found**: Chat not found
- **500 Internal Server Error**: AI service error

---

### 12. OpenAI Direct Integration Test

**Endpoint**: `POST /api/v1/chat/openai/test`  
**Summary**: Test direct OpenAI API integration  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Tests the direct OpenAI API integration by sending a message to OpenAI API. This endpoint demonstrates how to use OpenAI API directly with user's OpenAI API key for chat functionality.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "Hello, can you explain what machine learning is?",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "system_prompt": "You are a helpful AI assistant specialized in explaining technical concepts."
}
```

**Request Body Schema**:
- `message` (string, required): Test message to send to OpenAI (1-1000 chars)
- `model` (string, optional): OpenAI model to use (default: "gpt-3.5-turbo")
- `temperature` (float, optional): Temperature for response generation (0.0-2.0, default: 0.7)
- `system_prompt` (string, optional): System prompt to guide the AI response

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "OpenAI direct API test completed successfully",
  "data": {
    "request": {
      "message": "Hello, can you explain what machine learning is?",
      "model": "gpt-3.5-turbo",
      "temperature": 0.7,
      "system_prompt": "You are a helpful AI assistant specialized in explaining technical concepts."
    },
    "response": {
      "content": "Machine learning is a subset of artificial intelligence (AI) that enables computers to learn and make decisions or predictions without being explicitly programmed for each specific task...",
      "model_used": "gpt-3.5-turbo",
      "processing_time_ms": 1250,
      "tokens_used": {
        "input": 45,
        "output": 120,
        "total": 165
      },
      "finish_reason": "stop"
    },
    "user_info": {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "johndoe"
    },
    "api_info": {
      "integration_type": "Direct OpenAI API",
      "messages_count": 2,
      "has_system_prompt": true,
      "openai_response_id": "chatcmpl-8abc123def456"
    }
  },
  "timestamp": "2024-01-01T12:35:00Z"
}
```

**Error Response (400) - No API Key**:
```json
{
  "detail": "OpenAI API key not configured. Please set up your API key in Settings first."
}
```

**Error Response (200) - API Error**:
```json
{
  "success": false,
  "error": "Invalid OpenAI API key. Please check your API key in Settings.",
  "error_code": "invalid_api_key",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "model_requested": "gpt-3.5-turbo",
  "timestamp": "2024-01-01T12:35:00Z"
}
```

**Responses**:
- **200 OK**: Test completed (check success field for result)
- **400 Bad Request**: OpenAI API key not configured
- **401 Unauthorized**: Invalid or expired access token
- **500 Internal Server Error**: Server error

---

## Support

For questions or issues related to the Chat API, please refer to the main project documentation or contact the development team.

**Last Updated**: 2025-08-07  
**API Version**: 1.0.0