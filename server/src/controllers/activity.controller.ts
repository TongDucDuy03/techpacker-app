import { Response } from 'express';
import { validationResult } from 'express-validator';
import Activity, { ActivityAction } from '../models/activity.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { createPaginatedResponse, extractPaginationFromQuery } from '../utils/pagination';
import { cacheService, CacheKeys, CacheTTL } from '../services/cache.service';

export class ActivityController {
  /**
   * Get user activities with pagination
   * GET /api/activities
   */
  async getUserActivities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const paginationOptions = extractPaginationFromQuery(req.query);
      const { action, target, startDate, endDate } = req.query;

      // Build query
      const query: any = { userId: user._id };

      if (action) {
        query.action = action;
      }

      if (target) {
        query['target.type'] = target;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      // Check cache first
      const cacheKey = CacheKeys.activities(
        user._id.toString(), 
        paginationOptions.page || 1
      );
      
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        res.json(cachedData);
        return;
      }

      // Execute query
      const [activities, total] = await Promise.all([
        Activity.find(query)
          .sort({ timestamp: -1 })
          .skip(((paginationOptions.page || 1) - 1) * (paginationOptions.limit || 20))
          .limit(paginationOptions.limit || 20)
          .lean(),
        Activity.countDocuments(query)
      ]);

      const response = createPaginatedResponse(activities, paginationOptions, total);

      // Cache the response
      await cacheService.set(cacheKey, response, CacheTTL.SHORT);

      res.json({
        success: true,
        ...response
      });
    } catch (error: any) {
      console.error('Get user activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get all activities (Admin only)
   * GET /api/activities/all
   */
  async getAllActivities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      
      // Check admin permission
      if (user.role !== UserRole.Admin) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
        return;
      }

      const paginationOptions = extractPaginationFromQuery(req.query);
      const { action, userId, target, startDate, endDate } = req.query;

      // Build query
      const query: any = {};

      if (action) {
        query.action = action;
      }

      if (userId) {
        query.userId = userId;
      }

      if (target) {
        query['target.type'] = target;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      // Execute query
      const [activities, total] = await Promise.all([
        Activity.find(query)
          .populate('userId', 'firstName lastName username')
          .sort({ timestamp: -1 })
          .skip(((paginationOptions.page || 1) - 1) * (paginationOptions.limit || 20))
          .limit(paginationOptions.limit || 20)
          .lean(),
        Activity.countDocuments(query)
      ]);

      const response = createPaginatedResponse(activities, paginationOptions, total);

      res.json({
        success: true,
        ...response
      });
    } catch (error: any) {
      console.error('Get all activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get activity statistics
   * GET /api/activities/stats
   */
  async getActivityStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { period = '7d', userId } = req.query;

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      // Build base query
      const baseQuery: any = {
        timestamp: { $gte: startDate, $lte: now }
      };

      // Add user filter
      if (userId && user.role === UserRole.Admin) {
        baseQuery.userId = userId;
      } else if (user.role !== UserRole.Admin) {
        baseQuery.userId = user._id;
      }

      // Check cache
      const cacheKey = CacheKeys.stats(`activities:${user._id}:${period}:${userId || 'all'}`);
      const cachedStats = await cacheService.get(cacheKey);
      
      if (cachedStats) {
        res.json(cachedStats);
        return;
      }

      // Aggregate statistics
      const [actionStats, targetStats, dailyStats, totalCount] = await Promise.all([
        // Action distribution
        Activity.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Target type distribution
        Activity.aggregate([
          { $match: baseQuery },
          { $group: { _id: '$target.type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // Daily activity count
        Activity.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: {
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),

        // Total count
        Activity.countDocuments(baseQuery)
      ]);

      const stats = {
        success: true,
        data: {
          period,
          totalActivities: totalCount,
          actionDistribution: actionStats,
          targetDistribution: targetStats,
          dailyActivity: dailyStats,
          averagePerDay: Math.round(totalCount / Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
          generatedAt: new Date().toISOString()
        }
      };

      // Cache the stats
      await cacheService.set(cacheKey, stats, CacheTTL.MEDIUM);

      res.json(stats);
    } catch (error: any) {
      console.error('Get activity stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get recent activities for dashboard
   * GET /api/activities/recent
   */
  async getRecentActivities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const query: any = user.role === UserRole.Admin 
        ? {} 
        : { userId: user._id };

      const activities = await Activity.find(query)
        .populate('userId', 'firstName lastName username')
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: {
          activities,
          count: activities.length
        }
      });
    } catch (error: any) {
      console.error('Get recent activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Export activities to CSV (Admin only)
   * GET /api/activities/export
   */
  async exportActivities(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      
      if (user.role !== UserRole.Admin) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
        return;
      }

      const { startDate, endDate, format = 'csv' } = req.query;

      const query: any = {};
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate as string);
        }
      }

      const activities = await Activity.find(query)
        .populate('userId', 'firstName lastName username email')
        .sort({ timestamp: -1 })
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const csvHeaders = [
          'Timestamp',
          'User Name',
          'User Email',
          'Action',
          'Target Type',
          'Target Name',
          'IP Address',
          'User Agent'
        ];

        const csvRows = activities.map(activity => [
          activity.timestamp.toISOString(),
          activity.userName,
          (activity.userId as any)?.email || '',
          activity.action,
          activity.target.type,
          activity.target.name,
          activity.ipAddress || '',
          activity.userAgent || ''
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="activities_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            activities,
            count: activities.length,
            exportedAt: new Date().toISOString()
          }
        });
      }
    } catch (error: any) {
      console.error('Export activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export default new ActivityController();
