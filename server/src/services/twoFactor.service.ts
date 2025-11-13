import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { IUser } from '../models/user.model';

class TwoFactorService {
  /**
   * Generate a 6-digit 2FA code
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash 2FA code before storing
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  /**
   * Verify 2FA code
   */
  async verifyCode(code: string, hashedCode: string): Promise<boolean> {
    return bcrypt.compare(code, hashedCode);
  }

  /**
   * Generate temporary session token for 2FA verification
   * This token is used to complete login after 2FA verification
   */
  generateSessionToken(userId: string): string {
    return jwt.sign(
      { userId, type: '2fa_session' },
      config.jwtSecret,
      { expiresIn: '15m' } // 15 minutes
    );
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): { userId: string; type: string } {
    try {
      return jwt.verify(token, config.jwtSecret) as { userId: string; type: string };
    } catch (error) {
      throw new Error('Invalid or expired session token');
    }
  }

  /**
   * Check if code is expired
   */
  isCodeExpired(expiresAt: Date | undefined): boolean {
    if (!expiresAt) return true;
    return new Date() > expiresAt;
  }

  /**
   * Check if user has exceeded max attempts
   */
  hasExceededAttempts(attempts: number, maxAttempts: number = 5): boolean {
    return attempts >= maxAttempts;
  }

  /**
   * Reset 2FA code and attempts
   */
  async reset2FACode(user: IUser): Promise<void> {
    delete user.twoFactorCode;
    delete user.twoFactorCodeExpires;
    user.twoFactorCodeAttempts = 0;
    await user.save();
  }

  /**
   * Increment attempt counter
   */
  async incrementAttempts(user: IUser): Promise<void> {
    user.twoFactorCodeAttempts = (user.twoFactorCodeAttempts || 0) + 1;
    await user.save();
  }
}

export const twoFactorService = new TwoFactorService();
export default twoFactorService;

