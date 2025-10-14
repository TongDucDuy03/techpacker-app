# Tech Pack Management System - Complete API Specification

## Base URL
All endpoints are prefixed with `/api/v1`

## Response Format
All API responses follow this standardized format:

**Success Response:**
```json
{
  "success": true,
  "data": <response_data>,
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ],
  "code": "ERROR_CODE"
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "role": "designer"
}
```

### POST /auth/login
Authenticate user and return JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /auth/refresh
Refresh expired access token using refresh token.

### POST /auth/logout
Logout user and invalidate refresh token.

## User Management

### GET /users/profile
Get current user profile (requires authentication).

### PUT /users/profile
Update current user profile (requires authentication).

## Tech Pack Endpoints

### GET /techpacks
List tech packs with filtering, pagination, and sorting.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `q` (string): Search query
- `status` (string): Filter by status
- `designer` (string): Filter by designer
- `sort` (string): Sort field
- `order` (string): Sort direction (asc/desc)

### POST /techpacks
Create a new tech pack.

### GET /techpacks/:id
Get a single tech pack by ID.

### PUT /techpacks/:id
Update a tech pack by ID.

### DELETE /techpacks/:id
Soft delete a tech pack by ID.

### POST /techpacks/:id/duplicate
Duplicate an existing tech pack.

### PATCH /techpacks/bulk
Perform bulk operations on multiple tech packs.

## BOM Management

### GET /techpacks/:id/bom
Get all BOM items for a tech pack.

### POST /techpacks/:id/bom
Add a new BOM item to a tech pack.

### PUT /techpacks/:id/bom/:bomId
Update a BOM item.

### DELETE /techpacks/:id/bom/:bomId
Delete a BOM item.

## Measurements

### GET /techpacks/:id/measurements
Get all measurements for a tech pack.

### POST /techpacks/:id/measurements
Add a new measurement to a tech pack.

### PUT /techpacks/:id/measurements/:measurementId
Update a measurement.

### DELETE /techpacks/:id/measurements/:measurementId
Delete a measurement.

## Colorways

### GET /techpacks/:id/colorways
Get all colorways for a tech pack.

### POST /techpacks/:id/colorways
Add a new colorway to a tech pack.

### PUT /techpacks/:id/colorways/:colorwayId
Update a colorway.

### DELETE /techpacks/:id/colorways/:colorwayId
Delete a colorway.

## File Management

### POST /techpacks/:id/files
Upload files to a tech pack.

### GET /files/:fileId
Get file metadata.

### GET /files/:fileId/download
Download a file.

### DELETE /files/:fileId
Delete a file.

## Workflow Management

### PUT /techpacks/:id/approve
Approve a tech pack.

### PUT /techpacks/:id/reject
Reject a tech pack.

### PUT /techpacks/:id/archive
Archive a tech pack.

### GET /techpacks/:id/history
Get revision history of a tech pack.

## Library Management

### GET /materials
List materials library.

### POST /materials
Create a new material in library.

### GET /measurement-templates
List measurement templates.

### POST /measurement-templates
Create a new measurement template.

### GET /colorways-library
List colorways library.

### POST /colorways-library
Create a new colorway in library.
