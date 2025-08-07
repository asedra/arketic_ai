# Arketic AI/ML Backend - People Management API Documentation

## Overview

This document provides comprehensive documentation for the People Management API endpoints in the Arketic AI/ML Backend platform. The API manages employee/person records within organizations, including CRUD operations, hierarchy management, and bulk operations. All endpoints require authentication and operate within the context of the user's organization.

**Base URL**: `http://localhost:8000`  
**API Version**: v1  
**Authentication Method**: HTTP Bearer Token

---

## Table of Contents

1. [Authentication Requirements](#authentication-requirements)
2. [Core CRUD Endpoints](#core-crud-endpoints)
3. [Search and Filtering](#search-and-filtering)
4. [Bulk Operations](#bulk-operations)
5. [Statistics and Hierarchy](#statistics-and-hierarchy)
6. [Request/Response Schemas](#requestresponse-schemas)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Authentication Requirements

All People Management endpoints require HTTP Bearer token authentication with valid organization access.

**Header Format**:
```
Authorization: Bearer <access_token>
```

**Security Scheme**:
- Type: HTTP Bearer
- Scheme: bearer
- Organization Context: Required (user must belong to an organization)

---

## Core CRUD Endpoints

### 1. Create Person

**Endpoint**: `POST /api/v1/organization/people/`  
**Summary**: Create a new person in the organization  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Creates a new person record in the current user's organization. Validates email uniqueness within the organization and enforces data validation rules.

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "employee_id": "EMP001",
  "role": "user",
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in the backend team"
}
```

**Successful Response (201)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "organization_id": "456e7890-e89b-12d3-a456-426614174000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "employee_id": "EMP001",
  "role": "user",
  "status": "active",
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in the backend team",
  "full_name": "John Doe",
  "is_active": true,
  "is_manager": false,
  "created_at": "2024-01-07T10:00:00Z",
  "updated_at": "2024-01-07T10:00:00Z"
}
```

**Responses**:
- **201 Created**: Person created successfully
- **409 Conflict**: Email already exists in organization
- **422 Validation Error**: Invalid input data
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 2. List People

**Endpoint**: `GET /api/v1/organization/people/`  
**Summary**: List people in the organization with filtering and pagination  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Retrieves a paginated list of people in the organization with support for search queries and various filters.

**Query Parameters**:
- `query` (optional): Search query for name, email, or job title
- `department` (optional): Filter by department
- `role` (optional): Filter by role (admin, manager, user)
- `status` (optional): Filter by status (active, inactive, pending)
- `manager_id` (optional): Filter by manager UUID
- `page` (optional, default=1): Page number (≥1)
- `page_size` (optional, default=20): Items per page (1-100)
- `sort_by` (optional, default="last_name"): Sort field
- `sort_order` (optional, default="asc"): Sort order (asc|desc)

**Successful Response (200)**:
```json
{
  "people": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "organization_id": "456e7890-e89b-12d3-a456-426614174000",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-123-4567",
      "job_title": "Software Engineer",
      "department": "Engineering",
      "site": "San Francisco Office",
      "location": "San Francisco, CA",
      "employee_id": "EMP001",
      "role": "user",
      "status": "active",
      "manager_id": "123e4567-e89b-12d3-a456-426614174001",
      "hire_date": "2024-01-15T00:00:00Z",
      "notes": "New hire in the backend team",
      "full_name": "John Doe",
      "is_active": true,
      "is_manager": false,
      "created_at": "2024-01-07T10:00:00Z",
      "updated_at": "2024-01-07T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 20,
  "total_pages": 2
}
```

**Responses**:
- **200 OK**: People list retrieved successfully
- **422 Validation Error**: Invalid query parameters
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 3. Get Person by ID

**Endpoint**: `GET /api/v1/people/{person_id}`  
**Summary**: Get a specific person by ID  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Retrieves detailed information about a specific person within the organization.

**Path Parameters**:
- `person_id` (UUID): The unique identifier of the person

**Successful Response (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "organization_id": "456e7890-e89b-12d3-a456-426614174000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-123-4567",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "employee_id": "EMP001",
  "role": "user",
  "status": "active",
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in the backend team",
  "full_name": "John Doe",
  "is_active": true,
  "is_manager": false,
  "created_at": "2024-01-07T10:00:00Z",
  "updated_at": "2024-01-07T10:00:00Z"
}
```

**Responses**:
- **200 OK**: Person found and returned
- **404 Not Found**: Person not found in organization
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 4. Update Person

**Endpoint**: `PUT /api/v1/people/{person_id}`  
**Summary**: Update a person's information  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Updates an existing person's information. All fields are optional - only provided fields will be updated.

**Path Parameters**:
- `person_id` (UUID): The unique identifier of the person

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1-555-987-6543",
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "site": "New York Office",
  "location": "New York, NY",
  "employee_id": "EMP001",
  "role": "manager",
  "status": "active",
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "Promoted to senior engineer"
}
```

**Successful Response (200)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "organization_id": "456e7890-e89b-12d3-a456-426614174000",
  "first_name": "John",
  "last_name": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1-555-987-6543",
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "site": "New York Office",
  "location": "New York, NY",
  "employee_id": "EMP001",
  "role": "manager",
  "status": "active",
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "Promoted to senior engineer",
  "full_name": "John Smith",
  "is_active": true,
  "is_manager": true,
  "created_at": "2024-01-07T10:00:00Z",
  "updated_at": "2024-01-07T14:30:00Z"
}
```

**Responses**:
- **200 OK**: Person updated successfully
- **404 Not Found**: Person not found in organization
- **409 Conflict**: Email conflict or validation error
- **422 Validation Error**: Invalid input data
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 5. Delete Person

**Endpoint**: `DELETE /api/v1/people/{person_id}`  
**Summary**: Delete a person from the organization  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Removes a person from the organization. This is typically a soft delete operation.

**Path Parameters**:
- `person_id` (UUID): The unique identifier of the person

**Successful Response (204)**:
```
No content returned
```

**Responses**:
- **204 No Content**: Person deleted successfully
- **404 Not Found**: Person not found in organization
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

## Search and Filtering

### Advanced Search Features

The list people endpoint supports comprehensive filtering:

**Text Search**: The `query` parameter searches across:
- First name
- Last name  
- Email address
- Job title

**Filters Available**:
- **Department**: Exact match filter
- **Role**: Filter by user role (admin, manager, user)
- **Status**: Filter by status (active, inactive, pending)
- **Manager**: Filter by manager ID

**Sorting Options**:
- **sort_by**: last_name, first_name, email, job_title, hire_date, created_at
- **sort_order**: asc (ascending) or desc (descending)

---

## Bulk Operations

### 6. Bulk Create People

**Endpoint**: `POST /api/v1/people/bulk`  
**Summary**: Create multiple people at once  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Creates multiple people in a single operation. Useful for importing employee data.

**Request Body**:
```json
{
  "people": [
    {
      "first_name": "Alice",
      "last_name": "Johnson",
      "email": "alice.johnson@example.com",
      "job_title": "Product Manager",
      "department": "Product"
    },
    {
      "first_name": "Bob",
      "last_name": "Wilson",
      "email": "bob.wilson@example.com",
      "job_title": "Designer",
      "department": "Design"
    }
  ]
}
```

**Successful Response (201)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "organization_id": "456e7890-e89b-12d3-a456-426614174000",
    "first_name": "Alice",
    "last_name": "Johnson",
    "email": "alice.johnson@example.com",
    "job_title": "Product Manager",
    "department": "Product",
    "full_name": "Alice Johnson",
    "status": "active",
    "is_active": true,
    "is_manager": false,
    "created_at": "2024-01-07T10:00:00Z",
    "updated_at": "2024-01-07T10:00:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "organization_id": "456e7890-e89b-12d3-a456-426614174000",
    "first_name": "Bob",
    "last_name": "Wilson",
    "email": "bob.wilson@example.com",
    "job_title": "Designer",
    "department": "Design",
    "full_name": "Bob Wilson",
    "status": "active",
    "is_active": true,
    "is_manager": false,
    "created_at": "2024-01-07T10:00:00Z",
    "updated_at": "2024-01-07T10:00:00Z"
  }
]
```

**Limits**:
- Minimum: 1 person
- Maximum: 100 people per request

**Responses**:
- **201 Created**: People created successfully
- **422 Validation Error**: Invalid input data or validation failures
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 7. Bulk Update People

**Endpoint**: `PUT /api/v1/people/bulk`  
**Summary**: Update multiple people with same changes  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Applies the same updates to multiple people simultaneously. Useful for bulk operations like department changes.

**Request Body**:
```json
{
  "person_ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ],
  "updates": {
    "department": "Engineering",
    "site": "Remote",
    "status": "active"
  }
}
```

**Successful Response (200)**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "organization_id": "456e7890-e89b-12d3-a456-426614174000",
    "first_name": "Alice",
    "last_name": "Johnson",
    "email": "alice.johnson@example.com",
    "job_title": "Product Manager",
    "department": "Engineering",
    "site": "Remote",
    "status": "active",
    "full_name": "Alice Johnson",
    "is_active": true,
    "is_manager": false,
    "created_at": "2024-01-07T10:00:00Z",
    "updated_at": "2024-01-07T15:00:00Z"
  }
]
```

**Limits**:
- Minimum: 1 person ID
- Maximum: 100 person IDs per request

**Responses**:
- **200 OK**: People updated successfully
- **422 Validation Error**: Invalid input data or person IDs not found
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

## Statistics and Hierarchy

### 8. Get Organization Statistics

**Endpoint**: `GET /api/v1/people/stats/overview`  
**Summary**: Get people statistics for the organization  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns comprehensive statistics about people in the organization including counts by department, role, and status.

**Successful Response (200)**:
```json
{
  "total_people": 150,
  "active_people": 142,
  "inactive_people": 5,
  "pending_people": 3,
  "departments": {
    "Engineering": 45,
    "Product": 25,
    "Design": 15,
    "Marketing": 20,
    "Sales": 30,
    "HR": 8,
    "Operations": 7
  },
  "roles": {
    "admin": 2,
    "manager": 15,
    "user": 133
  },
  "recent_hires": 12
}
```

**Responses**:
- **200 OK**: Statistics retrieved successfully
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

### 9. Get Organization Hierarchy

**Endpoint**: `GET /api/v1/people/hierarchy`  
**Summary**: Get the organizational hierarchy  
**Authentication**: **Required** (HTTP Bearer)  

**Description**: Returns the complete organizational hierarchy showing manager-employee relationships.

**Successful Response (200)**:
```json
{
  "organization_id": "456e7890-e89b-12d3-a456-426614174000",
  "hierarchy": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Sarah CEO",
      "job_title": "Chief Executive Officer",
      "level": 0,
      "children": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "name": "John CTO",
          "job_title": "Chief Technology Officer",
          "level": 1,
          "children": [
            {
              "id": "123e4567-e89b-12d3-a456-426614174002",
              "name": "Alice Manager",
              "job_title": "Engineering Manager",
              "level": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Responses**:
- **200 OK**: Hierarchy retrieved successfully
- **401 Unauthorized**: Authentication required
- **500 Internal Server Error**: Server error

---

## Request/Response Schemas

### PersonCreate
```json
{
  "first_name": "string (required, 1-100 chars)",
  "last_name": "string (required, 1-100 chars)",
  "email": "string (required, valid email)",
  "phone": "string (optional, max 20 chars)",
  "job_title": "string (optional, max 200 chars)",
  "department": "string (optional, max 100 chars)",
  "site": "string (optional, max 200 chars)",
  "location": "string (optional, max 200 chars)",
  "employee_id": "string (optional, max 50 chars)",
  "role": "enum (admin|manager|user, default: user)",
  "manager_id": "UUID (optional)",
  "hire_date": "datetime (optional, ISO format)",
  "notes": "string (optional)"
}
```

### PersonUpdate
```json
{
  "first_name": "string (optional, 1-100 chars)",
  "last_name": "string (optional, 1-100 chars)",
  "email": "string (optional, valid email)",
  "phone": "string (optional, max 20 chars)",
  "job_title": "string (optional, max 200 chars)",
  "department": "string (optional, max 100 chars)",
  "site": "string (optional, max 200 chars)",
  "location": "string (optional, max 200 chars)",
  "employee_id": "string (optional, max 50 chars)",
  "role": "enum (optional, admin|manager|user)",
  "status": "enum (optional, active|inactive|pending)",
  "manager_id": "UUID (optional)",
  "hire_date": "datetime (optional, ISO format)",
  "notes": "string (optional)"
}
```

### PersonResponse
```json
{
  "id": "UUID",
  "organization_id": "UUID",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string | null",
  "job_title": "string | null",
  "department": "string | null",
  "site": "string | null",
  "location": "string | null",
  "employee_id": "string | null",
  "role": "enum (admin|manager|user)",
  "status": "enum (active|inactive|pending)",
  "manager_id": "UUID | null",
  "hire_date": "datetime | null",
  "notes": "string | null",
  "full_name": "string (computed)",
  "is_active": "boolean (computed)",
  "is_manager": "boolean (computed)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Resource deleted successfully
- **401 Unauthorized**: Authentication required or invalid
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate email)
- **422 Validation Error**: Input validation failed
- **500 Internal Server Error**: Server error

### Common Validation Errors

```json
{
  "detail": [
    {
      "loc": ["first_name"],
      "msg": "ensure this value has at least 1 characters",
      "type": "value_error.any_str.min_length"
    },
    {
      "loc": ["email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Examples

### Complete CRUD Workflow

#### 1. Create a Person
```bash
curl -X POST "http://localhost:8000/api/v1/people/" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "job_title": "Software Engineer",
    "department": "Engineering"
  }'
```

#### 2. List People with Filtering
```bash
curl -X GET "http://localhost:8000/api/v1/people/?department=Engineering&page=1&page_size=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. Get Specific Person
```bash
curl -X GET "http://localhost:8000/api/v1/people/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 4. Update Person
```bash
curl -X PUT "http://localhost:8000/api/v1/people/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Software Engineer",
    "role": "manager"
  }'
```

#### 5. Get Organization Statistics
```bash
curl -X GET "http://localhost:8000/api/v1/people/stats/overview" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 6. Bulk Create People
```bash
curl -X POST "http://localhost:8000/api/v1/people/bulk" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "people": [
      {
        "first_name": "Alice",
        "last_name": "Johnson",
        "email": "alice.johnson@example.com",
        "job_title": "Product Manager",
        "department": "Product"
      },
      {
        "first_name": "Bob",
        "last_name": "Wilson",
        "email": "bob.wilson@example.com",
        "job_title": "Designer",
        "department": "Design"
      }
    ]
  }'
```

---

## Notes

1. **Organization Context**: All operations are scoped to the current user's organization
2. **Email Uniqueness**: Email addresses must be unique within each organization
3. **Soft Deletes**: Deleted people may be soft-deleted and can be restored
4. **Manager Validation**: Manager IDs must reference existing people in the same organization
5. **Role Hierarchy**: Admin > Manager > User permissions apply
6. **Phone Format**: Phone numbers are automatically formatted and validated
7. **Bulk Operations**: Use bulk endpoints for better performance with multiple records

---

## Support

For questions or issues related to the People Management API, please refer to the main project documentation or contact the development team.

**Last Updated**: 2025-01-07  
**API Version**: 1.0.0