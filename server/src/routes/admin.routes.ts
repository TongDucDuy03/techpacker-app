import { Router } from 'express';
import { body, param, query } from 'express-validator';
import adminController from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/v1/admin/users - Get all users with pagination, search, and filtering
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isString().trim(),
    query('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
    query('sortBy').optional().isIn(['firstName', 'lastName', 'email', 'role', 'createdAt', 'lastLogin']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  ],
  adminController.getAllUsers
);

// GET /api/v1/admin/users/stats - Get user statistics
router.get('/users/stats', adminController.getUserStats);

// GET /api/v1/admin/users/:id - Get user by ID
router.get(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  adminController.getUserById
);

// POST /api/v1/admin/users - Create new user
router.post(
  '/users',
  [
    body('firstName').notEmpty().withMessage('First name is required').trim(),
    body('lastName').notEmpty().withMessage('Last name is required').trim(),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role provided'),
  ],
  adminController.createUser
);

// PUT /api/v1/admin/users/:id - Update user
router.put(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty').trim(),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty').trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role provided'),
  ],
  adminController.updateUser
);

// DELETE /api/v1/admin/users/:id - Delete user
router.delete(
  '/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  adminController.deleteUser
);

// PATCH /api/v1/admin/users/:id/role - Update user role
router.patch(
  '/users/:id/role',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('role').isIn(Object.values(UserRole)).withMessage('Invalid role provided'),
  ],
  adminController.updateUserRole
);

// PATCH /api/v1/admin/users/:id/2fa - Update user 2FA setting
router.patch(
  '/users/:id/2fa',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('enabled').isBoolean().withMessage('Enabled must be a boolean value'),
  ],
  adminController.updateUserTwoFactor
);

// PATCH /api/v1/admin/users/:id/password - Reset user password
router.patch(
  '/users/:id/password',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  adminController.resetUserPassword
);

export default router;
