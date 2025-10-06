import { Router } from 'express';
import { query } from 'express-validator';
import activityController from '../controllers/activity.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

// Validation rules
const activityQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('action')
    .optional()
    .isString()
    .withMessage('Action must be a string'),
  
  query('target')
    .optional()
    .isString()
    .withMessage('Target must be a string'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

const statsQueryValidation = [
  query('period')
    .optional()
    .isIn(['1d', '7d', '30d', '90d'])
    .withMessage('Period must be one of: 1d, 7d, 30d, 90d'),
  
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
];

const recentQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const exportQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json')
];

/**
 * @route GET /api/activities
 * @desc Get user activities with pagination and filtering
 * @access Private
 */
router.get(
  '/',
  requireAuth,
  activityQueryValidation,
  cacheMiddleware.activities,
  activityController.getUserActivities
);

/**
 * @route GET /api/activities/all
 * @desc Get all activities (Admin only)
 * @access Private (Admin)
 */
router.get(
  '/all',
  requireAuth,
  requireRole([UserRole.Admin]),
  activityQueryValidation,
  activityController.getAllActivities
);

/**
 * @route GET /api/activities/stats
 * @desc Get activity statistics
 * @access Private
 */
router.get(
  '/stats',
  requireAuth,
  statsQueryValidation,
  activityController.getActivityStats
);

/**
 * @route GET /api/activities/recent
 * @desc Get recent activities for dashboard
 * @access Private
 */
router.get(
  '/recent',
  requireAuth,
  recentQueryValidation,
  activityController.getRecentActivities
);

/**
 * @route GET /api/activities/export
 * @desc Export activities to CSV/JSON (Admin only)
 * @access Private (Admin)
 */
router.get(
  '/export',
  requireAuth,
  requireRole([UserRole.Admin]),
  exportQueryValidation,
  activityController.exportActivities
);

export default router;
