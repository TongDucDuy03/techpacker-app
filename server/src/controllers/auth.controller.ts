import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/user.model';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError, formatValidationErrors } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';

class AuthController {
  constructor() {
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.logoutByRefresh = this.logoutByRefresh.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
  }

  async register(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { firstName, lastName, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 'An account with this email already exists', 409, 'CONFLICT');
      }

      const newUser = new User({ firstName, lastName, email, password, role });
      await newUser.save();

      // Exclude password from the returned user object
      const userResponse = newUser.toObject();
      delete userResponse.password;

      sendSuccess(res, { user: userResponse }, 'User registered successfully', 201);
    } catch (error: any) {
      console.error('Registration error:', error);
      sendError(res, 'Failed to register user');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    console.log('Login attempt:', { email: req.body?.email, hasPassword: !!req.body?.password });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login validation errors:', errors.array());
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        console.log('Missing email or password in request body');
        return sendError(res, 'Email and password are required', 400, 'BAD_REQUEST');
      }

      const user = await User.findOne({ email }).select('+password');
      console.log('User found:', !!user);

      if (!user) {
        console.log('User not found for email:', email);
        return sendError(res, 'Invalid email or password', 401, 'UNAUTHORIZED');
      }

      const isPasswordValid = await user.comparePassword(password);
      console.log('Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Invalid password for user:', email);
        return sendError(res, 'Invalid email or password', 401, 'UNAUTHORIZED');
      }

      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Store refresh token in the database
      user.refreshTokens.push(refreshToken);
      user.lastLogin = new Date();
      await user.save();

      // Exclude sensitive data from the response
      const { password: _, refreshTokens: __, ...userResponse } = user.toObject();

      console.log('Login successful for user:', email);
      sendSuccess(res, {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }, 'Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      sendError(res, 'Failed to log in', 500, 'INTERNAL_ERROR');
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const user = req.user!;

      // Remove the specific refresh token
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();

      sendSuccess(res, {}, 'Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      sendError(res, 'Failed to log out');
    }
  }

  // Logout using only refresh token (works even if access token expired)
  async logoutByRefresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, 'Refresh token is required', 400, 'BAD_REQUEST');
      }

      let decoded: any;
      try {
        decoded = authService.verifyRefreshToken(refreshToken);
      } catch (err) {
        return sendError(res, 'Invalid or expired refresh token', 401, 'UNAUTHORIZED');
      }

      const user = await User.findById(decoded.userId).select('+refreshTokens');
      if (!user) {
        return sendError(res, 'Invalid refresh token', 401, 'UNAUTHORIZED');
      }

      // Remove this refresh token from user records if present
      user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
      await user.save();

      sendSuccess(res, {}, 'Logged out successfully');
    } catch (error: any) {
      console.error('Logout by refresh error:', error);
      sendError(res, 'Failed to log out', 500, 'INTERNAL_ERROR');
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, 'Refresh token is required', 400, 'BAD_REQUEST');
      }

      const decoded = authService.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return sendError(res, 'Invalid or expired refresh token', 401, 'UNAUTHORIZED');
      }

      const accessToken = authService.generateAccessToken(user);
      sendSuccess(res, { accessToken });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      sendError(res, 'Failed to refresh token', 401, 'UNAUTHORIZED');
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      // req.user is populated by the requireAuth middleware
      const user = req.user!;
      const userResponse = user.toObject();
      delete userResponse.refreshTokens;

      sendSuccess(res, { user: userResponse });
    } catch (error: any) {
      console.error('Get profile error:', error);
      sendError(res, 'Failed to retrieve profile');
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const user = req.user!;
      const { firstName, lastName } = req.body;

      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      await user.save();

      const userResponse = user.toObject();
      delete userResponse.refreshTokens;

      sendSuccess(res, { user: userResponse }, 'Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      sendError(res, 'Failed to update profile');
    }
  }
}

export default new AuthController();
