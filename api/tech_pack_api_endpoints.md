# Tech Pack Management System - API Endpoints Structure

## Base URL Structure
```
https://api.techpack.company.com/v1
```

## Authentication
- **Type**: JWT Bearer Token
- **Header**: `Authorization: Bearer {token}`
- **Refresh**: `/auth/refresh`

## Core API Endpoints

### 1. Tech Pack Management

#### GET /tech-packs
**Description**: List tech packs with filtering and pagination
**Query Parameters**:
- `status` (string): Filter by status (Draft, In Review, Approved, Rejected, Archived)
- `season` (string): Filter by season (e.g., SS25, FW25)
- `designer` (string): Filter by designer name
- `supplier_id` (string): Filter by supplier ID
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `search` (string): Full-text search in product name and fabric description

**Response**:
```json
{
  "data": [
    {
      "tech_pack_id": "uuid",
      "article_code": "SHRT-001-SS25",
      "product_name": "Men's Oxford Button-Down Shirt",
      "status": "In Review",
      "season": "SS25",
      "created_at": "2024-10-27T10:00:00Z",
      "updated_at": "2024-10-28T14:30:00Z",
      "completeness": {
        "is_complete": false,
        "missing_items": ["Colorways"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### POST /tech-packs
**Description**: Create new tech pack
**Request Body**:
```json
{
  "article_code": "SHRT-002-SS25",
  "product_name": "Women's Silk Blouse",
  "gender": "Female",
  "fit_type": "Regular Fit",
  "product_class": "Woven Blouses",
  "supplier_info": {
    "supplier_id": "SUP-VN-102",
    "supplier_name": "Vietnam Garment Co.",
    "contact_person": "Ms. Loan"
  },
  "fabric_description": "100% Silk Crepe, 80gsm",
  "designer": "Jane Doe",
  "season": "SS25",
  "initial_bom": [
    {
      "part_name": "Main Body Fabric",
      "material_name": "Silk Crepe",
      "placement": "Front, Back, Sleeves",
      "quantity": 1.2,
      "unit_of_measure": "m",
      "supplier_code": "FAB-SILK-001",
      "supplier_name": "Silk Suppliers Ltd"
    }
  ]
}
```

#### GET /tech-packs/{id}
**Description**: Get complete tech pack details including BOM, measurements, colorways
**Response**: Complete tech pack object with all related data

#### PUT /tech-packs/{id}
**Description**: Update tech pack (creates revision history)

#### DELETE /tech-packs/{id}
**Description**: Soft delete tech pack (sets status to Archived)

### 2. Bill of Materials (BOM)

#### GET /tech-packs/{id}/bom
**Description**: Get BOM for specific tech pack

#### POST /tech-packs/{id}/bom
**Description**: Add BOM item

#### PUT /tech-packs/{id}/bom/{bom_id}
**Description**: Update BOM item

#### DELETE /tech-packs/{id}/bom/{bom_id}
**Description**: Remove BOM item

### 3. Measurement Charts

#### GET /tech-packs/{id}/measurements
**Description**: Get measurement charts for tech pack

#### POST /tech-packs/{id}/measurements
**Description**: Add measurement chart

#### PUT /tech-packs/{id}/measurements/{measurement_id}
**Description**: Update measurement chart

#### POST /tech-packs/{id}/measurements/{measurement_id}/approve
**Description**: Approve measurement chart

### 4. Colorways

#### GET /tech-packs/{id}/colorways
**Description**: Get colorways for tech pack

#### POST /tech-packs/{id}/colorways
**Description**: Add colorway

#### PUT /tech-packs/{id}/colorways/{colorway_id}
**Description**: Update colorway

#### POST /tech-packs/{id}/colorways/{colorway_id}/set-default
**Description**: Set as default colorway

### 5. Workflow Management

#### POST /tech-packs/{id}/submit-for-review
**Description**: Submit tech pack for review (Draft → In Review)

#### POST /tech-packs/{id}/approve
**Description**: Approve tech pack (In Review → Approved)
**Request Body**:
```json
{
  "comments": "Approved with minor notes on button placement"
}
```

#### POST /tech-packs/{id}/reject
**Description**: Reject tech pack (In Review → Rejected)
**Request Body**:
```json
{
  "rejection_reason": "Fabric composition needs revision"
}
```

### 6. Export/Import WFX Format

#### GET /tech-packs/{id}/export/wfx
**Description**: Export tech pack in WFX format
**Response**: WFX XML file download

#### POST /tech-packs/import/wfx
**Description**: Import tech pack from WFX format
**Request**: Multipart form with WFX file upload

### 7. Reporting and Analytics

#### GET /reports/tech-pack-summary
**Description**: Get tech pack summary statistics
**Query Parameters**:
- `season` (string): Filter by season
- `date_from` (date): Start date
- `date_to` (date): End date

#### GET /reports/supplier-performance
**Description**: Get supplier performance metrics

#### GET /reports/approval-timeline
**Description**: Get approval timeline analytics

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "quantity",
        "message": "Quantity must be greater than 0"
      }
    ],
    "timestamp": "2024-10-28T14:30:00Z",
    "request_id": "uuid"
  }
}
```

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Business rule violation
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

## Rate Limiting
- **Limit**: 1000 requests per hour per API key
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Webhooks

### Available Events
- `tech_pack.created`
- `tech_pack.updated`
- `tech_pack.status_changed`
- `tech_pack.approved`
- `tech_pack.rejected`
- `bom.updated`
- `measurement.approved`

### Webhook Payload Example
```json
{
  "event": "tech_pack.status_changed",
  "timestamp": "2024-10-28T14:30:00Z",
  "data": {
    "tech_pack_id": "uuid",
    "article_code": "SHRT-001-SS25",
    "old_status": "In Review",
    "new_status": "Approved",
    "changed_by": {
      "user_id": "uuid",
      "user_name": "jane.doe"
    }
  }
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const TechPackAPI = require('@company/techpack-sdk');

const client = new TechPackAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.techpack.company.com/v1'
});

// Create tech pack
const techPack = await client.techPacks.create({
  article_code: 'SHRT-001-SS25',
  product_name: 'Men\'s Oxford Shirt',
  // ... other fields
});

// Get tech pack with related data
const fullTechPack = await client.techPacks.get(techPack.id, {
  include: ['bom', 'measurements', 'colorways']
});
```

### Python
```python
from techpack_sdk import TechPackClient

client = TechPackClient(
    api_key='your-api-key',
    base_url='https://api.techpack.company.com/v1'
)

# Create tech pack
tech_pack = client.tech_packs.create({
    'article_code': 'SHRT-001-SS25',
    'product_name': 'Men\'s Oxford Shirt',
    # ... other fields
})

# Submit for review
client.tech_packs.submit_for_review(tech_pack['id'])
```
