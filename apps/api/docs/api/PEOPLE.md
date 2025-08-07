# People Management API Documentation

## Overview

The People Management API provides CRUD operations for managing people records within an organization. This API supports creating, reading, updating, and deleting person records with comprehensive validation and error handling.

## Base URL
```
http://localhost:8000/api/v1/organization/people
```

## Authentication

All endpoints require Bearer token authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Data Model

### Person Object

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `id` | UUID | No (auto-generated) | Unique identifier | Read-only |
| `organization_id` | UUID | No | Organization identifier | Can be null |
| `first_name` | string | Yes | Person's first name | Max 100 characters |
| `last_name` | string | Yes | Person's last name | Max 100 characters |
| `email` | string | Yes | Person's email address | Valid email format, unique |
| `phone` | string | No | Phone number | Max 20 characters |
| `job_title` | string | No | Job title/position | Max 200 characters |
| `department` | string | No | Department name | Max 100 characters |
| `site` | string | No | Work site/location | Max 200 characters |
| `location` | string | No | Geographic location | Max 200 characters |
| `role` | enum | Yes | System role | One of: "Admin", "User", "Manager", "Viewer" |
| `status` | enum | No (defaults to "active") | Person status | One of: "active", "inactive", "pending" |
| `manager_id` | UUID | No | ID of person's manager | Must be valid person ID |
| `hire_date` | datetime | No | Date of hiring | ISO 8601 format |
| `notes` | string | No | Additional notes | Text field |
| `full_name` | string | No (computed) | Full name | Read-only, concatenated first + last name |
| `is_active` | boolean | No (computed) | Active status | Read-only, true if status is "active" |
| `created_at` | datetime | No (auto-generated) | Creation timestamp | Read-only |
| `updated_at` | datetime | No (auto-generated) | Last update timestamp | Read-only |

### Example Person Object

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "organization_id": null,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "phone": "+1-555-0123",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "Main Office",
  "location": "New York, NY",
  "role": "User",
  "status": "active",
  "full_name": "John Doe",
  "is_active": true,
  "manager_id": "123e4567-e89b-12d3-a456-426614174001",
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in engineering team",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Endpoints

### 1. Create Person
Create a new person record.

**Endpoint:** `POST /api/v1/organization/people/`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe", 
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "role": "User",
  "manager_id": null,
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in engineering team"
}
```

**Required Fields:**
- `first_name` (string)
- `last_name` (string) 
- `email` (string, must be valid email format)
- `role` (enum: "Admin", "User", "Manager", "Viewer")

**Optional Fields:**
- `phone` (string)
- `job_title` (string)
- `department` (string)
- `site` (string) 
- `location` (string)
- `manager_id` (UUID, must reference existing person)
- `hire_date` (ISO datetime)
- `notes` (string)

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organization_id": null,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "job_title": "Software Engineer",
  "department": "Engineering", 
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "role": "User",
  "status": "active",
  "full_name": "John Doe",
  "is_active": true,
  "manager_id": null,
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in engineering team",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

**Error Responses:**
- `409 Conflict`: Email already exists
- `422 Unprocessable Entity`: Validation errors
- `404 Not Found`: Invalid manager_id

---

### 2. List People
Retrieve a paginated list of all people.

**Endpoint:** `GET /api/v1/organization/people/`

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `page_size` (integer, default: 20, max: 100): Items per page

**Example Request:**
```
GET /api/v1/organization/people/?page=1&page_size=10
```

**Response (200 OK):**
```json
{
  "people": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "job_title": "Software Engineer",
      "department": "Engineering",
      "site": "San Francisco Office", 
      "location": "San Francisco, CA",
      "role": "User",
      "status": "active",
      "manager_id": null,
      "hire_date": "2024-01-15T00:00:00Z",
      "notes": "New hire in engineering team",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-10T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "total_pages": 1
}
```

---

### 3. Get Person
Retrieve a specific person by ID.

**Endpoint:** `GET /api/v1/organization/people/{person_id}`

**Path Parameters:**
- `person_id` (UUID): The unique identifier of the person

**Example Request:**
```
GET /api/v1/organization/people/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "job_title": "Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "role": "User",
  "status": "active",
  "manager_id": null,
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "New hire in engineering team",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T10:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Person not found

