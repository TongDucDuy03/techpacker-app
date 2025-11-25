import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from '../config/config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechPacker API',
      version: '1.0.0',
      description: 'Complete backend API for TechPacker - Fashion Tech Pack Management System',
      contact: {
        name: 'TechPacker Team',
        email: 'support@techpacker.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.techpacker.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string', minLength: 3, maxLength: 30 },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string', maxLength: 50 },
            lastName: { type: 'string', maxLength: 50 },
            fullName: { type: 'string', readOnly: true },
            role: { 
              type: 'string', 
              enum: ['Admin', 'Designer', 'Merchandiser', 'Viewer'] 
            },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        TechPack: {
          type: 'object',
          required: ['productName', 'articleCode', 'supplier', 'season', 'fabricDescription'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            productName: { type: 'string', maxLength: 100 },
            articleCode: { type: 'string', maxLength: 20, pattern: '^[A-Z0-9\\-_]+$' },
            version: { type: 'string', default: 'V1' },
            designer: { type: 'string', format: 'uuid' },
            designerName: { type: 'string' },
            supplier: { type: 'string', maxLength: 100 },
            season: { type: 'string', maxLength: 50 },
            fabricDescription: { type: 'string', maxLength: 500 },
            status: {
              type: 'string',
              enum: ['Draft', 'In Review', 'Approved', 'Rejected', 'Archived'],
              default: 'Draft'
            },
            category: { type: 'string', maxLength: 50 },
            gender: { type: 'string', enum: ['Men', 'Women', 'Unisex', 'Kids'] },
            brand: { type: 'string', maxLength: 50 },
            collection: { type: 'string', maxLength: 50 },
            retailPrice: { type: 'number', minimum: 0 },
            currency: { type: 'string', default: 'USD' },
            description: { type: 'string' },
            notes: { type: 'string' },
            bom: {
              type: 'array',
              items: { $ref: '#/components/schemas/BOMItem' }
            },
            measurements: {
              type: 'array',
              items: { $ref: '#/components/schemas/Measurement' }
            },
            colorways: {
              type: 'array',
              items: { $ref: '#/components/schemas/Colorway' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BOMItem: {
          type: 'object',
          required: ['part', 'materialName', 'placement', 'size', 'quantity', 'uom', 'supplier'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            part: { type: 'string' },
            materialName: { type: 'string' },
            materialCode: { type: 'string' },
             supplierCode: { type: 'string' },
            placement: { type: 'string' },
            size: { type: 'string' },
            quantity: { type: 'number', minimum: 0 },
            uom: { type: 'string' },
            supplier: { type: 'string' },
            color: { type: 'string' },
            colorCode: { type: 'string' },
            pantoneCode: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            materialComposition: { type: 'string' },
            weight: { type: 'string' },
            width: { type: 'string' },
            shrinkage: { type: 'string' },
            careInstructions: { type: 'string' },
            testingRequirements: { type: 'string' },
            unitPrice: { type: 'number', minimum: 0 },
            totalPrice: { type: 'number', minimum: 0 },
            leadTime: { type: 'integer', minimum: 0 },
            minimumOrder: { type: 'integer', minimum: 0 },
            approved: { type: 'boolean', default: false },
            approvedBy: { type: 'string' },
            approvedDate: { type: 'string', format: 'date-time' },
            comments: { type: 'string' }
          }
        },
        Measurement: {
          type: 'object',
          required: ['pomCode', 'pomName', 'toleranceMinus', 'tolerancePlus'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            pomCode: { type: 'string' },
            pomName: { type: 'string' },
            toleranceMinus: { type: 'number', minimum: 0 },
            tolerancePlus: { type: 'number', minimum: 0 },
            sizes: {
              type: 'object',
              properties: {
                XS: { type: 'number', minimum: 0 },
                S: { type: 'number', minimum: 0 },
                M: { type: 'number', minimum: 0 },
                L: { type: 'number', minimum: 0 },
                XL: { type: 'number', minimum: 0 },
                XXL: { type: 'number', minimum: 0 },
                XXXL: { type: 'number', minimum: 0 }
              }
            },
            notes: { type: 'string' },
            critical: { type: 'boolean', default: false },
            measurementType: { type: 'string', enum: ['Body', 'Garment', 'Finished'] },
            category: { type: 'string' }
          }
        },
        Colorway: {
          type: 'object',
          required: ['name', 'code', 'placement', 'materialType'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            pantoneCode: { type: 'string' },
            hexColor: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
            rgbColor: {
              type: 'object',
              properties: {
                r: { type: 'integer', minimum: 0, maximum: 255 },
                g: { type: 'integer', minimum: 0, maximum: 255 },
                b: { type: 'integer', minimum: 0, maximum: 255 }
              }
            },
            placement: { type: 'string' },
            materialType: { type: 'string' },
            supplier: { type: 'string' },
            approved: { type: 'boolean', default: false },
            isDefault: { type: 'boolean', default: false },
            season: { type: 'string' },
            collection: { type: 'string' },
            notes: { type: 'string' },
            parts: {
              type: 'array',
              items: { $ref: '#/components/schemas/ColorwayPart' },
              default: []
            }
          }
        },
        ColorwayPart: {
          type: 'object',
          required: ['partName', 'colorName'],
          properties: {
            bomItemId: { type: 'string' },
            partName: { type: 'string' },
            colorName: { type: 'string' },
            pantoneCode: { type: 'string' },
            hexCode: { type: 'string', pattern: '^#[0-9A-F]{6}$' },
            rgbCode: { type: 'string' },
            supplier: { type: 'string' },
            colorType: { type: 'string', enum: ['Solid', 'Print', 'Embroidery', 'Applique'] }
          }
        },
        Revision: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            techPackId: { type: 'string', format: 'uuid' },
            version: { type: 'string' },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  oldValue: {},
                  newValue: {}
                }
              }
            },
            createdBy: { type: 'string', format: 'uuid' },
            createdByName: { type: 'string' },
            reason: { type: 'string' },
            approvedBy: { type: 'string', format: 'uuid' },
            approvedByName: { type: 'string' },
            approvedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Activity: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            userName: { type: 'string' },
            action: { type: 'string' },
            target: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' }
              }
            },
            details: {},
            ipAddress: { type: 'string' },
            userAgent: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: { type: 'integer', minimum: 1 },
            totalPages: { type: 'integer', minimum: 0 },
            totalItems: { type: 'integer', minimum: 0 },
            itemsPerPage: { type: 'integer', minimum: 1 },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' }
          }
        },
        APIResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {},
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: {}
              }
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Validation failed' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TechPacker API Documentation'
  }));

  // JSON endpoint for the spec
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;
