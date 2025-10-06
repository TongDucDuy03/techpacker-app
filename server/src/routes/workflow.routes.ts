import { Router } from 'express';
import { body, param, query } from 'express-validator';
import workflowController from '../controllers/workflow.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// Validation rules
const workflowActionValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID'),
  body('action')
    .isIn(['submit_for_review', 'approve', 'reject'])
    .withMessage('Action must be one of: submit_for_review, approve, reject'),
  body('comments')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comments must be less than 500 characters')
];

const revertValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID'),
  body('revisionId').isMongoId().withMessage('Invalid Revision ID'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
];

const queryValidation = [
  param('id').isMongoId().withMessage('Invalid TechPack ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'version'])
    .withMessage('Sort by must be createdAt or version'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * @route POST /api/techpacks/:id/workflow
 * @desc Handle workflow actions (submit, approve, reject)
 * @access Private (Role-based permissions)
 */
router.post(
  '/:id/workflow',
  requireAuth,
  workflowActionValidation,
  workflowController.handleWorkflowAction
);

/**
 * @route GET /api/techpacks/:id/revisions
 * @desc Get revision history for a TechPack
 * @access Private (Owner or higher roles)
 */
router.get(
  '/:id/revisions',
  requireAuth,
  queryValidation,
  workflowController.getRevisions
);

/**
 * @route POST /api/techpacks/:id/revisions/revert
 * @desc Revert TechPack to a previous revision
 * @access Private (Admin only)
 */
router.post(
  '/:id/revisions/revert',
  requireAuth,
  requireRole([UserRole.Admin]),
  revertValidation,
  workflowController.revertToRevision
);

export default router;
