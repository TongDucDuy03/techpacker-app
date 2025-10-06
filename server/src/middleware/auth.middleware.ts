import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser, UserRole } from '../models/user.model';
import { config } from '../config/config';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireOwnershipOrRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
      return;
    }

    // Check if user has required role
    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    // Check ownership (will be validated in controller)
    req.user.requiresOwnershipCheck = true;
    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};
