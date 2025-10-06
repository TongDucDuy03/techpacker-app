import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/user.model';
import { config } from '../config/config';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { username, email, password, firstName, lastName, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User already exists with this email or username'
        });
        return;
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
        role: role || 'Viewer'
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { firstName, lastName, username } = req.body;

      // Check if username is already taken by another user
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ 
          username, 
          _id: { $ne: user._id } 
        });
        
        if (existingUser) {
          res.status(400).json({
            success: false,
            message: 'Username is already taken'
          });
          return;
        }
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          username: username || user.username
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser!._id,
            username: updatedUser!.username,
            email: updatedUser!.email,
            firstName: updatedUser!.firstName,
            lastName: updatedUser!.lastName,
            fullName: updatedUser!.fullName,
            role: updatedUser!.role,
            isActive: updatedUser!.isActive,
            createdAt: updatedUser!.createdAt,
            updatedAt: updatedUser!.updatedAt
          }
        }
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Change password
   * PUT /api/auth/password
   */
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const userWithPassword = await User.findById(user._id).select('+password');
      
      if (!userWithPassword || !(await userWithPassword.comparePassword(currentPassword))) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Update password
      userWithPassword.password = newPassword;
      await userWithPassword.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export default new AuthController();
