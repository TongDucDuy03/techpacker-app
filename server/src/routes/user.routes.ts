import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/v1/users/profile
router.get(
  '/profile',
  requireAuth,
  authController.getProfile
);

// PUT /api/v1/users/profile
router.put(
  '/profile',
  requireAuth,
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty').trim(),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty').trim(),
  ],
  authController.updateProfile
);

export default router;
