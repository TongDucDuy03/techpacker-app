import { Router } from 'express';
import { body, param, query } from 'express-validator';
import techpackController from '../controllers/techpack.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import upload from '../middleware/upload.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// Validation rules
const techpackValidation = [
  body('articleInfo.productName')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 100 })
    .withMessage('Product name must be less than 100 characters'),
  
  body('articleInfo.articleCode')
    .notEmpty()
    .withMessage('Article code is required')
    .isLength({ max: 20 })
    .withMessage('Article code must be less than 20 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('Article code can only contain uppercase letters, numbers, hyphens, and underscores'),
  
  body('articleInfo.supplier')
    .notEmpty()
    .withMessage('Supplier is required')
    .isLength({ max: 100 })
    .withMessage('Supplier name must be less than 100 characters'),
  
  body('articleInfo.season')
    .notEmpty()
    .withMessage('Season is required')
    .isLength({ max: 50 })
    .withMessage('Season must be less than 50 characters'),
  
  body('articleInfo.fabricDescription')
    .notEmpty()
    .withMessage('Fabric description is required')
    .isLength({ max: 500 })
    .withMessage('Fabric description must be less than 500 characters'),
  
  // Fallback validation for direct fields (backward compatibility)
  body('productName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Product name must be less than 100 characters'),
  
  body('articleCode')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Article code must be less than 20 characters'),
  
  body('supplier')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Supplier name must be less than 100 characters'),
  
  body('season')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Season must be less than 50 characters'),
  
  body('fabricDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Fabric description must be less than 500 characters'),
  
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Category must be less than 50 characters'),
  
  body('gender')
    .optional()
    .isIn(['Men', 'Women', 'Unisex', 'Kids'])
    .withMessage('Gender must be one of: Men, Women, Unisex, Kids'),
  
  body('brand')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Brand must be less than 50 characters'),
  
  body('retailPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('bom')
    .optional()
    .isArray()
    .withMessage('BOM must be an array'),
  
  body('bom.*.part')
    .if(body('bom').exists())
    .notEmpty()
    .withMessage('BOM part is required'),
  
  body('bom.*.materialName')
    .if(body('bom').exists())
    .notEmpty()
    .withMessage('BOM material name is required'),
  
  body('bom.*.quantity')
    .if(body('bom').exists())
    .isFloat({ min: 0 })
    .withMessage('BOM quantity must be a positive number'),
  
  body('measurements')
    .optional()
    .isArray()
    .withMessage('Measurements must be an array'),
  
  body('measurements.*.pomCode')
    .if(body('measurements').exists())
    .notEmpty()
    .withMessage('POM code is required'),
  
  body('measurements.*.pomName')
    .if(body('measurements').exists())
    .notEmpty()
    .withMessage('POM name is required'),
  
  body('colorways')
    .optional()
    .isArray()
    .withMessage('Colorways must be an array'),
  
  body('colorways.*.name')
    .if(body('colorways').exists())
    .notEmpty()
    .withMessage('Colorway name is required'),
  
  body('colorways.*.code')
    .if(body('colorways').exists())
    .notEmpty()
    .withMessage('Colorway code is required')
];

const patchValidation = [
  body('productName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Product name must be less than 100 characters'),
  
  body('supplier')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Supplier name must be less than 100 characters'),
  
  body('season')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Season must be less than 50 characters'),
  
  body('fabricDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Fabric description must be less than 500 characters'),
  
  body('retailPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Retail price must be a positive number')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['Draft', 'In Review', 'Approved', 'Rejected', 'Archived'])
    .withMessage('Invalid status'),
  
  query('sortBy')
    .optional()
    .isIn(['productName', 'articleCode', 'createdAt', 'updatedAt', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid TechPack ID')
];

const shareValidation = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid User ID'),
  body('permission')
    .isIn(['view', 'edit'])
    .withMessage('Permission must be either view or edit')
];

const revokeValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid TechPack ID'),
  param('userId')
    .isMongoId()
    .withMessage('Invalid User ID')
];

