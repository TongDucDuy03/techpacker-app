import { Request, Response, NextFunction } from 'express';
import User, { IUser, UserRole } from '../models/user.model';
import { authService, ITokenPayload } from '../services/auth.service';
import { sendError } from '../utils/response.util';
import { cacheService, CacheKeys, CacheTTL } from '../services/cache.service';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Step 1: verify access token; if invalid/expired -> return 401
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return sendError(res, 'Access denied. No token provided.', 401, 'UNAUTHORIZED');
  }

  let decoded: ITokenPayload;
  try {
    decoded = authService.verifyAccessToken(token) as ITokenPayload;
  } catch (err) {
    return sendError(res, 'Access denied. Invalid or expired token.', 401, 'INVALID_TOKEN');
  }

  // Step 2: attempt to get user from cache, but gracefully fallback to DB on any cache error
  const userCacheKey = CacheKeys.user(decoded.userId.toString());
  let user: IUser | null = null;

  try {
    try {
      user = await cacheService.get<IUser>(userCacheKey);
    } catch (cacheErr) {
      // Log cache errors but do not treat them as auth failures
      console.warn('Cache service error when fetching user; falling back to DB. Error:', (cacheErr as Error).message);
      user = null;
    }

    if (!user) {
      const dbUser = await User.findById(decoded.userId);
      user = dbUser;

      // Best-effort: try to set cache but ignore errors
      try {
        if (user) {
          await cacheService.set(userCacheKey, user, CacheTTL.SHORT);
        }
      } catch (e) {
        // ignore cache set errors
      }
    }

    if (!user || !user.isActive) {
      return sendError(res, 'Access denied. User not found or is inactive.', 401, 'UNAUTHORIZED');
    }

    req.user = user as IUser;
    next();
  } catch (error) {
    // Any unexpected error - do not leak stack, return generic 500
    console.error('Auth middleware unexpected error:', error);
    return sendError(res, 'Authentication failed', 500, 'INTERNAL_ERROR');
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

// TechPack access control middleware
export const requireTechPackAccess = (requiredActions: string[] = ['view']) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return sendError(res, 'Authentication required. Please log in.', 401, 'UNAUTHORIZED');
    }

    // System admins have universal access
    if (req.user.role === UserRole.Admin) {
      return next();
    }

    const techPackId = req.params.id;
    if (!techPackId) {
      return sendError(res, 'TechPack ID is required.', 400, 'BAD_REQUEST');
    }

    try {
      // Import here to avoid circular dependency
      const TechPack = (await import('../models/techpack.model')).default;

      const techPack = await TechPack.findById(techPackId);
      if (!techPack) {
        return sendError(res, 'TechPack not found.', 404, 'NOT_FOUND');
      }

      // Check if user is the owner
      const isOwner = techPack.createdBy?.toString() === req.user!._id.toString();
      if (isOwner) {
        return next(); // Owner has all permissions
      }

      // Check if user has shared access
      const sharedAccess = techPack.sharedWith?.find(
        (share: any) => share.userId.toString() === req.user!._id.toString()
      );

      if (!sharedAccess) {
        return sendError(res, 'Access denied. You do not have permission to access this TechPack.', 403, 'FORBIDDEN');
      }

      // Apply Global Role Override: get effective role based on user's system role
      const { getEffectiveRole } = await import('../utils/access-control.util');
      const effectiveRole = getEffectiveRole(req.user!.role, sharedAccess.role);

      // Check if user's effective role allows the required actions
      const hasPermission = requiredActions.every(action => {
        switch (action) {
          case 'view':
            return true; // All shared users can view (with effective role)
          case 'edit':
            return ['owner', 'admin', 'editor'].includes(effectiveRole);
          case 'share':
            return ['owner', 'admin'].includes(effectiveRole);
          case 'delete':
            return false; // Only owner can delete (handled above)
          default:
            return false;
        }
      });

      if (!hasPermission) {
        return sendError(
          res,
          `Access denied. Your effective role (${effectiveRole}) does not allow the required actions: ${requiredActions.join(', ')}.`,
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      console.error('TechPack access check error:', error);
      return sendError(res, 'Failed to verify TechPack access.', 500, 'INTERNAL_ERROR');
    }
  };
};
