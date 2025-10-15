import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required').trim(),
    body('lastName').notEmpty().withMessage('Last name is required').trim(),
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role provided'),
  ],
  authController.register
);

// POST /api/v1/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  requireAuth,
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  authController.logout
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  authController.refreshToken
);

export default router;
