import { z } from 'zod';
import { Types } from 'mongoose';
import { TechPackStatus } from '../models/techpack.model';

// Custom ObjectId validation
const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid ObjectId format' }
);

// Material specification schema (exported for potential future use)
export const materialSpecSchema = z.object({
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
const measurementUnitEnum = z.enum(['mm', 'cm', 'inch-10', 'inch-16', 'inch-32']);

const measurementSpecSchema = z.object({
  pomCode: z.string().min(1, 'POM code is required'),
  pomName: z.string().min(1, 'POM name is required'),
  toleranceMinus: z.number().min(0, 'Minus tolerance must be positive'),
  tolerancePlus: z.number().min(0, 'Plus tolerance must be positive'),
  unit: measurementUnitEnum.default('cm'),
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

const colorwayPartSpecSchema = z.object({
  bomItemId: z.string().optional(),
  partName: z.string().min(1, 'Part name is required'),
  colorName: z.string().min(1, 'Color name is required'),
  pantoneCode: z.string().optional(),
  hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
  rgbCode: z.string().optional(),
  supplier: z.string().optional(),
  colorType: z.enum(['Solid', 'Print', 'Embroidery', 'Applique']).optional()
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
  placement: z.string().optional(),
  materialType: z.string().optional(),
  supplier: z.string().optional(),
  approved: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  season: z.string().optional(),
  collection: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  parts: z.array(colorwayPartSpecSchema).optional()
});

// Create tech pack schema
export const createTechPackSchema = z.object({
  body: z.object({
    productName: z.string().min(1, 'Product name is required'),
    articleCode: z.string().min(1, 'Article code is required').transform(val => val.toUpperCase()),
    version: z.string().optional().default('V1'),
    technicalDesignerId: objectIdSchema,
    customerId: z.string().optional(),
    supplier: z.string().min(1, 'Supplier is required'),
    season: z.string().min(1, 'Season is required'),
    fabricDescription: z.string().min(1, 'Fabric description is required'),
    productDescription: z.string().min(1, 'Product description is required'),
    designSketchUrl: z.string().optional(),
    companyLogoUrl: z.string().optional(),
    status: z.nativeEnum(TechPackStatus).optional(),
    lifecycleStage: z.enum(['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped']).optional(),
    category: z.string().optional(),
    gender: z.enum(['Men', 'Women', 'Unisex', 'Kids']).optional(),
    brand: z.string().optional(),
    collectionName: z.string().optional(),
    targetMarket: z.string().optional(),
    pricePoint: z.enum(['Value', 'Mid-range', 'Premium', 'Luxury']).optional(),
    retailPrice: z.number().min(0).optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    bom: z.array(z.any()).optional(),
    measurements: z.array(measurementSpecSchema).optional(),
    colorways: z.array(colorwaySpecSchema).optional(),
    howToMeasure: z.array(z.any()).optional()
  }).refine((data) => {
    // If lifecycleStage is 'Concept' or 'Design', designSketchUrl is required
    if (['Concept', 'Design'].includes(data.lifecycleStage || '')) {
      return data.designSketchUrl && data.designSketchUrl.length > 0;
    }
    return true;
  }, {
    message: 'Design sketch is required for Concept and Design stages',
    path: ['designSketchUrl']
  })
});

// Update tech pack schema
export const updateTechPackSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    productName: z.string().min(1, 'Product name is required').optional(),
    articleCode: z.string().min(1, 'Article code is required').transform(val => val.toUpperCase()).optional(),
    version: z.string().optional(),
    technicalDesignerId: objectIdSchema.optional(),
    customerId: z.string().optional(),
    supplier: z.string().min(1, 'Supplier is required').optional(),
    season: z.string().min(1, 'Season is required').optional(),
    fabricDescription: z.string().min(1, 'Fabric description is required').optional(),
    productDescription: z.string().min(1, 'Product description is required').optional(),
    designSketchUrl: z.string().optional(),
    companyLogoUrl: z.string().optional(),
    status: z.nativeEnum(TechPackStatus).optional(),
    lifecycleStage: z.enum(['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped']).optional(),
    category: z.string().optional(),
    gender: z.enum(['Men', 'Women', 'Unisex', 'Kids']).optional(),
    brand: z.string().optional(),
    collectionName: z.string().optional(),
    targetMarket: z.string().optional(),
    pricePoint: z.enum(['Value', 'Mid-range', 'Premium', 'Luxury']).optional(),
    retailPrice: z.number().min(0).optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    bom: z.array(z.any()).optional(),
    measurements: z.array(measurementSpecSchema).optional(),
    colorways: z.array(colorwaySpecSchema).optional(),
    howToMeasure: z.array(z.any()).optional()
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
