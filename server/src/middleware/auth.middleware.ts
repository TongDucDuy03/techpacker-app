import { Request, Response, NextFunction } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import { authService, ITokenPayload } from '../services/auth.service';
import { sendError } from '../utils/response.util';

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
      return sendError(res, 'Access denied. No token provided.', 401, 'UNAUTHORIZED');
    }

    const decoded = authService.verifyAccessToken(token) as ITokenPayload;

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return sendError(res, 'Access denied. User not found or is inactive.', 401, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Access denied. Invalid or expired token.', 401, 'INVALID_TOKEN');
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // This should not be reached if requireAuth is used before it, but as a safeguard:
      return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Insufficient permissions. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== UserRole.Admin) {
    return sendError(
      res,
      'Admin access required. This action is restricted to administrators only.',
      403,
      'FORBIDDEN'
    );
  }

  next();
};

// Designer or Admin middleware
export const requireDesignerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
  }

  if (req.user.role !== UserRole.Admin && req.user.role !== UserRole.Designer) {
    return sendError(
      res,
      'Designer or Admin access required.',
      403,
      'FORBIDDEN'
    );
  }

  next();
};

// Resource ownership check (placeholder)
export const requireOwnershipOrAdmin = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    // Admins have universal access
    if (req.user.role === UserRole.Admin) {
      return next();
    }

    // Placeholder for non-admin ownership check.
    // A real implementation would fetch the resource from the DB and check the createdBy field.
    // e.g., const techpack = await Techpack.findById(req.params.id);
    //       if (techpack.createdBy.toString() !== req.user._id.toString()) { ... }
    const resourceId = req.params.id;
    if (resourceId && req.user._id.toString() !== resourceId) {
      return sendError(
        res,
        'Access denied. You do not have ownership of this resource.',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};
