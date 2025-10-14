# Tech Pack Management System - Complete API Specification

## Authentication Endpoints

### `POST /api/auth/register`
- **Description:** Register a new user account
- **Body:** `{ username: string, email: string, password: string, firstName: string, lastName: string }`
- **Response:** `{ success: true, data: { user: User, token: string, refreshToken: string } }`
- **Status Codes:** 201 (Created), 400 (Validation Error), 409 (User Exists)

### `POST /api/auth/login`
- **Description:** Authenticate user and return JWT tokens
- **Body:** `{ email: string, password: string }`
- **Response:** `{ success: true, data: { user: User, token: string, refreshToken: string } }`
- **Status Codes:** 200 (Success), 400 (Invalid Credentials), 401 (Unauthorized)

### `POST /api/auth/refresh`
- **Description:** Refresh expired JWT token
- **Body:** `{ refreshToken: string }`
- **Response:** `{ success: true, data: { token: string } }`
- **Status Codes:** 200 (Success), 401 (Invalid Token)

### `POST /api/auth/logout`
- **Description:** Invalidate refresh token
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ success: true, message: 'Logged out successfully' }`
- **Status Codes:** 200 (Success), 401 (Unauthorized)

## Tech Pack CRUD Operations

### `GET /api/techpacks`
- **Description:** List tech packs with pagination, search, and filtering
- **Headers:** `Authorization: Bearer <token>`
- **Query Params:** 
  - `page?: number` (default: 1)
  - `limit?: number` (default: 20, max: 100)
  - `q?: string` (search term)
  - `status?: 'draft' | 'in_review' | 'approved' | 'rejected'`
  - `sortBy?: 'createdAt' | 'updatedAt' | 'name'`
  - `sortOrder?: 'asc' | 'desc'`
- **Response:** `{ success: true, data: { techPacks: TechPack[], total: number, page: number, totalPages: number } }`
- **Status Codes:** 200 (Success), 401 (Unauthorized)

### `POST /api/techpacks`
- **Description:** Create a new tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `CreateTechPackInput`
- **Response:** `{ success: true, data: TechPack }`
- **Status Codes:** 201 (Created), 400 (Validation Error), 401 (Unauthorized)

### `GET /api/techpacks/:id`
- **Description:** Get detailed information for a specific tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ success: true, data: TechPack }`
- **Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not Found)

### `PUT /api/techpacks/:id`
- **Description:** Update an existing tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `Partial<TechPack>`
- **Response:** `{ success: true, data: TechPack }`
- **Status Codes:** 200 (Success), 400 (Validation Error), 401 (Unauthorized), 404 (Not Found)

### `DELETE /api/techpacks/:id`
- **Description:** Soft delete a tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ success: true, message: 'Tech pack deleted successfully' }`
- **Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not Found)

## Tech Pack Actions

### `POST /api/techpacks/:id/duplicate`
- **Description:** Create a copy of an existing tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ name?: string }` (optional new name)
- **Response:** `{ success: true, data: TechPack }`
- **Status Codes:** 201 (Created), 401 (Unauthorized), 404 (Not Found)

### `PATCH /api/techpacks/bulk`
- **Description:** Perform bulk operations on multiple tech packs
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ ids: string[], action: 'delete' | 'setStatus', payload?: { status: TechPackStatus } }`
- **Response:** `{ success: true, message: string, data: { modifiedCount: number } }`
- **Status Codes:** 200 (Success), 400 (Validation Error), 401 (Unauthorized)

### `PATCH /api/techpacks/:id/status`
- **Description:** Update tech pack status (approve/reject workflow)
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ status: TechPackStatus, comment?: string }`
- **Response:** `{ success: true, data: TechPack }`
- **Status Codes:** 200 (Success), 400 (Invalid Status), 401 (Unauthorized), 404 (Not Found)

### `GET /api/techpacks/:id/export/pdf`
- **Description:** Generate and download PDF export of tech pack
- **Headers:** `Authorization: Bearer <token>`
- **Response:** PDF file stream
- **Status Codes:** 200 (Success), 401 (Unauthorized), 404 (Not Found), 500 (Generation Error)

## Sub-document Operations

### BOM (Bill of Materials)
- `POST /api/techpacks/:techPackId/bom`
- `PUT /api/techpacks/:techPackId/bom/:bomId`
- `DELETE /api/techpacks/:techPackId/bom/:bomId`

### Measurements
- `POST /api/techpacks/:techPackId/measurements`
- `PUT /api/techpacks/:techPackId/measurements/:measurementId`
- `DELETE /api/techpacks/:techPackId/measurements/:measurementId`

### Colorways
- `POST /api/techpacks/:techPackId/colorways`
- `PUT /api/techpacks/:techPackId/colorways/:colorwayId`
- `DELETE /api/techpacks/:techPackId/colorways/:colorwayId`

## File Operations
- `POST /api/techpacks/:id/files` - Upload files
- `DELETE /api/techpacks/:id/files/:fileId` - Delete files

## Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```
