import { Router } from 'express';
import { body, param } from 'express-validator';
import subdocumentController from '../controllers/subdocument.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// Common validation
const idValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID'),
  param('bomId').optional().isMongoId().withMessage('Invalid BOM ID'),
  param('measurementId').optional().isMongoId().withMessage('Invalid Measurement ID'),
  param('colorwayId').optional().isMongoId().withMessage('Invalid Colorway ID')
];

// BOM validation
const bomValidation = [
  body('part').notEmpty().withMessage('Part is required'),
  body('materialName').notEmpty().withMessage('Material name is required'),
  body('placement').notEmpty().withMessage('Placement is required'),
  body('size').notEmpty().withMessage('Size is required'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
  body('uom').notEmpty().withMessage('Unit of measure is required'),
  body('supplier').notEmpty().withMessage('Supplier is required'),
  body('unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('totalPrice').optional().isFloat({ min: 0 }).withMessage('Total price must be positive'),
  body('leadTime').optional().isInt({ min: 0 }).withMessage('Lead time must be positive'),
  body('minimumOrder').optional().isInt({ min: 0 }).withMessage('Minimum order must be positive')
];

// Measurement validation
const measurementValidation = [
  body('pomCode').notEmpty().withMessage('POM code is required'),
  body('pomName').notEmpty().withMessage('POM name is required'),
  body('toleranceMinus').isFloat({ min: 0 }).withMessage('Tolerance minus must be positive'),
  body('tolerancePlus').isFloat({ min: 0 }).withMessage('Tolerance plus must be positive'),
  body('unit')
    .optional()
    .isIn(['mm', 'cm', 'inch-10', 'inch-16', 'inch-32'])
    .withMessage('Unit must be one of mm, cm, inch-10, inch-16, inch-32'),
  body('sizes').isObject().withMessage('Sizes must be an object'),
  body('sizes.XS').optional().isFloat({ min: 0 }).withMessage('XS size must be positive'),
  body('sizes.S').optional().isFloat({ min: 0 }).withMessage('S size must be positive'),
  body('sizes.M').optional().isFloat({ min: 0 }).withMessage('M size must be positive'),
  body('sizes.L').optional().isFloat({ min: 0 }).withMessage('L size must be positive'),
  body('sizes.XL').optional().isFloat({ min: 0 }).withMessage('XL size must be positive'),
  body('sizes.XXL').optional().isFloat({ min: 0 }).withMessage('XXL size must be positive'),
  body('critical').optional().isBoolean().withMessage('Critical must be boolean'),
  body('measurementType').optional().isIn(['Body', 'Garment', 'Finished']).withMessage('Invalid measurement type')
];

// Colorway validation
const colorwayValidation = [
  body('name').notEmpty().withMessage('Colorway name is required'),
  body('code').notEmpty().withMessage('Colorway code is required'),
  body('hexColor').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color format'),
  body('rgbColor.r').optional().isInt({ min: 0, max: 255 }).withMessage('RGB red must be 0-255'),
  body('rgbColor.g').optional().isInt({ min: 0, max: 255 }).withMessage('RGB green must be 0-255'),
  body('rgbColor.b').optional().isInt({ min: 0, max: 255 }).withMessage('RGB blue must be 0-255'),
  body('approved').optional().isBoolean().withMessage('Approved must be boolean'),
  body('isDefault').optional().isBoolean().withMessage('IsDefault must be boolean'),
  body('parts').optional().isArray().withMessage('Parts must be an array'),
  body('parts.*.partName').optional().notEmpty().withMessage('Part name is required'),
  body('parts.*.colorName').optional().notEmpty().withMessage('Color name is required'),
  body('parts.*.hexCode').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid part hex color format'),
  body('parts.*.colorType').optional().isIn(['Solid', 'Print', 'Embroidery', 'Applique']).withMessage('Invalid part color type')
];

// BOM Routes
/**
 * @route POST /api/techpacks/:id/bom
 * @desc Add BOM item to TechPack
 * @access Private (Owner or Merchandiser/Admin)
 */
router.post(
  '/:id/bom',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  bomValidation,
  subdocumentController.addBOMItem
);

/**
 * @route PUT /api/techpacks/:id/bom/:bomId
 * @desc Update BOM item
 * @access Private (Owner or Merchandiser/Admin)
 */
router.put(
  '/:id/bom/:bomId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  bomValidation,
  subdocumentController.updateBOMItem
);

/**
 * @route DELETE /api/techpacks/:id/bom/:bomId
 * @desc Delete BOM item
 * @access Private (Owner or Merchandiser/Admin)
 */
router.delete(
  '/:id/bom/:bomId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  subdocumentController.deleteBOMItem
);

// Measurement Routes
/**
 * @route POST /api/techpacks/:id/measurements
 * @desc Add measurement to TechPack
 * @access Private (Owner or Merchandiser/Admin)
 */
router.post(
  '/:id/measurements',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  measurementValidation,
  subdocumentController.addMeasurement
);

/**
 * @route PUT /api/techpacks/:id/measurements/:measurementId
 * @desc Update measurement
 * @access Private (Owner or Merchandiser/Admin)
 */
router.put(
  '/:id/measurements/:measurementId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  measurementValidation,
  subdocumentController.updateMeasurement
);

/**
 * @route DELETE /api/techpacks/:id/measurements/:measurementId
 * @desc Delete measurement
 * @access Private (Owner or Merchandiser/Admin)
 */
router.delete(
  '/:id/measurements/:measurementId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  subdocumentController.deleteMeasurement
);

// Colorway Routes
/**
 * @route POST /api/techpacks/:id/colorways
 * @desc Add colorway to TechPack
 * @access Private (Owner or Merchandiser/Admin)
 */
router.post(
  '/:id/colorways',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  colorwayValidation,
  subdocumentController.addColorway
);

/**
 * @route PUT /api/techpacks/:id/colorways/:colorwayId
 * @desc Update colorway
 * @access Private (Owner or Merchandiser/Admin)
 */
router.put(
  '/:id/colorways/:colorwayId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  colorwayValidation,
  subdocumentController.updateColorway
);

/**
 * @route DELETE /api/techpacks/:id/colorways/:colorwayId
 * @desc Delete colorway
 * @access Private (Owner or Merchandiser/Admin)
 */
router.delete(
  '/:id/colorways/:colorwayId',
  requireAuth,
  requireRole([UserRole.Merchandiser, UserRole.Admin]),
  idValidation,
  subdocumentController.deleteColorway
);

export default router;
