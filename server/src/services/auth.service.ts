import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { IUser } from '../models/user.model';
import { Types } from 'mongoose';

export interface ITokenPayload {
  userId: string | Types.ObjectId;
  role: string;
}

class AuthService {
  /**
   * Generates an access token for a user.
   * @param user The user object.
   * @returns A JWT access token.
   */
  generateAccessToken(user: IUser): string {
    const payload: ITokenPayload = {
      userId: user._id,
      role: user.role,
    };
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as any);
  }

  /**
   * Generates a refresh token for a user.
   * @param user The user object.
   * @returns A JWT refresh token.
   */
  generateRefreshToken(user: IUser): string {
    const payload = {
      userId: user._id,
    };
    return jwt.sign(payload, config.refreshTokenSecret, {
      expiresIn: config.refreshTokenExpiresIn,
    } as any);
  }

  /**
   * Verifies an access token.
   * @param token The access token to verify.
   * @returns The decoded token payload if valid.
   */
  verifyAccessToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as ITokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verifies a refresh token.
   * @param token The refresh token to verify.
   * @returns The decoded token payload if valid.
   */
  verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, config.refreshTokenSecret) as { userId: string };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

export const authService = new AuthService();
