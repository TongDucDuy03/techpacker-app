import { z } from 'zod';
import { Types } from 'mongoose';
import { TechPackStatus } from '../models/techpack.model';

// Custom ObjectId validation
const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid ObjectId format' }
);

// Material specification schema
const materialSpecSchema = z.object({
  name: z.string().min(1, 'Material name is required'),
  code: z.string().optional(),
  type: z.string().min(1, 'Material type is required'),
  supplier: z.string().optional(),
  color: z.string().optional(),
  pantoneCode: z.string().optional(),
  composition: z.string().optional(),
  weight: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  minimumOrder: z.number().min(0).optional(),
  leadTime: z.number().min(0).optional(),
  approved: z.boolean().optional(),
  notes: z.string().optional()
});

// Measurement specification schema
const measurementSpecSchema = z.object({
  pomCode: z.string().min(1, 'POM code is required'),
  pomName: z.string().min(1, 'POM name is required'),
  toleranceMinus: z.number(),
  tolerancePlus: z.number(),
  sizes: z.object({
    XS: z.number().optional(),
    S: z.number().optional(),
    M: z.number().optional(),
    L: z.number().optional(),
    XL: z.number().optional(),
    XXL: z.number().optional(),
    XXXL: z.number().optional()
  }).catchall(z.number()),
  notes: z.string().optional(),
  critical: z.boolean().optional(),
  measurementType: z.enum(['Body', 'Garment', 'Finished']).optional(),
  category: z.string().optional()
});

// Colorway specification schema
const colorwaySpecSchema = z.object({
  name: z.string().min(1, 'Colorway name is required'),
  code: z.string().min(1, 'Colorway code is required'),
  pantoneCode: z.string().optional(),
  hexColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
  rgbColor: z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255)
  }).optional(),
  placement: z.string().min(1, 'Placement is required'),
  materialType: z.string().min(1, 'Material type is required'),
  supplier: z.string().optional(),
  approved: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  season: z.string().optional(),
  collection: z.string().optional(),
  notes: z.string().optional()
});

// Create tech pack schema
export const createTechPackSchema = z.object({
  body: z.object({
    articleCode: z.string().min(1, 'Article code is required').transform(val => val.toUpperCase()),
    name: z.string().min(1, 'Name is required'),
    ownerId: objectIdSchema,
    metadata: z.object({
      description: z.string().optional(),
      category: z.string().optional(),
      season: z.string().optional()
    }).optional(),
    materials: z.array(materialSpecSchema).optional(),
    measurements: z.array(measurementSpecSchema).optional(),
    colorways: z.array(colorwaySpecSchema).optional()
  })
});

// Update tech pack schema
export const updateTechPackSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.nativeEnum(TechPackStatus).optional(),
    metadata: z.object({
      description: z.string().optional(),
      category: z.string().optional(),
      season: z.string().optional()
    }).optional(),
    materials: z.array(materialSpecSchema).optional(),
    measurements: z.array(measurementSpecSchema).optional(),
    colorways: z.array(colorwaySpecSchema).optional()
  })
});

// Get tech pack by ID schema
export const getTechPackSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

// List tech packs query schema
export const listTechPacksSchema = z.object({
  query: z.object({
    page: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0, 'Page must be positive').optional(),
    limit: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100').optional(),
    q: z.string().optional(),
    status: z.nativeEnum(TechPackStatus).optional(),
    technicalDesignerId: objectIdSchema.optional()
  })
});

// Duplicate tech pack schema
export const duplicateTechPackSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    keepVersion: z.boolean().optional()
  })
});

// Bulk operations schema
export const bulkOperationsSchema = z.object({
  body: z.object({
    ids: z.array(objectIdSchema).min(1, 'At least one ID is required'),
    action: z.enum(['delete', 'approve', 'setStatus']),
    payload: z.object({
      status: z.nativeEnum(TechPackStatus).optional()
    }).optional()
  })
});

export type CreateTechPackInput = z.infer<typeof createTechPackSchema>;
export type UpdateTechPackInput = z.infer<typeof updateTechPackSchema>;
export type GetTechPackInput = z.infer<typeof getTechPackSchema>;
export type ListTechPacksInput = z.infer<typeof listTechPacksSchema>;
export type DuplicateTechPackInput = z.infer<typeof duplicateTechPackSchema>;
export type BulkOperationsInput = z.infer<typeof bulkOperationsSchema>;
