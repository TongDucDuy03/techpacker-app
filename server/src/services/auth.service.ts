import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import User, { IUser } from '../models/user.model';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Simple in-memory store for refresh tokens (use Redis in production)
const refreshTokenStore = new Set<string>();

export class AuthService {
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.refreshTokenSecret, {
      expiresIn: config.refreshTokenExpiresIn as any,
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async generateTokens(user: IUser): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token
    refreshTokenStore.add(refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes
    };
  }

  private formatUser(user: IUser) {
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<{ user: any; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      throw new Error('User already exists with this email or username');
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create(userData);
    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async login(email: string, password: string): Promise<{ user: any; tokens: AuthTokens }> {
    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (!refreshTokenStore.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    const payload = this.verifyRefreshToken(refreshToken);

    // Verify user still exists
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    refreshTokenStore.delete(refreshToken);
  }

  async updateProfile(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    username?: string;
  }): Promise<any> {
    // Check if username is already taken
    if (updates.username) {
      const existingUser = await User.findOne({
        username: updates.username,
        _id: { $ne: userId }
      });

      if (existingUser) {
        throw new Error('Username is already taken');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return this.formatUser(updatedUser);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();
  }
}

export const authService = new AuthService();
