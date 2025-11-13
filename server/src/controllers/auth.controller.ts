import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/user.model';
import { authService } from '../services/auth.service';
import { twoFactorService } from '../services/twoFactor.service';
import { emailService } from '../services/email.service';
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
    this.send2FACode = this.send2FACode.bind(this);
    this.verify2FA = this.verify2FA.bind(this);
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

      const requiresTwoFactor = user.is2FAEnabled !== false;

      // Check if 2FA is enabled (default: enabled for all users)
      if (requiresTwoFactor) {
        // Generate 2FA code
        const code = twoFactorService.generateCode();
        const hashedCode = await twoFactorService.hashCode(code);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store hashed code and expiration
        user.twoFactorCode = hashedCode;
        user.twoFactorCodeExpires = expiresAt;
        user.twoFactorCodeAttempts = 0;
        await user.save();

        // Send code via email
        const emailSent = await emailService.send2FACode(
          user.email,
          code,
          `${user.firstName} ${user.lastName}`
        );

        if (!emailSent) {
          console.error('Failed to send 2FA email');
          // Reset 2FA code on failure
          await twoFactorService.reset2FACode(user);
          return sendError(res, 'Failed to send verification code. Please try again.', 500, 'EMAIL_ERROR');
        }

        // Generate temporary session token
        const sessionToken = twoFactorService.generateSessionToken(user._id.toString());

        console.log('2FA code sent to:', email);
        return sendSuccess(res, {
          requires2FA: true,
          sessionToken,
          message: 'Verification code sent to your email'
        }, 'Verification code sent');
      }

      // Normal login flow (no 2FA)
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

  /**
   * Send 2FA code (resend)
   */
  async send2FACode(req: Request, res: Response): Promise<void> {
    try {
      const { sessionToken } = req.body;

      if (!sessionToken) {
        return sendError(res, 'Session token is required', 400, 'BAD_REQUEST');
      }

      // Verify session token
      let decoded: { userId: string; type: string };
      try {
        decoded = twoFactorService.verifySessionToken(sessionToken);
      } catch (error) {
        return sendError(res, 'Invalid or expired session token', 401, 'UNAUTHORIZED');
      }

      // Get user
      const user = await User.findById(decoded.userId).select('+twoFactorCode');
      if (!user || user.is2FAEnabled === false) {
        return sendError(res, 'User not found or 2FA not enabled', 404, 'NOT_FOUND');
      }

      // Generate new code
      const code = twoFactorService.generateCode();
      const hashedCode = await twoFactorService.hashCode(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.twoFactorCode = hashedCode;
      user.twoFactorCodeExpires = expiresAt;
      user.twoFactorCodeAttempts = 0;
      await user.save();

      // Send email
      const emailSent = await emailService.send2FACode(
        user.email,
        code,
        `${user.firstName} ${user.lastName}`
      );

      if (!emailSent) {
        await twoFactorService.reset2FACode(user);
        return sendError(res, 'Failed to send verification code', 500, 'EMAIL_ERROR');
      }

      sendSuccess(res, { message: 'Verification code sent to your email' }, 'Code sent successfully');
    } catch (error: any) {
      console.error('Send 2FA code error:', error);
      sendError(res, 'Failed to send verification code', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FA(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { sessionToken, code } = req.body;

      if (!sessionToken || !code) {
        return sendError(res, 'Session token and code are required', 400, 'BAD_REQUEST');
      }

      // Verify session token
      let decoded: { userId: string; type: string };
      try {
        decoded = twoFactorService.verifySessionToken(sessionToken);
      } catch (error) {
        return sendError(res, 'Invalid or expired session token', 401, 'UNAUTHORIZED');
      }

      // Get user with 2FA code
      const user = await User.findById(decoded.userId).select('+twoFactorCode');
      if (!user || user.is2FAEnabled === false) {
        return sendError(res, 'User not found or 2FA not enabled', 404, 'NOT_FOUND');
      }

      // Check if code is expired
      if (twoFactorService.isCodeExpired(user.twoFactorCodeExpires)) {
        await twoFactorService.reset2FACode(user);
        return sendError(res, 'Verification code has expired. Please request a new one.', 401, 'CODE_EXPIRED');
      }

      // Check attempts
      if (twoFactorService.hasExceededAttempts(user.twoFactorCodeAttempts || 0)) {
        await twoFactorService.reset2FACode(user);
        return sendError(res, 'Too many failed attempts. Please request a new code.', 429, 'TOO_MANY_ATTEMPTS');
      }

      // Verify code
      if (!user.twoFactorCode) {
        return sendError(res, 'No verification code found. Please request a new one.', 400, 'NO_CODE');
      }

      const isValid = await twoFactorService.verifyCode(code, user.twoFactorCode);
      if (!isValid) {
        await twoFactorService.incrementAttempts(user);
        return sendError(res, 'Invalid verification code', 401, 'INVALID_CODE');
      }

      // Code is valid - complete login
      await twoFactorService.reset2FACode(user);

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Store refresh token
      user.refreshTokens.push(refreshToken);
      user.lastLogin = new Date();
      await user.save();

      // Exclude sensitive data
      const { password: _, refreshTokens: __, twoFactorCode: ___, ...userResponse } = user.toObject();

      console.log('2FA verification successful for user:', user.email);
      sendSuccess(res, {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }, 'Login successful');
    } catch (error: any) {
      console.error('Verify 2FA error:', error);
      sendError(res, 'Failed to verify code', 500, 'INTERNAL_ERROR');
    }
  }

}

export default new AuthController();
