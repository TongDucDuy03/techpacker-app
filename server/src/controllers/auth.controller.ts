import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, formatValidationErrors } from '../utils/response.util';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
      return;
    }

    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        sendError(res, error.message, 409, 'USER_EXISTS');
        return;
      }
      sendError(res, 'Internal server error during registration', 500, 'REGISTRATION_FAILED');
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
      return;
    }

    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      sendError(res, error.message, 401, 'AUTHENTICATION_FAILED');
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        sendError(res, 'Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
        return;
      }
      const newAccessToken = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, { accessToken: newAccessToken }, 'Token refreshed successfully');
    } catch (error: any) {
      sendError(res, 'Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        sendError(res, 'Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
        return;
      }
      await authService.logout(refreshToken);
      sendSuccess(res, {}, 'Logged out successfully');
    } catch (error: any) {
      sendError(res, 'Internal server error during logout', 500, 'LOGOUT_FAILED');
    }
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
        sendError(res, 'User not authenticated', 401, 'UNAUTHENTICATED');
        return;
    }
    sendSuccess(res, { user: req.user }, 'Profile retrieved successfully');
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
      return;
    }
    if (!req.user) {
        sendError(res, 'User not authenticated', 401, 'UNAUTHENTICATED');
        return;
    }

    try {
        // Type assertion để đảm bảo _id là string
        const userId = req.user._id?.toString() || '';
        const updatedUser = await authService.updateProfile(userId, req.body);
        sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
    } catch (error: any) {
        if (error.message.includes('already taken')) {
            sendError(res, error.message, 409, 'USERNAME_TAKEN');
            return;
        }
        sendError(res, 'Internal server error during profile update', 500, 'PROFILE_UPDATE_FAILED');
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
      return;
    }
    if (!req.user) {
        sendError(res, 'User not authenticated', 401, 'UNAUTHENTICATED');
        return;
    }

    try {
        const { currentPassword, newPassword } = req.body;
        // Type assertion để đảm bảo _id là string
        const userId = req.user._id?.toString() || '';
        await authService.changePassword(userId, currentPassword, newPassword);
        sendSuccess(res, {}, 'Password changed successfully');
    } catch (error: any) {
        if (error.message.includes('Current password is incorrect')) {
            sendError(res, error.message, 400, 'INVALID_CURRENT_PASSWORD');
            return;
        }
        sendError(res, 'Internal server error during password change', 500, 'PASSWORD_CHANGE_FAILED');
    }
  }
}

export default new AuthController();
