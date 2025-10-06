import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters')
    .trim(),
  
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
    .trim(),
  
  body('role')
    .optional()
    .isIn(['Admin', 'Designer', 'Merchandiser', 'Viewer'])
    .withMessage('Invalid role')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters')
    .trim(),
  
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', requireAuth, authController.getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', requireAuth, updateProfileValidation, authController.updateProfile);

/**
 * @route PUT /api/auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', requireAuth, changePasswordValidation, authController.changePassword);

export default router;
