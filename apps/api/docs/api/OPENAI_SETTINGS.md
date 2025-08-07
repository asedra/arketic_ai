# Arketic AI/ML Backend - OpenAI Settings API Documentation

## Overview

This document provides comprehensive documentation for the OpenAI Settings API endpoints in the Arketic AI/ML Backend platform. The API manages OpenAI API keys and model configurations for authenticated users, implementing secure key storage with encryption and providing connection testing capabilities.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication Method**: HTTP Bearer Token

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Core Settings Management Endpoints](#core-settings-management-endpoints)
3. [Settings Retrieval Endpoints](#settings-retrieval-endpoints)
4. [Testing and Validation Endpoints](#testing-and-validation-endpoints)
5. [Request/Response Schemas](#requestresponse-schemas)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Examples](#examples)

---

## Authentication Requirements

### HTTP Bearer Token

All OpenAI Settings endpoints require authentication using HTTP Bearer tokens.

**Header Format**:
```
Authorization: Bearer <access_token>
```

**Security Scheme**:
- Type: HTTP Bearer
- Scheme: bearer

---

## Core Settings Management Endpoints

### 1. Update OpenAI Settings

**Endpoint**: `POST /api/v1/openai-settings/settings/openai`  
**Summary**: Update OpenAI API key and model configuration  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Saves or updates the user's OpenAI API key along with model preferences. The API key is encrypted before storage and associated with the specified model configuration.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "model": "gpt-4",
  "max_tokens": 2000,
  "temperature": 0.8
}
```

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "OpenAI settings updated successfully",
  "data": {
    "model": "gpt-4",
    "max_tokens": 2000,
    "temperature": 0.8,
    "user_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Responses**:
- **200 OK**: Settings updated successfully
- **401 Unauthorized**: Invalid or expired access token
- **422 Validation Error**: Invalid API key format or parameters
- **500 Internal Server Error**: Database or encryption error

---

### 2. Update OpenAI Key (PUT)

**Endpoint**: `PUT /api/v1/openai-settings/settings/openai-key`  
**Summary**: Update OpenAI settings using PUT method  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Alternative endpoint for updating OpenAI settings using PUT method instead of POST. Functionally identical to the POST endpoint.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**: Same as POST endpoint above

**Successful Response (200)**: Same as POST endpoint above

**Responses**:
- **200 OK**: Settings updated successfully
- **401 Unauthorized**: Invalid or expired access token
- **422 Validation Error**: Invalid input data
- **500 Internal Server Error**: Server error

---

### 3. Set OpenAI Settings (Alternative)

**Endpoint**: `POST /api/v1/openai-settings/openai/settings`  
**Summary**: Set OpenAI settings using alternative endpoint path  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Alternative endpoint path for setting OpenAI configurations. Provides the same functionality as the main settings endpoint.

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**: Same as main settings endpoint

**Successful Response (200)**: Same as main settings endpoint

---

### 4. Clear OpenAI Settings

**Endpoint**: `DELETE /api/v1/openai-settings/settings/openai`  
**Summary**: Remove all OpenAI settings for current user  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Permanently deletes all stored OpenAI API keys and settings for the authenticated user. This action cannot be undone.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "OpenAI settings cleared successfully"
}
```

**Alternative Response (No Settings Found)**:
```json
{
  "success": true,
  "message": "No OpenAI settings found to clear"
}
```

**Responses**:
- **200 OK**: Settings cleared successfully
- **401 Unauthorized**: Invalid or expired access token
- **500 Internal Server Error**: Database error

---

## Settings Retrieval Endpoints

### 5. Get User Settings

**Endpoint**: `GET /api/v1/openai-settings/settings`  
**Summary**: Retrieve all user settings with OpenAI focus  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns comprehensive user settings with emphasis on OpenAI configuration. API keys are masked for security.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "openai": {
    "api_key": "sk-•••••••••••••••••••••••••••••••••••••••••••••xxxx",
    "model": "gpt-4",
    "max_tokens": 2000,
    "temperature": 0.8,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

**Response (No Settings)**:
```json
{
  "openai": null
}
```

**Responses**:
- **200 OK**: Settings retrieved successfully
- **401 Unauthorized**: Invalid or expired access token
- **500 Internal Server Error**: Server error

---

### 6. Get OpenAI Settings (Alternative)

**Endpoint**: `GET /api/v1/openai-settings/openai/settings`  
**Summary**: Get OpenAI settings using alternative path  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Alternative endpoint path for retrieving OpenAI settings specifically.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "api_key": "sk-•••••••••••••••••••••••••••••••••••••••••••••xxxx",
  "model": "gpt-4",
  "max_tokens": 2000,
  "temperature": 0.8,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

**Response (No Settings)**:
```json
{}
```

---

### 7. Get OpenAI Key Settings

**Endpoint**: `GET /api/v1/openai-settings/settings/openai-key`  
**Summary**: Get OpenAI key-specific settings  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Retrieves OpenAI API key and associated settings for the authenticated user.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**: Same as alternative endpoint above

---

## Testing and Validation Endpoints

### 8. Test OpenAI Connection

**Endpoint**: `POST /api/v1/openai-settings/settings/test-openai`  
**Summary**: Test OpenAI API connection with stored settings  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Validates the stored OpenAI API key by making a test connection to the OpenAI API. Measures response time and updates usage statistics.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "success": true,
  "message": "Connection test completed successfully",
  "model_info": {
    "model": "gpt-4",
    "max_tokens": 2000,
    "temperature": 0.8
  },
  "response_time_ms": 245
}
```

**Failed Response (200)**:
```json
{
  "success": false,
  "message": "Invalid API key or insufficient permissions",
  "model_info": null,
  "response_time_ms": 1200
}
```

**Responses**:
- **200 OK**: Test completed (check success field for result)
- **400 Bad Request**: No API key found or decryption failed
- **401 Unauthorized**: Invalid or expired access token
- **500 Internal Server Error**: Server error during test

---

## Request/Response Schemas

### OpenAISettingsRequest
```json
{
  "api_key": "string (required, starts with 'sk-', min 20 chars)",
  "model": "string (required, allowed: gpt-3.5-turbo, gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini)",
  "max_tokens": "integer (required, 1-8192, default: 1000)",
  "temperature": "float (required, 0.0-2.0, default: 0.7)"
}
```

### OpenAISettingsResponse
```json
{
  "api_key": "string (masked for security)",
  "model": "string",
  "max_tokens": "integer",
  "temperature": "float",
  "created_at": "string (ISO datetime)",
  "updated_at": "string (ISO datetime)"
}
```

### SettingsResponse
```json
{
  "openai": "OpenAISettingsResponse | null"
}
```

### ConnectionTestResponse
```json
{
  "success": "boolean",
  "message": "string",
  "model_info": "object | null",
  "response_time_ms": "integer | null"
}
```

### SuccessResponse
```json
{
  "success": "boolean",
  "message": "string",
  "data": "object (optional)"
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request or missing data
- **401 Unauthorized**: Authentication required or invalid
- **422 Validation Error**: Input validation failed
- **500 Internal Server Error**: Server error

### Validation Error Response
```json
{
  "detail": [
    {
      "loc": ["api_key"],
      "msg": "Invalid OpenAI API key format",
      "type": "value_error"
    }
  ]
}
```

### Standard Error Response
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Security Features

### 1. API Key Security
- **Encryption**: All API keys encrypted at rest using AES encryption
- **Masking**: Keys are masked when returned in API responses
- **Hashing**: Key verification hashes stored for validation
- **Secure Storage**: Keys stored in encrypted database fields

### 2. Input Validation
- **Format Validation**: API keys must start with 'sk-' and meet length requirements
- **Model Validation**: Only approved OpenAI models are accepted
- **Parameter Validation**: Token limits and temperature values are validated
- **Sanitization**: All inputs are sanitized before processing

### 3. Authentication & Authorization
- **JWT Bearer Tokens**: All endpoints require valid authentication
- **User Isolation**: Users can only access their own settings
- **Token Validation**: Access tokens are validated on each request

### 4. Usage Tracking
- **Connection Tests**: Track API key usage and test results
- **Audit Trail**: Record creation and update timestamps
- **Error Monitoring**: Log failed connection attempts

---

## Examples

### Complete Settings Management Flow

#### 1. Save OpenAI Settings
```bash
curl -X POST "http://localhost:8000/api/v1/openai-settings/settings/openai" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "model": "gpt-4",
    "max_tokens": 2000,
    "temperature": 0.8
  }'
```

#### 2. Retrieve Settings
```bash
curl -X GET "http://localhost:8000/api/v1/openai-settings/settings" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. Test Connection
```bash
curl -X POST "http://localhost:8000/api/v1/openai-settings/settings/test-openai" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 4. Update Existing Settings
```bash
curl -X PUT "http://localhost:8000/api/v1/openai-settings/settings/openai-key" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "model": "gpt-4-turbo",
    "max_tokens": 4000,
    "temperature": 0.5
  }'
```

#### 5. Clear All Settings
```bash
curl -X DELETE "http://localhost:8000/api/v1/openai-settings/settings/openai" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Error Handling Examples

#### Invalid API Key Format
```bash
# Request
curl -X POST "http://localhost:8000/api/v1/openai-settings/settings/openai" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"api_key": "invalid-key", "model": "gpt-4"}'

# Response (422)
{
  "detail": [
    {
      "loc": ["api_key"],
      "msg": "Invalid OpenAI API key format",
      "type": "value_error"
    }
  ]
}
```

#### Unauthorized Access
```bash
# Request without valid token
curl -X GET "http://localhost:8000/api/v1/openai-settings/settings"

# Response (401)
{
  "detail": "Not authenticated"
}
```

---

## Notes

1. **API Key Security**: API keys are encrypted before storage and never returned in plain text
2. **Model Support**: Only officially supported OpenAI models are accepted
3. **Connection Testing**: Test endpoints validate API keys without storing chat data
4. **Multiple Endpoints**: Several endpoint paths are provided for frontend compatibility
5. **Usage Tracking**: Connection tests update usage statistics for monitoring

---

## Support

For questions or issues related to the OpenAI Settings API, please refer to the main project documentation or contact the development team.

**Last Updated**: 2025-01-07  
**API Version**: 1.0.0