/**
 * @route GET /api/techpacks
 * @desc Get all TechPacks with pagination, search, and filters
 * @access Private (All authenticated users can view)
 */
router.get(
  '/',
  requireAuth,
  queryValidation,
  techpackController.getTechPacks
);

/**
 * @route POST /api/techpacks
 * @desc Create a new TechPack
 * @access Private (Admin and Designer only)
 */
router.post(
  '/',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  techpackValidation,
  techpackController.createTechPack
);

/**
 * @route GET /api/techpacks/:id
 * @desc Get single TechPack by ID
 * @access Private
 */
router.get(
  '/:id',
  requireAuth,
  idValidation,
  techpackController.getTechPack
);

/**
 * @route PUT /api/techpacks/:id
 * @desc Update TechPack (creates new revision for significant changes)
 * @access Private (Admin and Designer only)
 */
router.put(
  '/:id',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  idValidation,
  techpackValidation,
  techpackController.updateTechPack
);

/**
 * @route PATCH /api/techpacks/:id
 * @desc Partial update TechPack (autosave, no revision)
 * @access Private (Admin and Designer only)
 */
router.patch(
  '/:id',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  idValidation,
  patchValidation,
  techpackController.patchTechPack
);

/**
 * @route DELETE /api/techpacks/:id
 * @desc Delete TechPack (soft delete)
 * @access Private (Owner or Admin)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  idValidation,
  techpackController.deleteTechPack
);

/**
 * @route POST /api/techpacks/:id/duplicate
 * @desc Duplicate a TechPack
 * @access Private (Admin and Designer only)
 */
router.post(
  '/:id/duplicate',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  idValidation,
  [
    body('keepVersion')
      .optional()
      .isBoolean()
      .withMessage('keepVersion must be a boolean')
  ],
  techpackController.duplicateTechPack
);

/**
 * @route PATCH /api/techpacks/bulk
 * @desc Perform bulk operations on TechPacks
 * @access Private (Admin only)
 */
router.patch(
  '/bulk',
  requireAuth,
  requireRole([UserRole.Admin]),
  [
    body('ids')
      .isArray({ min: 1 })
      .withMessage('IDs array is required and must not be empty'),
    body('ids.*')
      .isMongoId()
      .withMessage('Each ID must be a valid MongoDB ObjectId'),
    body('action')
      .isIn(['delete', 'setStatus'])
      .withMessage('Action must be either delete or setStatus'),
    body('payload.status')
      .if(body('action').equals('setStatus'))
      .isIn(['Draft', 'In Review', 'Approved', 'Rejected', 'Archived'])
      .withMessage('Status must be valid when action is setStatus')
  ],
  techpackController.bulkOperations
);

/**
 * @route PUT /api/techpacks/:id/share
 * @desc Share TechPack with a user
 * @access Private (Owner or Admin only)
 */
router.put(
  '/:id/share',
  requireAuth,
  idValidation,
  shareValidation,
  techpackController.shareTechPack
);

/**
 * @route DELETE /api/techpacks/:id/share/:userId
 * @desc Revoke TechPack sharing access
 * @access Private (Owner or Admin only)
 */
router.delete(
  '/:id/share/:userId',
  requireAuth,
  revokeValidation,
  techpackController.revokeShare
);

/**
 * @route GET /api/techpacks/:id/audit-logs
 * @desc Get TechPack sharing audit logs
 * @access Private (Owner or Admin only)
 */
router.get(
  '/:id/audit-logs',
  requireAuth,
  idValidation,
  techpackController.getAuditLogs
);

/**
 * @route POST /api/techpacks/upload-sketch
 * @desc Upload a design sketch image
 * @access Private (Admin and Designer only)
 */
router.post(
  '/upload-sketch',
  requireAuth,
  requireRole([UserRole.Admin, UserRole.Designer]),
  upload.single('designSketch'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    // The backend serves static files from /uploads, so the URL is relative to that.
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ success: true, message: 'File uploaded successfully', data: { url: fileUrl } });
  }
);

export default router;
