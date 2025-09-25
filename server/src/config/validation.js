const Joi = require('joi');

// TechPack Validation Schemas
const techPackSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  category: Joi.string().valid('apparel', 'accessories', 'footwear', 'other').required(),
  status: Joi.string().valid('draft', 'review', 'approved', 'production').required(),
  season: Joi.string().min(1).max(100).required(),
  brand: Joi.string().min(1).max(100).required(),
  designer: Joi.string().min(1).max(100).required(),
  images: Joi.array().items(Joi.string().uri()).default([]),
  metadata: Joi.object().default({}),
  version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  parent_id: Joi.string().allow(null),
  is_active: Joi.boolean().default(true),
  created_by: Joi.string().required(),
  updated_by: Joi.string().required(),
});

const bomItemSchema = Joi.object({
  part: Joi.string().valid('Fabric', 'Trims', 'Labels', 'Packaging').required(),
  material_code: Joi.string().min(1).max(100).required(),
  placement: Joi.string().valid('Collar', 'Placket', 'Pocket', 'Sleeve', 'Body', 'Cuff', 'Hem', 'Seam', 'Buttonhole', 'Zipper', 'Other').required(),
  size_spec: Joi.string().min(1).max(255).required(),
  quantity: Joi.number().positive().required(),
  uom: Joi.string().valid('Yards', 'Meters', 'Pieces', 'Dozen', 'Rolls', 'Sheets', 'Feet', 'Inches', 'Grams', 'Kilograms').required(),
  supplier: Joi.string().min(1).max(255).required(),
  comments: Joi.array().items(Joi.string()).default([]),
  images: Joi.array().items(Joi.string().uri()).default([]),
  color: Joi.string().allow(null),
  weight: Joi.number().positive().allow(null),
  cost: Joi.number().positive().allow(null),
  lead_time: Joi.number().integer().min(0).allow(null),
});

const pomSpecificationSchema = Joi.object({
  pom_code: Joi.string().min(1).max(50).required(),
  pom_name: Joi.string().min(1).max(255).required(),
  tolerances: Joi.object({
    minusTol: Joi.number().required(),
    plusTol: Joi.number().required(),
    unit: Joi.string().valid('inches', 'cm').required(),
  }).required(),
  measurements: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.number(), Joi.string().valid('NR'))).required(),
  how_to_measure: Joi.string().min(1).max(1000).required(),
  category: Joi.string().min(1).max(100).required(),
  unit: Joi.string().valid('inches', 'cm').required(),
  grade_rules: Joi.array().items(Joi.object()).default([]),
});

const constructionDetailSchema = Joi.object({
  category: Joi.string().valid('Seams', 'Pockets', 'Collar', 'Sleeves', 'Closures', 'Hems', 'Pleats', 'Darts', 'Other').required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).max(2000).required(),
  specifications: Joi.array().items(Joi.object()).default([]),
  sequence: Joi.number().integer().min(1).required(),
  quality_checkpoints: Joi.array().items(Joi.string()).default([]),
  special_instructions: Joi.array().items(Joi.string()).default([]),
  materials: Joi.array().items(Joi.string()).default([]),
  tools: Joi.array().items(Joi.string()).default([]),
  estimated_time: Joi.number().integer().min(0).required(),
  difficulty: Joi.string().valid('Easy', 'Medium', 'Hard', 'Expert').required(),
  diagram: Joi.string().uri().allow(null),
  photos: Joi.array().items(Joi.string().uri()).default([]),
  created_by: Joi.string().required(),
  tags: Joi.array().items(Joi.string()).default([]),
});

const careInstructionSchema = Joi.object({
  language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar').required(),
  symbols: Joi.array().items(Joi.string()).default([]),
  text_instructions: Joi.array().items(Joi.string()).default([]),
  special_instructions: Joi.array().items(Joi.string()).default([]),
  warnings: Joi.array().items(Joi.string()).default([]),
});

const refitRequestSchema = Joi.object({
  reason: Joi.string().valid('Fit Issue', 'Measurement Error', 'Material Change', 'Construction Update', 'Customer Request', 'Quality Issue', 'Other').required(),
  description: Joi.string().min(1).max(2000).required(),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').required(),
  requested_by: Joi.string().required(),
  status: Joi.string().valid('Open', 'In Progress', 'Completed', 'Cancelled').default('Open'),
  before_measurements: Joi.object().required(),
  after_measurements: Joi.object().required(),
  impact_analysis: Joi.string().allow(null),
  implementation_notes: Joi.string().allow(null),
});

// Validation Middleware
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }
    
    req[property] = value;
    next();
  };
};

// Business Rule Validators
const businessRules = {
  // Validate TechPack completeness
  validateTechPackCompleteness: (techPack) => {
    const errors = [];
    
    if (!techPack.materials || techPack.materials.length === 0) {
      errors.push('TechPack must have at least one material');
    }
    
    if (!techPack.measurements || techPack.measurements.length === 0) {
      errors.push('TechPack must have at least one measurement specification');
    }
    
    if (!techPack.constructionDetails || techPack.constructionDetails.length === 0) {
      errors.push('TechPack must have at least one construction detail');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate BOM item consistency
  validateBOMConsistency: (bomItems) => {
    const errors = [];
    const materialCodes = new Set();
    
    for (const item of bomItems) {
      if (materialCodes.has(item.material_code)) {
        errors.push(`Duplicate material code: ${item.material_code}`);
      }
      materialCodes.add(item.material_code);
      
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for ${item.material_code}: ${item.quantity}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate measurement consistency
  validateMeasurementConsistency: (pomSpecs) => {
    const errors = [];
    const pomCodes = new Set();
    
    for (const spec of pomSpecs) {
      if (pomCodes.has(spec.pom_code)) {
        errors.push(`Duplicate POM code: ${spec.pom_code}`);
      }
      pomCodes.add(spec.pom_code);
      
      // Validate measurement values
      for (const [size, value] of Object.entries(spec.measurements)) {
        if (value !== 'NR' && (typeof value !== 'number' || value < 0)) {
          errors.push(`Invalid measurement for ${spec.pom_code} size ${size}: ${value}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = {
  techPackSchema,
  bomItemSchema,
  pomSpecificationSchema,
  constructionDetailSchema,
  careInstructionSchema,
  refitRequestSchema,
  validateRequest,
  businessRules,
};


