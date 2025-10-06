import { Router } from 'express';
import { param, query } from 'express-validator';
import pdfController from '../controllers/pdf.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const idValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID')
];

const previewValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID'),
  query('page')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Page must be between 1 and 50'),
  query('options')
    .optional()
    .isString()
    .withMessage('Options must be a valid JSON string')
];

/**
 * @route GET /api/techpacks/:id/pdf
 * @desc Export TechPack as PDF
 * @access Private
 */
router.get(
  '/:id/pdf',
  requireAuth,
  idValidation,
  pdfController.exportTechPackPDF
);

/**
 * @route GET /api/techpacks/:id/pdf/preview
 * @desc Generate PDF preview (base64 image)
 * @access Private
 */
router.get(
  '/:id/pdf/preview',
  requireAuth,
  previewValidation,
  pdfController.generatePDFPreview
);

/**
 * @route GET /api/techpacks/:id/pdf/info
 * @desc Get PDF generation info and validation status
 * @access Private
 */
router.get(
  '/:id/pdf/info',
  requireAuth,
  idValidation,
  pdfController.getPDFInfo
);

export default router;
