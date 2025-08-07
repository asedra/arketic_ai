# Arketic AI/ML Backend - Authentication API Documentation

## Overview

This document provides comprehensive documentation for the Authentication API endpoints in the Arketic AI/ML Backend platform. The API uses JWT-based authentication with access and refresh tokens, implementing industry-standard security practices including rate limiting and account protection.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication Method**: HTTP Bearer Token

---

## Table of Contents

1. [Authentication Methods](#authentication-methods)
2. [Core Authentication Endpoints](#core-authentication-endpoints)
3. [Session Management Endpoints](#session-management-endpoints)
4. [Request/Response Schemas](#requestresponse-schemas)
5. [Error Handling](#error-handling)
6. [Security Features](#security-features)
7. [Examples](#examples)

---

## Authentication Methods

### HTTP Bearer Token

The API uses HTTP Bearer token authentication for protected endpoints.

**Header Format**:
```
Authorization: Bearer <access_token>
```

**Security Scheme**:
- Type: HTTP Bearer
- Scheme: bearer

---

## Core Authentication Endpoints

### 1. User Login

**Endpoint**: `POST /api/v1/auth/login`  
**Summary**: Authenticate user and return access/refresh tokens  
**Authentication**: None required  

**Description**: Validates user credentials and returns JWT tokens for API access. Implements security measures like rate limiting and account locking.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "remember_me": false
}
```

**Successful Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "role": "user"
  }
}
```

**Responses**:
- **200 OK**: Authentication successful
- **422 Validation Error**: Invalid credentials or input data

---

### 2. Refresh Access Token

**Endpoint**: `POST /api/v1/auth/refresh`  
**Summary**: Refresh access token using refresh token  
**Authentication**: None required  

**Description**: Exchanges a valid refresh token for a new access token. Implements token rotation for enhanced security.

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Successful Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "role": "user"
  }
}
```

**Responses**:
- **200 OK**: Token refresh successful
- **401 Unauthorized**: Invalid or expired refresh token

---

## Session Management Endpoints

### 3. Get Current Session

**Endpoint**: `GET /api/v1/auth/me`  
**Summary**: Get current user session information  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns detailed information about the current authenticated user and session.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "johndoe",
  "roles": ["user"],
  "permissions": ["read", "write"],
  "expires_at": "2024-01-01T13:00:00Z",
  "issued_at": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **200 OK**: Session information returned
- **401 Unauthorized**: Invalid or expired access token

---

### 4. Validate Token

**Endpoint**: `GET /api/v1/auth/validate`  
**Summary**: Validate current access token  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns token validation status and user information. Used for client-side token validation.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Successful Response (200)**:
```json
{
  "valid": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "roles": ["user"],
    "permissions": ["read", "write"]
  },
  "expires_at": "2024-01-01T13:00:00Z",
  "validated_at": "2024-01-01T12:00:00Z"
}
```

**Responses**:
- **200 OK**: Token is valid
- **401 Unauthorized**: Token is invalid or expired

---

## Request/Response Schemas

### LoginRequest
```json
{
  "email": "string (email format, required)",
  "password": "string (required)",
  "remember_me": "boolean (default: false)"
}
```

### TokenResponse
```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string (JWT)",
  "token_type": "string (default: bearer)",
  "expires_in": "integer (seconds)",
  "user": {
    "id": "string (UUID)",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "username": "string",
    "role": "string"
  }
}
```

### RefreshTokenRequest
```json
{
  "refresh_token": "string (JWT, required)"
}
```

### SessionInfo
```json
{
  "user_id": "string (UUID)",
  "email": "string",
  "username": "string | null",
  "roles": ["string"],
  "permissions": ["string"],
  "expires_at": "string (ISO datetime)",
  "issued_at": "string (ISO datetime)"
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **401 Unauthorized**: Authentication required or invalid
- **403 Forbidden**: Access denied
- **422 Validation Error**: Input validation failed
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

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

## Security Features

### 1. JWT Token Security
- **Access Tokens**: Short-lived (30 minutes default)
- **Refresh Tokens**: Longer-lived with rotation
- **Token Revocation**: Supports token revocation

### 2. Password Security
- **Minimum Length**: 8 characters
- **Complexity**: Recommended to include uppercase, lowercase, numbers, and special characters
- **Hashing**: Uses secure password hashing algorithms

### 3. Rate Limiting
- **Login Attempts**: Limited attempts per IP/user
- **Account Lockout**: Temporary lockout after failed attempts
- **API Rate Limits**: Request throttling per user/IP

### 4. Session Management
- **Multi-Session Support**: Users can have multiple active sessions
- **Token Rotation**: Refresh tokens are rotated for security

---

## Examples

### Complete Authentication Flow

#### 1. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "remember_me": false
  }'
```

#### 2. Use Access Token for Protected Endpoints
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. Validate Token
```bash
curl -X GET "http://localhost:8000/api/v1/auth/validate" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 4. Refresh Token
```bash
curl -X POST "http://localhost:8000/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

---

## Notes

1. **Token Expiration**: Always check token expiration and implement refresh logic
2. **Error Handling**: Implement proper error handling for all authentication flows
3. **Security**: Store tokens securely (use httpOnly cookies or secure storage)
4. **HTTPS**: Always use HTTPS in production environments
5. **Rate Limiting**: Be aware of rate limits and implement appropriate retry logic

---

## Support

For questions or issues related to the Authentication API, please refer to the main project documentation or contact the development team.

**Last Updated**: 2025-01-07  
**API Version**: 1.0.0