---

### 4. Update Person
Update an existing person's information.

**Endpoint:** `PUT /api/v1/organization/people/{person_id}`

**Path Parameters:**
- `person_id` (UUID): The unique identifier of the person

**Request Body:**
```json
{
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "notes": "Promoted to senior level"
}
```

**Note:** All fields are optional in updates. Only provide the fields you want to change.

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "site": "San Francisco Office",
  "location": "San Francisco, CA",
  "role": "User",
  "status": "active",
  "manager_id": null,
  "hire_date": "2024-01-15T00:00:00Z",
  "notes": "Promoted to senior level",
  "created_at": "2024-01-10T10:00:00Z",
  "updated_at": "2024-01-10T15:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Person not found
- `409 Conflict`: Email conflict
- `422 Unprocessable Entity`: Validation errors

---

### 5. Delete Person
Delete a person record.

**Endpoint:** `DELETE /api/v1/organization/people/{person_id}`

**Path Parameters:**
- `person_id` (UUID): The unique identifier of the person

**Example Request:**
```
DELETE /api/v1/organization/people/550e8400-e29b-41d4-a716-446655440000
```

**Response (204 No Content):**
No response body.

**Error Responses:**
- `404 Not Found`: Person not found

**Note:** When a person is deleted, any direct reports will have their manager_id set to null.

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "type": "string_type",
      "loc": ["body", "first_name"],
      "msg": "Input should be a valid string",
      "input": null
    }
  ]
}
```

### 409 Conflict
```json
{
  "detail": "Person with email john.doe@example.com already exists"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Data Models

### Person Role Enum
- `Admin`: Administrative access
- `User`: Standard user access (default)
- `Manager`: Management privileges  
- `Viewer`: Read-only access

### Person Status Enum
- `active`: Active person (default)
- `inactive`: Inactive person
- `pending`: Pending activation

## Validation Rules

### Email Validation
- Must be a valid email format (RFC 5322 compliant)
- Must be unique across all people
- Automatically converted to lowercase


### Manager Validation
- Manager ID must reference an existing person
- Person cannot be their own manager
- Manager relationships form a hierarchy (no circular references)

### Role Validation
- Must be one of: "Admin", "User", "Manager", "Viewer"
- Case-sensitive

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Limit:** 60 requests per minute per authenticated user
- **Headers:** Rate limit information is returned in response headers:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when window resets

## Examples

### Creating a Person

```bash
curl -X POST \
  http://localhost:8000/api/v1/organization/people/ \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name": "Johnson",
    "email": "alice.johnson@company.com",
    "job_title": "Data Scientist",
    "department": "Data",
    "role": "User"
  }'
```

### Listing People with Pagination

```bash
curl -X GET \
  "http://localhost:8000/api/v1/organization/people/?page=1&page_size=20" \
  -H "Authorization: Bearer your_jwt_token"
```

### Updating a Person

```bash
curl -X PUT \
  http://localhost:8000/api/v1/organization/people/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Senior Data Scientist",
    "notes": "Promoted after excellent performance review"
  }'
```

## Resolved Issues

### ✅ 409 Conflict on Creation (RESOLVED)

**Problem:** The API was returning 409 Conflict errors when creating people, even with unique email addresses.

**Status:** Resolved (2025-08-07)

**Root Cause:** 
- The `organization_id` field had a NOT NULL constraint in the database
- The error handling was masking the actual `NotNullViolationError` and returning a misleading "email already exists" message

**Solution:**
- Made `organization_id` nullable in the database
- Removed `employee_id` field completely from the schema and database
- Fixed error handling to properly report actual database errors
- Updated response schemas to match the actual model properties

**Testing:** All tests now pass with 100% success rate

## Notes

- All email addresses are automatically converted to lowercase
- Manager relationships are validated - manager must exist
- Self-management is prevented (person cannot be their own manager)
- Timestamps are automatically managed (created_at, updated_at)
- All datetime fields use ISO 8601 format with UTC timezone
- The `organization_id` field is optional and can be null
- Response includes computed fields: `full_name` and `is_active`