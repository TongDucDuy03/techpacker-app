import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Registration via public endpoint has been disabled. Users must be created via Admin panel.
// If you want to re-enable public registration in the future, restore the route above
// and ensure proper validation/email verification and rate limiting are in place.

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

// POST /api/v1/auth/logout/refresh - revoke refresh token without access token
router.post(
  '/logout/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  authController.logoutByRefresh
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  authController.refreshToken
);

export default router;
