import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import { Types } from 'mongoose';

interface ActivityLoggerOptions {
  action: ActivityAction;
  getTarget?: (req: AuthRequest, res: Response) => Promise<{ type: string; id: Types.ObjectId; name: string } | null>;
  getDetails?: (req: AuthRequest, res: Response) => any;
  skipCondition?: (req: AuthRequest, res: Response) => boolean;
}

/**
 * Middleware factory to create activity logging middleware
 */
export const createActivityLogger = (options: ActivityLoggerOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Only log if request was successful and user is authenticated
      if (res.statusCode < 400 && req.user && !options.skipCondition?.(req, res)) {
        // Log activity asynchronously to avoid blocking response
        setImmediate(async () => {
          try {
            let target = null;
            
            if (options.getTarget) {
              target = await options.getTarget(req, res);
            } else {
              // Default target extraction from params
              const { id } = req.params;
              if (id) {
                target = {
                  type: 'TechPack',
                  id: new Types.ObjectId(id),
                  name: body?.data?.techpack?.articleName || body?.data?.techpack?.productName || body?.data?.articleName || body?.data?.productName || 'Unknown'
                };
              }
            }
            
            if (target && req.user) {
              await logActivity({
                userId: req.user._id,
                userName: req.user.fullName,
                action: options.action,
                target,
                details: options.getDetails?.(req, res) || {},
                req
              });
            }
          } catch (error) {
            console.error('Activity logging error:', error);
          }
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Pre-configured activity loggers for common actions
 */
export const activityLoggers = {
  // TechPack actions
  techpackCreate: createActivityLogger({
    action: ActivityAction.TECHPACK_CREATE,
    getTarget: async (req, res) => {
      const body = res.locals.responseBody || {};
      return {
        type: 'TechPack',
        id: body.data?.techpack?._id || req.params.id,
        name: body.data?.techpack?.articleName || body.data?.techpack?.productName || 'New TechPack'
      };
    }
  }),

  techpackUpdate: createActivityLogger({
    action: ActivityAction.TECHPACK_UPDATE,
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body),
      isSignificantChange: req.body.revisionReason ? true : false
    })
  }),

  techpackDelete: createActivityLogger({
    action: ActivityAction.TECHPACK_DELETE
  }),

  // BOM actions
  bomAdd: createActivityLogger({
    action: ActivityAction.BOM_ADD,
    getDetails: (req) => ({
      bomItem: {
        part: req.body.part,
        materialName: req.body.materialName,
        quantity: req.body.quantity
      }
    })
  }),

  bomUpdate: createActivityLogger({
    action: ActivityAction.BOM_UPDATE,
    getDetails: (req) => ({
      bomItemId: req.params.bomId,
      updatedFields: Object.keys(req.body)
    })
  }),

  bomDelete: createActivityLogger({
    action: ActivityAction.BOM_DELETE,
    getDetails: (req) => ({
      bomItemId: req.params.bomId
    })
  }),

  // Measurement actions
  measurementAdd: createActivityLogger({
    action: ActivityAction.MEASUREMENT_ADD,
    getDetails: (req) => ({
      measurement: {
        pomCode: req.body.pomCode,
        pomName: req.body.pomName,
        critical: req.body.critical
      }
    })
  }),

  measurementUpdate: createActivityLogger({
    action: ActivityAction.MEASUREMENT_UPDATE,
    getDetails: (req) => ({
      measurementId: req.params.measurementId,
      updatedFields: Object.keys(req.body)
    })
  }),

  measurementDelete: createActivityLogger({
    action: ActivityAction.MEASUREMENT_DELETE,
    getDetails: (req) => ({
      measurementId: req.params.measurementId
    })
  }),

  // Colorway actions
  colorwayAdd: createActivityLogger({
    action: ActivityAction.COLORWAY_ADD,
    getDetails: (req) => ({
      colorway: {
        name: req.body.name,
        code: req.body.code,
        pantoneCode: req.body.pantoneCode
      }
    })
  }),

  colorwayUpdate: createActivityLogger({
    action: ActivityAction.COLORWAY_UPDATE,
    getDetails: (req) => ({
      colorwayId: req.params.colorwayId,
      updatedFields: Object.keys(req.body)
    })
  }),

  colorwayDelete: createActivityLogger({
    action: ActivityAction.COLORWAY_DELETE,
    getDetails: (req) => ({
      colorwayId: req.params.colorwayId
    })
  }),

  // Status change actions
  statusChange: createActivityLogger({
    action: ActivityAction.STATUS_CHANGE_SUBMITTED, // Will be overridden based on actual action
    getDetails: (req) => ({
      action: req.body.action,
      comments: req.body.comments,
      previousStatus: req.body.previousStatus
    })
  }),

  // PDF export
  pdfExport: createActivityLogger({
    action: ActivityAction.PDF_EXPORT,
    getDetails: (req) => ({
      format: req.query.format || 'A4',
      options: req.query.options
    }),
    skipCondition: (_req, res) => res.statusCode !== 200 // Only log successful PDF exports
  }),

  // User actions
  userLogin: createActivityLogger({
    action: ActivityAction.USER_LOGIN,
    getTarget: async (req) => ({
      type: 'User',
      id: req.user!._id as Types.ObjectId,
      name: req.user!.fullName
    }),
    getDetails: (req) => ({
      loginMethod: 'email',
      userAgent: req.get('User-Agent')
    })
  }),

  userLogout: createActivityLogger({
    action: ActivityAction.USER_LOGOUT,
    getTarget: async (req) => ({
      type: 'User',
      id: req.user!._id as Types.ObjectId,
      name: req.user!.fullName
    })
  })
};

/**
 * Middleware to log user login activity
 */
export const logLoginActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (req.user && res.statusCode === 200) {
    try {
      await logActivity({
        userId: req.user._id,
        userName: req.user.fullName,
        action: ActivityAction.USER_LOGIN,
        target: {
          type: 'User',
          id: req.user._id as Types.ObjectId,
          name: req.user.fullName
        },
        details: {
          loginMethod: 'email',
          userAgent: req.get('User-Agent')
        },
        req
      });
    } catch (error) {
      console.error('Login activity logging error:', error);
    }
  }
  next();
};

/**
 * Generic activity logging middleware that can be applied to any route
 */
export const logGenericActivity = (action: ActivityAction, targetType: string = 'TechPack') => {
  return createActivityLogger({
    action,
    getTarget: async (req, _res) => {
      const { id } = req.params;
      return id ? {
        type: targetType,
        id: new Types.ObjectId(id),
        name: `${targetType} ${id}`
      } : null;
    }
  });
};

export default {
  createActivityLogger,
  activityLoggers,
  logLoginActivity,
  logGenericActivity
};
