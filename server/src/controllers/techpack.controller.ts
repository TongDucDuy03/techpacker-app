import { Response } from 'express';
import { validationResult } from 'express-validator';
import TechPack, { ITechPack, TechPackStatus, TechPackRole } from '../models/techpack.model';
import Revision from '../models/revision.model';
import RevisionService from '../services/revision.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import User from '../models/user.model';
import { config } from '../config/config';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import { sendSuccess, sendError, formatValidationErrors } from '../utils/response.util';
import { Types } from 'mongoose';
import PermissionManager from '../utils/permissions.util';
import { cacheService, CacheKeys, CacheTTL } from '../services/cache.service';
import CacheInvalidationUtil from '../utils/cache-invalidation.util';
import _ from 'lodash';
import { hasEditAccess } from '../utils/access-control.util';

/**
 * Helper function to merge arrays of subdocuments
 * Handles new items (without _id) and existing items (with _id)
 * Matches items by _id (ObjectId) or id (string) from frontend
 */
function mergeSubdocumentArray<T extends { _id?: Types.ObjectId; id?: string }>(
  oldArray: T[],
  newArray: T[]
): T[] {
  if (!newArray || !Array.isArray(newArray)) {
    return oldArray || [];
  }

  // Create maps of existing items by _id and id for quick lookup
  const existingById = new Map<string, T>();
  const existingByStringId = new Map<string, T>();
  
  (oldArray || []).forEach(item => {
    if (item._id) {
      existingById.set(item._id.toString(), item);
    }
    // Also map by id string if it exists (for frontend compatibility)
    if (item.id) {
      existingByStringId.set(String(item.id), item);
    }
    // Note: _id.toString() might match id, but we still want to map by id separately
    // for cases where frontend sends id as string representation of _id
  });

  // Process new array
  const merged: T[] = [];
  
  newArray.forEach(newItem => {
    let existingItem: T | undefined;
    
    // Priority 1: Try to find by _id (ObjectId) if provided
    if (newItem._id) {
      existingItem = existingById.get(newItem._id.toString());
    }
    
    // Priority 2: Try to find by id (string) from frontend
    if (!existingItem && newItem.id) {
      existingItem = existingByStringId.get(String(newItem.id));
    }
    
    if (existingItem) {
      // Update existing item - preserve _id from existing item
      const updatedItem = {
        ...existingItem,
        ...newItem,
        _id: existingItem._id // Preserve original _id from database
      };
      // Remove temporary id if it exists (keep _id only for Mongoose)
      delete (updatedItem as any).id;
      merged.push(updatedItem as T);
    } else {
      // New item - create with new _id
      const newItemWithId = {
        ...newItem,
        _id: newItem._id || new Types.ObjectId()
      };
      // Remove temporary id if it exists (keep _id only for Mongoose)
      delete (newItemWithId as any).id;
      merged.push(newItemWithId as T);
    }
  });
  
  return merged;
}

export class TechPackController {
  constructor() {
    this.checkArticleCode = this.checkArticleCode.bind(this);
    this.getTechPackStats = this.getTechPackStats.bind(this);
    this.getTechPacks = this.getTechPacks.bind(this);
    this.getTechPack = this.getTechPack.bind(this);
    this.createTechPack = this.createTechPack.bind(this);
    this.updateTechPack = this.updateTechPack.bind(this);
    this.patchTechPack = this.patchTechPack.bind(this);
    this.deleteTechPack = this.deleteTechPack.bind(this);
    this.duplicateTechPack = this.duplicateTechPack.bind(this);
    this.bulkOperations = this.bulkOperations.bind(this);
    this.shareTechPack = this.shareTechPack.bind(this);
    this.revokeShare = this.revokeShare.bind(this);
    this.getAuditLogs = this.getAuditLogs.bind(this);
    this.getShareableUsers = this.getShareableUsers.bind(this);
    this.getAccessList = this.getAccessList.bind(this);
    this.updateShareRole = this.updateShareRole.bind(this);
    this.exportPDF = this.exportPDF.bind(this);
  }


  /**
   * Get TechPack statistics (total count and counts by status)
   * GET /api/v1/techpacks/stats
   */
  async getTechPackStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      
      // Validate user._id is a valid ObjectId
      if (!user._id || !Types.ObjectId.isValid(user._id)) {
        return sendError(res, 'Invalid user ID', 400, 'VALIDATION_ERROR');
      }
      
      const userId = new Types.ObjectId(user._id);
      const userRole = user.role?.toString().toLowerCase();
      const isAdmin = userRole === UserRole.Admin?.toString().toLowerCase() || userRole === 'admin';
      
      // Build query based on user role (same logic as getTechPacks)
      let query: any = {};
      
      if (isAdmin) {
        // Admins can view all TechPacks
        query = {};
      } else if (userRole === UserRole.Designer?.toString().toLowerCase() || userRole === 'designer') {
        query.$or = [
          { createdBy: userId },
          { 'sharedWith.userId': userId }
        ];
      } else if (userRole === UserRole.Viewer?.toString().toLowerCase() || userRole === 'viewer') {
        query = { 'sharedWith.userId': userId };
      } else if (userRole === UserRole.Merchandiser?.toString().toLowerCase() || userRole === 'merchandiser') {
        query.$or = [
          { createdBy: userId },
          { 'sharedWith.userId': userId }
        ];
      } else {
        query = { 'sharedWith.userId': userId };
      }
      
      // Include all statuses including Archived in stats
      // Don't exclude archived by default
      
      // Get counts by status using aggregation
      const stats = await TechPack.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get total count
      const total = await TechPack.countDocuments(query);
      
      // Format stats
      const statsMap: Record<string, number> = {
        total,
        draft: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
        archived: 0
      };
      
      stats.forEach((stat: any) => {
        const status = (stat._id || '').toLowerCase();
        if (status === 'draft') {
          statsMap.draft = stat.count;
        } else if (status === 'pending_approval' || status === 'in review') {
          statsMap.inReview = stat.count;
        } else if (status === 'approved') {
          statsMap.approved = stat.count;
        } else if (status === 'rejected') {
          statsMap.rejected = stat.count;
        } else if (status === 'archived') {
          statsMap.archived = stat.count;
        }
      });
      
      sendSuccess(res, statsMap, 'TechPack statistics retrieved successfully');
    } catch (error: any) {
      console.error('Get TechPack Stats error:', error);
      sendError(res, 'Failed to retrieve tech pack statistics');
    }
  }

  async getTechPacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = config.defaultPageSize, q = '', status, season, brand, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
      const user = req.user!;
      
      // Validate user._id is a valid ObjectId
      if (!user._id || !Types.ObjectId.isValid(user._id)) {
        return sendError(res, 'Invalid user ID', 400, 'VALIDATION_ERROR');
      }
      
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.maxPageSize, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Normalize user role for consistent comparison (case-insensitive)
      const userRole = user.role?.toString().toLowerCase();
      const isAdmin = userRole === UserRole.Admin?.toString().toLowerCase() || userRole === 'admin';
      
      // Debug logging for admin access
      if (isAdmin) {
        console.log('[TechPackController] Admin user detected:', {
          userId: user._id,
          role: user.role,
          normalizedRole: userRole,
          willSeeAllTechPacks: true
        });
      }
      
      // Tạo cache key dựa trên query parameters, user ID và role
      // Include role in cache key to ensure admin queries are cached separately
      const queryString = JSON.stringify({
        userId: user._id,
        role: userRole, // Include role in cache key
        page: pageNum,
        limit: limitNum,
        q,
        status,
        season,
        brand,
        sortBy,
        sortOrder
      });
      const cacheKey = CacheKeys.techpackList(queryString);

      // Check for cache bypass parameter (from frontend _nocache timestamp)
      const bypassCache = req.query._nocache !== undefined;
      
      // Thử lấy từ cache trước (skip if bypass requested)
      if (!bypassCache) {
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
          console.log('[TechPackController] Returning cached result for:', { page: pageNum, cacheKey: cacheKey.substring(0, 50) });
        return sendSuccess(res, cachedResult, 'TechPacks retrieved from cache');
        }
      } else {
        console.log('[TechPackController] Cache bypassed due to _nocache parameter');
      }

      let query: any = {};

      // Base query for access control - Updated logic per requirements
      // Ensure user._id is converted to ObjectId for proper querying
      const userId = new Types.ObjectId(user._id);
      
      if (isAdmin) {
        // Admins can view all TechPacks without restriction
        // Explicitly set empty query to ensure no filtering
        query = {};
      } else if (userRole === UserRole.Designer?.toString().toLowerCase() || userRole === 'designer') {
        // Designers can see TechPacks they created or are shared with
        query.$or = [
          { createdBy: userId },
          { 'sharedWith.userId': userId }
        ];
      } else if (userRole === UserRole.Viewer?.toString().toLowerCase() || userRole === 'viewer') {
        // Viewers can ONLY see TechPacks that are explicitly shared with them
        query = { 'sharedWith.userId': userId };
      } else if (userRole === UserRole.Merchandiser?.toString().toLowerCase() || userRole === 'merchandiser') {
        // Merchandisers can see TechPacks they created or are shared with
        query.$or = [
          { createdBy: userId },
          { 'sharedWith.userId': userId }
        ];
      } else {
        // For any other roles, restrict to only shared TechPacks
        query = { 'sharedWith.userId': userId };
      }

      // Additional search and filter criteria
      // Build filter conditions separately to combine properly
      const filterConditions: any = {};
      
      // Status filter - show all statuses including Archived by default
      // Only filter by status if explicitly requested
      if (status) {
        // User explicitly requested a status filter
        // Handle both "Archived" and "Process" (legacy "In Review") values
        if (status === 'Archived') {
          filterConditions.status = 'Archived';
        } else if (status === 'Process') {
          // Support legacy "In Review" value
          filterConditions.status = { $in: ['Process', 'In Review'] };
        } else {
          filterConditions.status = status;
        }
      }
      // If no status filter, don't add any status filter condition
      // This allows all statuses (including Archived) to be shown

      if (season) filterConditions.season = season;
      if (brand) filterConditions.brand = brand;

      // Search query - handle $or properly when combining with access control query
      if (q) {
        const searchRegex = { $regex: q, $options: 'i' };
        const searchConditions = [
          { articleName: searchRegex }, 
          { articleCode: searchRegex }, 
          { supplier: searchRegex }
        ];
        
        // If access control query already has $or, we need to combine properly using $and
        if (query.$or) {
          // Access control has $or (e.g., Designer can see own or shared)
          // Need to combine: (access control) AND (search) AND (other filters)
          const andConditions: any[] = [
            query, // Access control: { $or: [...] }
            { $or: searchConditions } // Search: { $or: [...] }
          ];
          
          // Add other filter conditions
          if (Object.keys(filterConditions).length > 0) {
            andConditions.push(filterConditions);
          }
          
          query = { $and: andConditions };
      } else {
          // No $or in access control (admin or simple query)
          // Can combine directly: access control AND search AND filters
          filterConditions.$or = searchConditions;
          query = { ...query, ...filterConditions };
        }
      } else {
        // No search, just combine access control with filters
        query = { ...query, ...filterConditions };
      }
      
      // Debug logging for admin queries
      if (isAdmin) {
        console.log('[TechPackController] Admin query:', {
          page: pageNum,
          limit: limitNum,
          skip,
          accessControlQuery: isAdmin ? '{} (all techpacks)' : (query.$or ? 'has $or' : query),
          filterConditions,
          finalQuery: JSON.stringify(query, null, 2),
          hasAnd: !!query.$and,
          hasOr: !!query.$or
        });
      }

      const sortOptions: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      // Optimize: Only select fields needed for list view, exclude heavy nested arrays
      // technicalDesignerId is now a string field, no need to populate
      // Only populate createdBy
      const [techpacks, total] = await Promise.all([
        TechPack.find(query)
          .populate('createdBy', 'firstName lastName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .select('articleCode articleName brand season status category createdAt updatedAt technicalDesignerId createdBy sharedWith supplier lifecycleStage gender currency sampleType fabricDescription productDescription designSketchUrl companyLogoUrl')
          .lean(),
        TechPack.countDocuments(query)
      ]);

      const pagination = { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) };
      const result = { data: techpacks, pagination };
      
      // Debug logging for all queries (not just admin) to help diagnose pagination issues
      console.log('[TechPackController] Query results:', {
        userId: user._id,
        role: userRole,
        isAdmin,
        page: pageNum,
        limit: limitNum,
        skip,
        totalTechPacks: total,
        returnedTechPacks: techpacks.length,
        totalPages: pagination.totalPages,
        queryKeys: Object.keys(query),
        hasAnd: !!query.$and,
        hasOr: !!query.$or,
        querySummary: JSON.stringify(query).substring(0, 200) // First 200 chars of query
      });
      
      // Additional debug for admin
      if (isAdmin) {
        console.log('[TechPackController] Admin detailed query:', {
          fullQuery: JSON.stringify(query, null, 2),
          expectedTotal: total,
          actualReturned: techpacks.length,
          shouldReturn: Math.min(limitNum, total - skip)
        });
      }

      // Lưu kết quả vào cache với TTL ngắn (5 phút)
      await cacheService.set(cacheKey, result, CacheTTL.SHORT);

      sendSuccess(res, techpacks, 'Tech packs retrieved successfully', 200, pagination);
    } catch (error: any) {
      console.error('Get TechPacks error:', error);
      
      // Check for BSON ObjectId validation errors
      if (error.name === 'BSONError' || error.message?.includes('24 character hex string') || error.message?.includes('ObjectId')) {
        console.error('BSON ObjectId validation error detected. This may indicate invalid ObjectId values in the database.');
        console.error('Error details:', {
          message: error.message,
          path: error.path,
          valueType: error.valueType,
          value: error.value
        });
        return sendError(res, 'Database contains invalid data. Please contact administrator.', 500, 'DATABASE_ERROR');
      }
      
      sendError(res, 'Failed to retrieve tech packs');
    }
  }
  
  /**
   * Check if article code exists (for duplicate validation)
   * GET /api/v1/techpacks/check-article-code/:articleCode
   */
  async checkArticleCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { articleCode } = req.params;
      
      if (!articleCode || typeof articleCode !== 'string') {
        return sendError(res, 'Article code is required', 400, 'VALIDATION_ERROR');
      }

      // Normalize to uppercase (backend stores as uppercase)
      const normalizedCode = articleCode.toUpperCase().trim();

      // Check if article code exists
      const existing = await TechPack.findOne({ articleCode: normalizedCode }).select('_id articleCode articleName').lean();

      if (existing) {
        return sendSuccess(res, { 
          exists: true, 
          articleCode: existing.articleCode,
          articleName: existing.articleName 
        }, 'Article code already exists');
      }

      return sendSuccess(res, { exists: false }, 'Article code is available');
    } catch (error: any) {
      console.error('Check article code error:', error);
      sendError(res, 'Failed to check article code', 500);
    }
  }

  async getTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestUser = req.user!;

      // Thử lấy từ cache trước
      const cacheKey = CacheKeys.techpack(id);
      const cachedTechpack = await cacheService.get<any>(cacheKey);

      if (cachedTechpack) {
        // Kiểm tra quyền truy cập từ cached data (technicalDesignerId is no longer used for access control)
        // Check if user is owner - handle both ObjectId and populated object
        const cachedCreatedById = cachedTechpack.createdBy?._id?.toString() || cachedTechpack.createdBy?.toString();
        const requestUserId = requestUser._id?.toString();
        const isOwner = cachedCreatedById === requestUserId;
        // Check if user is shared with - handle both populated object and ObjectId
        const sharedAccess = cachedTechpack.sharedWith?.find((s: any) => {
          const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
          return shareUserId === requestUserId;
        });
        
        // Access control tương tự như logic chính:
        // - Admin: có quyền xem tất cả
        // - Viewer: CHỈ xem nếu được share (KHÔNG xem ngay cả khi là owner)
        // - Designer/Merchandiser: xem nếu là owner hoặc được share
        let hasAccess = false;
        if (requestUser.role === UserRole.Admin) {
          hasAccess = true;
        } else if (requestUser.role === UserRole.Viewer) {
          // Viewer CHỈ xem được nếu được share
          hasAccess = !!sharedAccess;
        } else {
          // Designer, Merchandiser: xem nếu là owner hoặc được share
          hasAccess = isOwner || !!sharedAccess;
        }

        if (hasAccess) {
          return sendSuccess(res, cachedTechpack, 'TechPack retrieved from cache');
        }
      }

      // Handle both ObjectId and string ID formats
      // Query without populate first to avoid BSON errors from invalid ObjectIds
      let techpack: any;
      try {
        techpack = await TechPack.findById(id)
          .populate('createdBy updatedBy sharedWith.userId', 'firstName lastName email')
          .lean();
      } catch (populateError: any) {
        // If populate fails due to invalid ObjectIds, query without populate and manually populate valid ones
        console.warn('Populate error in getTechPack, using manual populate:', populateError.message);
        try {
          techpack = await TechPack.findById(id).lean();
          
          if (techpack) {
            // Collect and validate ObjectIds (technicalDesignerId is now a string, skip it)
            const userIds: Types.ObjectId[] = [];
            
            if (techpack.createdBy && Types.ObjectId.isValid(techpack.createdBy.toString())) {
              userIds.push(new Types.ObjectId(techpack.createdBy));
            }
            if (techpack.updatedBy && Types.ObjectId.isValid(techpack.updatedBy.toString())) {
              userIds.push(new Types.ObjectId(techpack.updatedBy));
            }
            
            // Collect valid userIds from sharedWith
            if (techpack.sharedWith && Array.isArray(techpack.sharedWith)) {
              techpack.sharedWith.forEach((share: any) => {
                if (share.userId && Types.ObjectId.isValid(share.userId.toString())) {
                  userIds.push(new Types.ObjectId(share.userId));
                }
              });
            }
            
            // Query users with valid ObjectIds only
            const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))].map(id => new Types.ObjectId(id));
            const usersMap = new Map();
            
            if (uniqueUserIds.length > 0) {
              try {
                const users = await User.find({ _id: { $in: uniqueUserIds } })
                  .select('firstName lastName email')
                  .lean();
                users.forEach(u => usersMap.set(u._id.toString(), u));
              } catch (userQueryError) {
                console.error('Error querying users:', userQueryError);
              }
            }
            
            // Manually attach user data (technicalDesignerId is now a string, keep as is)
            techpack.createdBy = techpack.createdBy && Types.ObjectId.isValid(techpack.createdBy.toString())
              ? usersMap.get(techpack.createdBy.toString()) || null
              : null;
            techpack.updatedBy = techpack.updatedBy && Types.ObjectId.isValid(techpack.updatedBy.toString())
              ? usersMap.get(techpack.updatedBy.toString()) || null
              : null;
            
            // Handle sharedWith
            if (techpack.sharedWith && Array.isArray(techpack.sharedWith)) {
              techpack.sharedWith = techpack.sharedWith.map((share: any) => ({
                ...share,
                userId: share.userId && Types.ObjectId.isValid(share.userId.toString())
                  ? usersMap.get(share.userId.toString()) || null
                  : null
              }));
            }
          }
        } catch (secondError) {
          console.error('Error in manual populate fallback:', secondError);
        techpack = null;
        }
      }

      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const currentUser = req.user!;
      // Check if user is owner - handle both ObjectId and populated object
      const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
      const userId = currentUser._id?.toString();
      const isOwner = createdById === userId;
      // Check if user is shared with - handle both populated object and ObjectId
      const isSharedWith = techpack.sharedWith?.some((s: any) => {
        const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
        return shareUserId === userId;
      }) || false;

      // Access control:
      // - Admin: có quyền xem tất cả
      // - Designer/Merchandiser: xem nếu là owner hoặc được share
      // - Viewer: CHỈ xem nếu được share (KHÔNG xem ngay cả khi là owner, trừ khi được share)
      if (currentUser.role === UserRole.Admin) {
        // Admin có quyền xem tất cả
      } else if (currentUser.role === UserRole.Viewer) {
        // Viewer CHỈ xem được nếu được share (KHÔNG xem ngay cả khi là owner)
        if (!isSharedWith) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
        }
      } else {
        // Designer, Merchandiser: xem nếu là owner hoặc được share
        if (!isOwner && !isSharedWith) {
          return sendError(res, 'Access denied', 403, 'FORBIDDEN');
        }
      }

      // Lưu vào cache với TTL trung bình (30 phút)
      await cacheService.set(cacheKey, techpack, CacheTTL.MEDIUM);

      // Debug: Log để kiểm tra data có đầy đủ không
      console.log('[getTechPack] Returning techpack data:', {
        id: techpack._id,
        hasBom: Array.isArray((techpack as any).bom) && (techpack as any).bom.length > 0,
        bomCount: Array.isArray((techpack as any).bom) ? (techpack as any).bom.length : 0,
        hasMeasurements: Array.isArray((techpack as any).measurements) && (techpack as any).measurements.length > 0,
        measurementsCount: Array.isArray((techpack as any).measurements) ? (techpack as any).measurements.length : 0,
        hasColorways: Array.isArray((techpack as any).colorways) && (techpack as any).colorways.length > 0,
        colorwaysCount: Array.isArray((techpack as any).colorways) ? (techpack as any).colorways.length : 0,
        hasHowToMeasures: Array.isArray((techpack as any).howToMeasure) && (techpack as any).howToMeasure.length > 0,
        hasSampleRounds: Array.isArray((techpack as any).sampleMeasurementRounds) && (techpack as any).sampleMeasurementRounds.length > 0,
        userRole: currentUser.role,
        isSharedWith,
        isOwner
      });

      // Trả về full data cho tất cả các role có quyền xem (không filter fields theo role)
      // Merchandiser và Viewer có quyền xem full data, chỉ không có quyền edit
      sendSuccess(res, techpack);
    } catch (error: any) {
      console.error('Get TechPack error:', error);
      sendError(res, 'Failed to retrieve tech pack');
    }
  }

  async createTechPack(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const user = req.user;
      if (!user) {
        return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!PermissionManager.canCreateTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to create tech packs', 403, 'FORBIDDEN');
      }

      const { mode = 'new', sourceId, newProductName, newArticleCode, copySections = [], ...restOfBody } = req.body;

      if (mode === 'clone') {
        // --- CLONE LOGIC ---
        // Support both old field names (newProductName) and new field names (articleName) for backward compatibility
        const articleName = req.body.articleName || newProductName;
        if (!sourceId || !articleName || !newArticleCode) {
          return sendError(res, 'Source ID, new article name, and new article code are required for cloning.', 400, 'VALIDATION_ERROR');
        }

        // Validate articleCode format: only uppercase letters, numbers, dash, underscore
        const articleCodeRegex = /^[A-Z0-9_-]+$/;
        const upperArticleCode = newArticleCode.toUpperCase();
        if (!articleCodeRegex.test(upperArticleCode)) {
          return sendError(res, 'Article code can only contain uppercase letters, numbers, dash (-), and underscore (_).', 400, 'VALIDATION_ERROR');
        }

        const sourceTechPack = await TechPack.findById(sourceId).lean();
        if (!sourceTechPack) {
          return sendError(res, 'Source TechPack not found.', 404, 'NOT_FOUND');
        }

        // Build the new tech pack data from the source
        const newTechPackData: Partial<ITechPack> = {};

        // ALWAYS copy required fields from sourceTechPack (fallback to req.body if missing)
        // These fields are mandatory for TechPack creation, so they must be present
        const requiredFields: Array<keyof ITechPack> = ['supplier', 'season', 'fabricDescription', 'productDescription', 'technicalDesignerId'];
        const missingFields: string[] = [];

        // Get required fields from sourceTechPack, req.body, or report as missing
        for (const field of requiredFields) {
          if (sourceTechPack[field] !== undefined && sourceTechPack[field] !== null && sourceTechPack[field] !== '') {
            (newTechPackData as any)[field] = sourceTechPack[field];
          } else if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
            (newTechPackData as any)[field] = req.body[field];
          } else {
            // If field is technicalDesignerId and missing, use current user
            if (field === 'technicalDesignerId') {
              (newTechPackData as any)[field] = user._id;
            } else {
              missingFields.push(field);
            }
          }
        }

        // If required fields are missing, return error with details
        if (missingFields.length > 0) {
          return sendError(
            res,
            `Cannot clone TechPack: Required fields are missing from source: ${missingFields.join(', ')}. Please ensure the source TechPack has all required fields or provide them in the request.`,
            400,
            'VALIDATION_ERROR'
          );
        }

        // Copy optional ArticleInfo fields if copySections includes 'ArticleInfo'
        if (copySections.includes('ArticleInfo')) {
          Object.assign(newTechPackData, {
            designSketchUrl: sourceTechPack.designSketchUrl || req.body.designSketchUrl,
            companyLogoUrl: sourceTechPack.companyLogoUrl || req.body.companyLogoUrl,
            category: sourceTechPack.category || req.body.category,
            gender: sourceTechPack.gender || req.body.gender,
            fitType: (sourceTechPack as any).fitType || req.body.fitType || (req.body.articleInfo?.fitType),
            brand: sourceTechPack.brand || req.body.brand,
            collectionName: sourceTechPack.collectionName || req.body.collectionName,
            targetMarket: sourceTechPack.targetMarket || req.body.targetMarket,
            pricePoint: sourceTechPack.pricePoint || req.body.pricePoint,
            retailPrice: sourceTechPack.retailPrice || req.body.retailPrice,
            currency: sourceTechPack.currency || req.body.currency || 'USD',
            description: sourceTechPack.description || req.body.description,
            notes: sourceTechPack.notes || req.body.notes,
            lifecycleStage: sourceTechPack.lifecycleStage || req.body.lifecycleStage,
            customerId: sourceTechPack.customerId || req.body.customerId,
          });
        } else {
          // Even if ArticleInfo is not selected, copy companyLogoUrl and other essential fields
          // that might be needed for PDF generation
          if (sourceTechPack.companyLogoUrl) {
            newTechPackData.companyLogoUrl = sourceTechPack.companyLogoUrl;
          } else if (req.body.companyLogoUrl) {
            newTechPackData.companyLogoUrl = req.body.companyLogoUrl;
          }
        }

        // Override season if provided in req.body
        if (req.body.season) {
          newTechPackData.season = req.body.season;
        }

        // Copy sections based on the checkbox selection
        if (copySections.includes('BOM')) {
          newTechPackData.bom = sourceTechPack.bom || [];
        } else {
          newTechPackData.bom = [];
        }
        
        if (copySections.includes('Measurements')) {
          newTechPackData.measurements = sourceTechPack.measurements || [];
        } else {
          newTechPackData.measurements = [];
        }
        
        if (copySections.includes('Colorways')) {
          newTechPackData.colorways = sourceTechPack.colorways || [];
        } else {
          newTechPackData.colorways = [];
        }
        
        // Handle Construction (new name) or HowToMeasure (backward compatibility)
        if (copySections.includes('Construction') || copySections.includes('HowToMeasure')) {
          newTechPackData.howToMeasure = sourceTechPack.howToMeasure || [];
        } else {
          newTechPackData.howToMeasure = [];
        }
        
        // Handle Packing section
        if (copySections.includes('Packing')) {
          newTechPackData.packingNotes = sourceTechPack.packingNotes || '';
        } else {
          newTechPackData.packingNotes = '';
        }

        // Override with new details and reset metadata
        Object.assign(newTechPackData, {
          articleName: articleName,
          articleCode: upperArticleCode,
          status: TechPackStatus.Draft,
          sampleType: '',
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          updatedBy: user._id,
          updatedByName: `${user.firstName} ${user.lastName}`,
          sharedWith: [],
          auditLogs: [],
          revisions: [], // Revisions are not copied
        });

        const newTechPack = new TechPack(newTechPackData);
        await newTechPack.save();

        // Create an initial 'clone' revision
        const initialRevision = new Revision({
          techPackId: newTechPack._id,
          version: 'v1.0',
          changeType: 'manual', // Use 'manual' instead of 'clone' (not in enum)
          changes: {
            summary: `Cloned from ${sourceTechPack.articleName || (sourceTechPack as any).productName} (${sourceTechPack.sampleType || (sourceTechPack as any).version})`,
            details: { clone: { cloned: 1 }, sourceId: sourceTechPack._id.toString() },
          },
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          description: `Initial version created by cloning from ${sourceTechPack.articleCode}`,
          statusAtChange: newTechPack.status,
          snapshot: newTechPack.toObject(),
        });
        await initialRevision.save();

        // ✅ Invalidate cache after clone
        await CacheInvalidationUtil.invalidateTechPackCache((newTechPack._id as Types.ObjectId).toString());

        sendSuccess(res, newTechPack, 'TechPack cloned successfully', 201);

      } else {
        // --- CREATE FROM SCRATCH LOGIC (existing logic) ---
        const { articleInfo, bom, measurements, colorways, howToMeasures } = restOfBody;

        // Support both old field names (productName, version) and new field names (articleName, sampleType) for backward compatibility
        const articleName = articleInfo?.articleName || req.body.articleName || articleInfo?.productName || req.body.productName;
        const articleCode = articleInfo?.articleCode || req.body.articleCode;
        // Handle sampleType: Only set default when creating new techpack and field is not provided
        // If sampleType is explicitly provided (including empty string ''), use it
        // Don't normalize empty string to default value
        let sampleType: string;
        if (articleInfo?.sampleType !== undefined) {
          // sampleType explicitly provided in articleInfo (including empty string)
          sampleType = articleInfo.sampleType;
        } else if (req.body.sampleType !== undefined) {
          // sampleType explicitly provided in body (including empty string)
          sampleType = req.body.sampleType;
        } else if (articleInfo?.version !== undefined) {
          // Fallback to version from articleInfo (backward compatibility)
          sampleType = articleInfo.version;
        } else if (req.body.version !== undefined) {
          // Fallback to version from body (backward compatibility)
          sampleType = req.body.version;
        } else {
          // Only set default empty string when field is not provided at all (create new)
          sampleType = '';
        }
        if (!articleName || !articleCode) {
          return sendError(res, 'Article Name and Article Code are required.', 400, 'VALIDATION_ERROR');
        }

        const rawMeasurementSizeRange = Array.isArray(req.body.measurementSizeRange)
          ? req.body.measurementSizeRange
          : [];
        const measurementSizeRange = rawMeasurementSizeRange
          .filter((size: any) => typeof size === 'string')
          .map((size: string) => size.trim())
          .filter((size: string) => size.length > 0);

        const requestedBaseSize =
          typeof req.body.measurementBaseSize === 'string'
            ? req.body.measurementBaseSize.trim()
            : undefined;
        const measurementBaseSize =
          requestedBaseSize && measurementSizeRange.includes(requestedBaseSize)
            ? requestedBaseSize
            : measurementSizeRange[0];

        const measurementBaseHighlightColor =
          typeof req.body.measurementBaseHighlightColor === 'string'
            ? req.body.measurementBaseHighlightColor
            : '#dbeafe';
        const measurementRowStripeColor =
          typeof req.body.measurementRowStripeColor === 'string'
            ? req.body.measurementRowStripeColor
            : '#f3f4f6';
        const measurementUnit =
          typeof req.body.measurementUnit === 'string' && ['mm', 'cm', 'inch-10', 'inch-16', 'inch-32'].includes(req.body.measurementUnit)
            ? req.body.measurementUnit
            : 'cm';

        const techpackData = {
          articleName,
          articleCode: articleCode.toUpperCase(),
          sampleType: sampleType,
          supplier: articleInfo?.supplier || req.body.supplier,
          season: articleInfo?.season || req.body.season,
          fabricDescription: articleInfo?.fabricDescription || req.body.fabricDescription,
          productDescription: articleInfo?.productDescription || req.body.productDescription,
          designSketchUrl: articleInfo?.designSketchUrl || req.body.designSketchUrl,
          companyLogoUrl: articleInfo?.companyLogoUrl || req.body.companyLogoUrl,
          // technicalDesignerId is now a free text field, accept any string value
          technicalDesignerId: articleInfo?.technicalDesignerId || req.body.technicalDesignerId || '',
          status: TechPackStatus.Draft,
          // Additional fields from articleInfo
          category: articleInfo?.productClass || req.body.category || req.body.productClass,
          gender: articleInfo?.gender || req.body.gender,
          fitType: articleInfo?.fitType || req.body.fitType,
          brand: articleInfo?.brand || req.body.brand,
          collectionName: articleInfo?.collection || articleInfo?.collectionName || req.body.collectionName,
          targetMarket: articleInfo?.targetMarket || req.body.targetMarket,
          pricePoint: articleInfo?.pricePoint || req.body.pricePoint,
          retailPrice: articleInfo?.retailPrice || req.body.retailPrice,
          currency: articleInfo?.currency || req.body.currency || 'USD',
          description: articleInfo?.notes || articleInfo?.description || req.body.description,
          notes: articleInfo?.notes || req.body.notes,
          lifecycleStage: articleInfo?.lifecycleStage || req.body.lifecycleStage,
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          updatedBy: user._id,
          updatedByName: `${user.firstName} ${user.lastName}`,
          bom: bom || [],
          measurements: measurements || [],
          colorways: colorways || [],
          howToMeasure: howToMeasures || [],
          measurementSizeRange,
          measurementBaseSize,
          measurementUnit,
          measurementBaseHighlightColor,
          measurementRowStripeColor,
          sampleMeasurementRounds: req.body.sampleMeasurementRounds || [],
          packingNotes: req.body.packingNotes || '',
          sharedWith: [],
          auditLogs: [],
        };

        const newTechPack = await TechPack.create(techpackData);

        // Create an initial revision with valid changeType and required details
        const initialRevision = new Revision({
          techPackId: newTechPack._id,
          version: 'v1.0',
          changeType: 'manual', // Use 'manual' instead of 'creation' (not in enum)
          changes: {
            summary: 'Initial version created.',
            details: { creation: { created: 1 } }, // Required field
          },
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          description: 'First version of the TechPack.',
          statusAtChange: newTechPack.status,
          snapshot: newTechPack.toObject(),
        });
        await initialRevision.save();

        // ✅ Invalidate cache after create
        await CacheInvalidationUtil.invalidateTechPackCache((newTechPack._id as Types.ObjectId).toString());

        sendSuccess(res, newTechPack, 'TechPack created successfully', 201);
      }
    } catch (error: any) {
      console.error('Create TechPack error:', error);
      if (error.code === 11000) {
        return sendError(res, 'Article code already exists. Please use a different value.', 409, 'DUPLICATE_KEY');
      }
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => ({ field: err.path, message: err.message }));
        return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validationErrors);
      }
      sendError(res, 'Failed to create tech pack');
    }
  }

  async updateTechPack(req: AuthRequest, res: Response): Promise<void> {
    // Full update logic with revision creation
    // This can be expanded based on business rules
    await this.patchTechPack(req, res);
  }

  async patchTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Check if user has permission to edit tech packs
      if (!PermissionManager.canEditTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to edit tech packs', 403, 'FORBIDDEN');
      }

      // Handle both ObjectId and string ID formats
      // Query without populate first to avoid BSON errors from invalid ObjectIds
      let techpack: any;

      // technicalDesignerId is now a string field, no need to populate
      // Only populate createdBy and sharedWith
        techpack = await TechPack.findById(id)
          .populate('createdBy', 'firstName lastName email')
          .populate('sharedWith.userId', 'firstName lastName email');
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Data integrity patch: If createdBy is missing, assign it from current user
      if (!techpack.createdBy) {
        techpack.createdBy = user._id;
      }

      // Check access permissions using centralized helper
      // Debug logging to help diagnose permission issues
      const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
      const userId = user._id?.toString();
      console.log('[updateTechPack] Permission check:', {
        userId,
        userRole: user.role,
        techpackId: techpack._id,
        createdById,
        isOwner: createdById === userId,
        sharedWithCount: techpack.sharedWith?.length || 0,
        sharedWith: techpack.sharedWith?.map((s: any) => ({
          userId: s.userId?._id?.toString() || s.userId?.toString(),
          role: s.role
        })) || []
      });
      
      if (!hasEditAccess(techpack, user)) {
        console.log('[updateTechPack] Access denied for user:', userId, 'role:', user.role, 'createdById:', createdById);
        return sendError(res, 'Access denied. You do not have permission to edit this tech pack.', 403, 'FORBIDDEN');
      }
      
      console.log('[updateTechPack] Access granted for user:', user._id.toString());

      // Define whitelist of updatable fields to prevent schema validation errors
      // Support both old field names (productName, version) and new field names (articleName, sampleType) for backward compatibility
      const allowedFields = [
        'articleName', 'productName', 'articleCode', 'sampleType', 'version', 'supplier', 'season',
        'fabricDescription', 'productDescription', 'designSketchUrl', 'companyLogoUrl', 'status', 'category', 'gender', 'fitType', 'brand',
        'technicalDesignerId', 'lifecycleStage', 'collectionName', 'targetMarket', 'pricePoint',
        'retailPrice', 'currency', 'description', 'notes', 'bom',
        'measurements', 'colorways', 'howToMeasure', 'sampleMeasurementRounds',
        'measurementSizeRange', 'measurementBaseSize', 'measurementUnit', 'measurementBaseHighlightColor', 'measurementRowStripeColor',
        'packingNotes'
      ];

      // Safely update only whitelisted fields that exist in request body
      const updateData: any = {
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`
      };

      // Handle articleInfo object - map to top level fields
      if (req.body.articleInfo && typeof req.body.articleInfo === 'object') {
        const articleInfo = req.body.articleInfo;
        // Map articleInfo fields to top level
        if (articleInfo.articleName !== undefined) {
          updateData.articleName = articleInfo.articleName;
        }
        if (articleInfo.articleCode !== undefined) {
          updateData.articleCode = articleInfo.articleCode;
        }
        // Handle sampleType update:
        // - If sampleType is explicitly provided (including empty string ''), use it
        // - Don't set default value when updating - respect user's intention to clear the field
        // - Only update if the field exists in articleInfo (user has interacted with it)
        if (articleInfo.sampleType !== undefined) {
          // Allow empty string to clear the field - don't normalize to default
          updateData.sampleType = articleInfo.sampleType;
        }
        if (articleInfo.supplier !== undefined) {
          updateData.supplier = articleInfo.supplier;
        }
        if (articleInfo.season !== undefined) {
          updateData.season = articleInfo.season;
        }
        if (articleInfo.fabricDescription !== undefined) {
          updateData.fabricDescription = articleInfo.fabricDescription;
        }
        if (articleInfo.productDescription !== undefined) {
          updateData.productDescription = articleInfo.productDescription;
        }
        if (articleInfo.designSketchUrl !== undefined) {
          updateData.designSketchUrl = articleInfo.designSketchUrl;
        }
        if (articleInfo.companyLogoUrl !== undefined) {
          updateData.companyLogoUrl = articleInfo.companyLogoUrl;
        }
        if (articleInfo.gender !== undefined) {
          updateData.gender = articleInfo.gender;
        }
        if (articleInfo.productClass !== undefined) {
          updateData.category = articleInfo.productClass;
        }
        if (articleInfo.fitType !== undefined) {
          updateData.fitType = articleInfo.fitType;
        }
        if (articleInfo.technicalDesignerId !== undefined) {
          // technicalDesignerId is now a free text field, accept any string value
          updateData.technicalDesignerId = String(articleInfo.technicalDesignerId || '');
        }
        if (articleInfo.lifecycleStage !== undefined) {
          updateData.lifecycleStage = articleInfo.lifecycleStage;
        }
        if (articleInfo.brand !== undefined) {
          updateData.brand = articleInfo.brand;
        }
        if (articleInfo.collection !== undefined || articleInfo.collectionName !== undefined) {
          updateData.collectionName = articleInfo.collection || articleInfo.collectionName;
        }
        if (articleInfo.targetMarket !== undefined) {
          updateData.targetMarket = articleInfo.targetMarket;
        }
        if (articleInfo.pricePoint !== undefined) {
          updateData.pricePoint = articleInfo.pricePoint;
        }
        if (articleInfo.notes !== undefined) {
          updateData.notes = articleInfo.notes;
        }
        // Backward compatibility
        if (articleInfo.productName !== undefined && !updateData.articleName) {
          updateData.articleName = articleInfo.productName;
        }
        if (articleInfo.version !== undefined && !updateData.sampleType) {
          updateData.sampleType = articleInfo.version;
        }
      }

      // Array fields that need special merging logic
      const arrayFields = ['bom', 'measurements', 'colorways', 'howToMeasure', 'sampleMeasurementRounds'];

      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          // Handle array fields specially - merge instead of replace
          if (arrayFields.includes(field)) {
            const oldArray = (techpack as any)[field] || [];
            const newArray = req.body[field];
            if (Array.isArray(newArray)) {
              // Normalize arrays for comparison: remove _id/id differences and compare content
              const normalizeForComparison = (arr: any[]): any[] => {
                return arr
                  .filter(item => item != null) // Remove null/undefined
                  .map(item => {
                    // Deep clone to avoid mutating original
                    const normalized = _.cloneDeep(item);
                    // Remove ID fields for comparison (we only care about content)
                    delete normalized._id;
                    delete normalized.id;
                    delete normalized.__v;
                    return normalized;
                  })
                  .sort((a, b) => {
                    // Sort by a stable key for comparison (use key identifying fields)
                    const getSortKey = (item: any): string => {
                      if (field === 'bom') {
                        const part = String(item.part || '').trim().toLowerCase();
                        const material = String(item.materialName || '').trim().toLowerCase();
                        return `${part}_${material}`;
                      }
                      if (field === 'measurements') {
                        return String(item.pomCode || '').trim().toLowerCase();
                      }
                      if (field === 'colorways') {
                        const name = String(item.name || '').trim().toLowerCase();
                        const code = String(item.code || '').trim().toLowerCase();
                        return `${name}_${code}`;
                      }
                      if (field === 'howToMeasure') {
                        const pomCode = String(item.pomCode || '').trim().toLowerCase();
                        const step = String(item.stepNumber || 0);
                        return `${pomCode}_${step}`;
                      }
                      // Fallback: use sorted keys for stable comparison
                      try {
                        const keys = Object.keys(item).sort();
                        return keys.map(k => `${k}:${JSON.stringify(item[k])}`).join('|');
                      } catch {
                        return String(item);
                      }
                    };
                    return getSortKey(a).localeCompare(getSortKey(b));
                  });
              };
              
              const oldNormalized = normalizeForComparison(oldArray);
              const newNormalized = normalizeForComparison(newArray);
              
              // Deep comparison using lodash isEqual (handles nested objects/arrays correctly)
              const arraysEqual = oldNormalized.length === newNormalized.length &&
                oldNormalized.every((oldItem, idx) => {
                  const newItem = newNormalized[idx];
                  if (!oldItem || !newItem) return false;
                  // Use lodash isEqual for deep comparison (handles nested objects, arrays, etc.)
                  return _.isEqual(oldItem, newItem);
                });
              
              // Only merge and update if arrays are actually different
              if (!arraysEqual) {
                const merged = mergeSubdocumentArray(oldArray, newArray);
                updateData[field] = merged;
              }
              // If arrays are equal, don't include in updateData to prevent false revision detection
            } else {
              updateData[field] = req.body[field];
            }
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      // Map lifecycleStage to status ONLY if status is not explicitly provided
      // This ensures that when user explicitly sets status, it won't be overridden
      const lifecycleStage = (req.body as any).lifecycleStage;
      const explicitStatus = req.body.status || updateData.status;
      if (lifecycleStage && !explicitStatus) {
        // Only auto-map lifecycleStage -> status if status was not explicitly set
        switch (lifecycleStage) {
          case 'Concept':
          case 'Design':
            updateData.status = TechPackStatus.Draft;
            break;
          case 'Development':
          case 'Pre-production':
            updateData.status = TechPackStatus.InReview;
            break;
          case 'Production':
          case 'Sales':
            updateData.status = TechPackStatus.Approved;
            break;
        }
      }

      // Special handling for measurement settings to ensure data integrity
      // If measurementSizeRange is provided, use it; otherwise, keep current value
      const finalMeasurementSizeRange = updateData.measurementSizeRange || techpack.measurementSizeRange || [];
      
      // If measurementBaseSize is provided, validate it's in the size range
      // If not provided, keep the current value
      if (updateData.measurementBaseSize) {
        const requestedBaseSize = updateData.measurementBaseSize.trim();
        const validatedBaseSize = finalMeasurementSizeRange.includes(requestedBaseSize) 
          ? requestedBaseSize 
          : finalMeasurementSizeRange[0];
        updateData.measurementBaseSize = validatedBaseSize;
      } else if (techpack.measurementBaseSize) {
        // Keep current base size if not being updated
        updateData.measurementBaseSize = techpack.measurementBaseSize;
      }

      // Handle measurementUnit - ensure it's saved if provided
      if (updateData.measurementUnit !== undefined) {
        // Validate measurementUnit value (should be 'mm', 'cm', 'inch-10', 'inch-16', or 'inch-32')
        const validUnits = ['mm', 'cm', 'inch-10', 'inch-16', 'inch-32'];
        if (validUnits.includes(updateData.measurementUnit)) {
          // Valid unit, keep it
        } else {
          // Invalid unit, use default
          updateData.measurementUnit = 'cm';
        }
      } else if ((techpack as any).measurementUnit) {
        // Keep current unit if not being updated
        updateData.measurementUnit = (techpack as any).measurementUnit;
      }

      // Keep a snapshot of the old techpack for revision comparison
      const oldTechPack = techpack.toObject({ virtuals: true }) as ITechPack;

      // Apply user's updates to the in-memory document
      Object.assign(techpack, updateData);
      
      // Mark array fields as modified to ensure Mongoose saves them correctly
      arrayFields.forEach(field => {
        if (updateData.hasOwnProperty(field)) {
          techpack.markModified(field);
        }
      });

      // Compare the old version with the updated in-memory version
      const changes = RevisionService.compareTechPacks(oldTechPack, techpack as ITechPack);
      let revisionVersion = (techpack as any).sampleType || (techpack as any).version || 'V1'; // Default to current version if no changes

      // If there are meaningful changes, increment the version
      if (changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
        const { revisionVersion: newRevisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
        revisionVersion = newRevisionVersion; // Get version for the revision log (e.g., "v1.2")
      }

      // Save the TechPack document once, with both user updates and the new version
      const updatedTechPack = await techpack.save();

      // Populate sharedWith before returning to ensure frontend has access control data
      await updatedTechPack.populate('sharedWith.userId', 'firstName lastName email');

      // Invalidate caches so subsequent fetches return the latest data (including logo updates)
      await CacheInvalidationUtil.invalidateTechPackCache(id);

      // Try to create the revision log separately
      let revisionCreated = null;
      try {
        // Use the pre-calculated 'changes' object. Only create a revision if there were changes.
        if (changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          // Build detailed formatted text for diffData (per section and combined)
          const formatted = RevisionService.formatDiffData(
            changes.diffData as any,
            oldTechPack as any,
            updatedTechPack.toObject()
          );
          // Attach formatted text into details (details is Mixed, safe to enrich)
          const enrichedDetails = {
            ...(changes.details || {}),
            formattedBySection: formatted.perSection,
            formattedText: formatted.asText
          };
          const newRevision = new Revision({
            techPackId: updatedTechPack._id,
            version: revisionVersion, // Use the auto-incremented version
            changes: {
              summary: changes.summary,
              details: enrichedDetails,
              diff: changes.diffData, // Pass the detailed diff data
            },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: req.body.changeDescription || formatted.asText || changes.summary,
            changeType: 'auto' as const,
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: updatedTechPack.toObject()
          });

          revisionCreated = await newRevision.save();
        }
      } catch (revError: any) {
        // Log revision creation error but don't fail the entire operation
        console.error('Failed to create revision log (TechPack save still successful):', {
          error: revError.message,
          stack: revError.stack,
          techPackId: updatedTechPack._id,
          userId: user._id
        });
      }

      // Build response payload per spec
      const responsePayload: any = {
        updatedTechPack: updatedTechPack,
      };
      if (revisionCreated) {
        responsePayload.newRevision = {
          _id: revisionCreated._id,
          version: revisionCreated.version,
          changedBy: revisionCreated.createdByName,
          changedDate: revisionCreated.createdAt,
          changeSummary: revisionCreated.changes.summary,
          formattedText: (revisionCreated.changes as any)?.details?.formattedText,
          formattedBySection: (revisionCreated.changes as any)?.details?.formattedBySection
        };
      }

      // Send success response matching the desired API behavior
      return sendSuccess(res, responsePayload, 'Tech Pack updated successfully');
    } catch (error: any) {
      console.error('Patch TechPack error:', error);

      // Handle validation errors specifically
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return sendError(res, `Validation failed: ${validationErrors.join(', ')}`, 400, 'VALIDATION_ERROR');
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        return sendError(res, 'Article code already exists', 400, 'DUPLICATE_KEY');
      }

      sendError(res, 'Failed to update tech pack', 500, 'INTERNAL_ERROR');
    }
  }

  async deleteTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Check if user has permission to delete tech packs
      if (!PermissionManager.canDeleteTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to delete tech packs', 403, 'FORBIDDEN');
      }

      // Handle both ObjectId and string ID formats
      let techpack;

      try {
        // First try as ObjectId
        techpack = await TechPack.findById(id);
      } catch (error) {
        // If that fails, try with relaxed validation
        try {
          // Use findOne with mixed type to handle string IDs
          techpack = await TechPack.findOne({ _id: id } as any);
        } catch (secondError) {
          // Both attempts failed
          techpack = null;
        }
      }
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Deletion is restricted to the creator or an Admin
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      if (user.role !== UserRole.Admin && !isOwner) {
        return sendError(res, 'Access denied. Only the creator or an admin can archive this tech pack.', 403, 'FORBIDDEN');
      }

      techpack.status = TechPackStatus.Archived;
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;
      await techpack.save();

      // Invalidate cache sau khi update
      await Promise.all([
        cacheService.del(CacheKeys.techpack(id)),
        cacheService.delPattern(CacheKeys.techpackPattern(id)),
        cacheService.delPattern('techpack:list:*') // Invalidate all list caches
      ]);

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_DELETE, target: { type: 'TechPack', id: techpack._id as Types.ObjectId, name: (techpack as any).articleName || (techpack as any).productName || 'Unknown' }, req });
      sendSuccess(res, {}, 'TechPack archived successfully');
    } catch (error: any) {
      console.error('Delete TechPack error:', error);
      sendError(res, 'Failed to archive tech pack');
    }
  }

  async duplicateTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { keepVersion = false } = req.body;
      const user = req.user!;

      const originalTechPack = await TechPack.findById(id).lean();
      if (!originalTechPack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = originalTechPack.createdBy?.toString() === user._id.toString();
  // Duplicating a techpack is an operation akin to edit/create. Only Admin, Owner or explicitly shared editors/admins should be allowed.
  const sharerAccess = originalTechPack.sharedWith?.find((s: any) => s.userId.toString() === user._id.toString());
  const hasEditPermission = !!sharerAccess && ['owner','admin','editor'].includes(sharerAccess.role);
  const hasPermission = user.role === UserRole.Admin || isOwner || hasEditPermission;

      if (!hasPermission) {
        return sendError(res, 'Access denied. You do not have permission to duplicate this tech pack.', 403, 'FORBIDDEN');
      }

      const { _id, createdAt, updatedAt, sharedWith, auditLogs, ...techPackData } = originalTechPack;
      const originalArticleName = (originalTechPack as any).articleName || (originalTechPack as any).productName || 'Unknown';
      const originalSampleType = (originalTechPack as any).sampleType || (originalTechPack as any).version || '';
      const duplicatedTechPack = await TechPack.create({
        ...techPackData,
        articleCode: `${originalTechPack.articleCode}-COPY`,
        articleName: `${originalArticleName} (Copy)`,
        sampleType: keepVersion ? originalSampleType : '',
        status: TechPackStatus.Draft,
        createdBy: user._id,
        updatedBy: user._id,
        sharedWith: [],
        auditLogs: []
      });

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_CREATE, target: { type: 'TechPack', id: duplicatedTechPack._id as Types.ObjectId, name: (duplicatedTechPack as any).articleName || (duplicatedTechPack as any).productName || 'Unknown' }, req });
      sendSuccess(res, duplicatedTechPack, 'TechPack duplicated successfully', 201);
    } catch (error: any) {
      console.error('Duplicate TechPack error:', error);
      sendError(res, 'Failed to duplicate tech pack');
    }
  }

  async bulkOperations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ids, action, payload } = req.body;
      const user = req.user!;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return sendError(res, 'IDs array is required', 400, 'VALIDATION_ERROR');
      }

      if (!action) {
        return sendError(res, 'Action is required', 400, 'VALIDATION_ERROR');
      }

      const query: any = { _id: { $in: ids } };
      // technicalDesignerId is no longer used for access control
      // Designers can only bulk operate on techpacks they created or are shared with
      if (user.role === UserRole.Designer) {
        query.$or = [
          { createdBy: user._id },
          { 'sharedWith.userId': user._id }
        ];
      }

      let modifiedCount = 0;
      let message = '';

      switch (action) {
        case 'delete':
          const deleteResult = await TechPack.updateMany(query, {
            status: TechPackStatus.Archived,
            updatedBy: user._id,
            updatedByName: `${user.firstName} ${user.lastName}`
          });
          modifiedCount = deleteResult.modifiedCount;
          message = `${modifiedCount} tech packs archived successfully`;
          break;

        case 'setStatus':
          if (!payload?.status) {
            return sendError(res, 'Status is required for setStatus action', 400, 'VALIDATION_ERROR');
          }
          const statusResult = await TechPack.updateMany(query, {
            status: payload.status,
            updatedBy: user._id,
            updatedByName: `${user.firstName} ${user.lastName}`
          });
          modifiedCount = statusResult.modifiedCount;
          message = `${modifiedCount} tech packs status updated successfully`;
          break;

        default:
          return sendError(res, 'Invalid action', 400, 'INVALID_ACTION');
      }

      sendSuccess(res, { modifiedCount }, message);
    } catch (error: any) {
      console.error('Bulk operations error:', error);
      sendError(res, 'Failed to perform bulk operations');
    }
  }

  async shareTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;
      const sharer = req.user!;

      // Validate input
      if (!userId || !role || !Object.values(TechPackRole).includes(role)) {
        return sendError(res, 'Valid userId and role are required', 400, 'VALIDATION_ERROR');
      }

      // Prevent sharing Owner role
      if (role === TechPackRole.Owner) {
        return sendError(res, 'Cannot share Owner role. Use transfer ownership instead.', 400, 'VALIDATION_ERROR');
      }

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check if sharer has permission to share
      const isOwner = techpack.createdBy?.toString() === sharer._id.toString();
      const sharerAccess = techpack.sharedWith?.find(s => s.userId.toString() === sharer._id.toString());
      const canShare = sharer.role === UserRole.Admin || isOwner ||
                      (sharerAccess && ['admin'].includes(sharerAccess.role));

      if (!canShare) {
        return sendError(res, 'Access denied. Only Owner or Admin can share this tech pack.', 403, 'FORBIDDEN');
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return sendError(res, 'Target user not found', 404, 'NOT_FOUND');
      }

      // Prevent sharing with self
      if (targetUser._id.toString() === sharer._id.toString()) {
        return sendError(res, 'Cannot share with yourself.', 400, 'BAD_REQUEST');
      }

      // Validation: Cannot share with a techpack role higher than target user's global role
      const globalRoleToTechPackRoleLevel: { [key: string]: number } = {
        'admin': 4,      // Admin global role -> Admin techpack role
        'designer': 3,   // Designer global role -> Editor techpack role
        'merchandiser': 2, // Merchandiser global role -> Viewer techpack role
        'viewer': 2,     // Viewer global role -> Viewer techpack role
      };
      const techPackRoleLevels: { [key in TechPackRole]: number } = {
        [TechPackRole.Owner]: 5,
        [TechPackRole.Admin]: 4,
        [TechPackRole.Editor]: 3,
        [TechPackRole.Viewer]: 2,
        [TechPackRole.Factory]: 1,
      };
      
      const targetUserGlobalRole = targetUser.role?.toLowerCase() || '';
      const maxAllowedTechPackRoleLevel = globalRoleToTechPackRoleLevel[targetUserGlobalRole] || 0;
      const selectedRoleLevel = techPackRoleLevels[role as TechPackRole] || 0;
      
      if (maxAllowedTechPackRoleLevel > 0 && selectedRoleLevel > maxAllowedTechPackRoleLevel) {
        return sendError(res, `Cannot share with role "${role}" because user ${targetUser.email} has global role "${targetUser.role}" which is lower. You can only share with roles equal to or lower than the user's global role.`, 403, 'FORBIDDEN');
      }

      // Get sharer's current techpack role
      let sharerTechPackRole: TechPackRole | undefined;
      if (isOwner) {
        sharerTechPackRole = TechPackRole.Owner;
      } else if (sharer.role === UserRole.Admin) {
        sharerTechPackRole = TechPackRole.Admin;
      } else if (sharerAccess && Object.values(TechPackRole).includes(sharerAccess.role as TechPackRole)) {
        sharerTechPackRole = sharerAccess.role as TechPackRole;
      }

      // Validation: User cannot share with a role higher than their current techpack role
      if (sharerTechPackRole) {
        const roleLevels: { [key in TechPackRole]: number } = {
          [TechPackRole.Owner]: 5,
          [TechPackRole.Admin]: 4,
          [TechPackRole.Editor]: 3,
          [TechPackRole.Viewer]: 2,
          [TechPackRole.Factory]: 1,
        };
        const sharerLevel = roleLevels[sharerTechPackRole as TechPackRole] || 0;
        const targetLevel = roleLevels[role as TechPackRole] || 0;
        
        if (targetLevel > sharerLevel) {
          return sendError(res, `Cannot share with a role higher than your current access level (${sharerTechPackRole}).`, 403, 'FORBIDDEN');
      }
      }

      // Prevent sharing with system admin removed; technicalDesignerId is now free text and not linked to users

      // Normalize userId for comparison (handle both ObjectId and string)
      const normalizedUserIdForCompare = userId.toString().trim();
      const existingShareIndex = techpack.sharedWith?.findIndex(s => {
        const shareUserId = s.userId?.toString() || '';
        return shareUserId.trim() === normalizedUserIdForCompare;
      }) || -1;
      let action: 'share_granted' | 'role_changed' = 'share_granted';

      if (existingShareIndex > -1) {
        action = 'role_changed';
        techpack.sharedWith![existingShareIndex].role = role;
        // Update backward compatibility field
        techpack.sharedWith![existingShareIndex].permission = role === TechPackRole.Viewer || role === TechPackRole.Factory ? 'view' : 'edit';
      } else {
        if (!techpack.sharedWith) {
          techpack.sharedWith = [];
        }
        // Ensure userId is converted to ObjectId for consistent storage
        const normalizedUserId = Types.ObjectId.isValid(userId) 
          ? new Types.ObjectId(userId) 
          : userId;
        techpack.sharedWith.push({
          userId: normalizedUserId,
          role,
          sharedAt: new Date(),
          sharedBy: sharer._id,
          // Backward compatibility
          permission: role === TechPackRole.Viewer || role === TechPackRole.Factory ? 'view' : 'edit'
        });
      }

      if (!techpack.auditLogs) {
        techpack.auditLogs = [];
      }
      techpack.auditLogs.push({
        action,
        performedBy: sharer._id,
        targetUser: userId,
        role,
        timestamp: new Date(),
        techpackId: techpack._id as Types.ObjectId,
        // Backward compatibility
        permission: role === TechPackRole.Viewer || role === TechPackRole.Factory ? 'view' : 'edit'
      });

      await techpack.save();

      // Invalidate cache for this techpack and techpack list to ensure the shared user sees it
      await CacheInvalidationUtil.invalidateTechPackCache(id);
      // Also invalidate cache for the shared user's techpack list
      await CacheInvalidationUtil.invalidateUserCache(userId);

      // Log activity
      await logActivity({
        userId: sharer._id,
        userName: `${sharer.firstName} ${sharer.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: (techpack as any).articleName || (techpack as any).productName || 'Unknown'
        },
        req,
        details: `Shared with ${targetUser.firstName} ${targetUser.lastName} as ${role}`
      });

      sendSuccess(res, techpack.sharedWith, `TechPack shared successfully with ${targetUser.firstName} ${targetUser.lastName}`);
    } catch (error: any) {
      console.error('Share TechPack error:', error);
      sendError(res, 'Failed to share tech pack');
    }
  }

  async revokeShare(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const revoker = req.user!;

      // Populate sharedWith.userId to ensure proper comparison
      const techpack = await TechPack.findById(id)
        .populate('sharedWith.userId', 'firstName lastName email');
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check if revoker has permission to revoke access
      // Handle both ObjectId and populated object for createdBy
      const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
      const revokerId = revoker._id?.toString();
      const isOwner = createdById === revokerId;
      
      // Handle both ObjectId and populated object for sharedWith
      const revokerAccess = techpack.sharedWith?.find(s => {
        const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
        return shareUserId === revokerId;
      });
      const canRevoke = revoker.role === UserRole.Admin || isOwner ||
                       (revokerAccess && ['admin'].includes(revokerAccess.role));

      if (!canRevoke) {
        return sendError(res, 'Access denied. Only Owner or Admin can revoke access.', 403, 'FORBIDDEN');
      }

      // Find share entry - handle both ObjectId and populated object
      // Normalize userId from params to string for comparison
      // Validate ObjectId ngay từ đầu
      if (!Types.ObjectId.isValid(userId)) {
        return sendError(res, 'Invalid user ID', 400, 'VALIDATION_ERROR');
      }

      // Chuẩn hóa thành ObjectId string
      const normalizedUserId = new Types.ObjectId(userId).toString();

      const shareIndex = techpack.sharedWith?.findIndex(s => {
        if (!s.userId) return false;
        
        let shareUserId: string;
        const userIdValue = s.userId as any;
        
        if (typeof userIdValue === 'object' && userIdValue._id) {
          shareUserId = userIdValue._id.toString();
        } else if (userIdValue instanceof Types.ObjectId) {
          shareUserId = userIdValue.toString();
        } else {
          shareUserId = userIdValue.toString();
        }
        
        return shareUserId === normalizedUserId;
      }) ?? -1;
      if (shareIndex === -1) {
        return sendError(res, 'User does not have access to this TechPack.', 404, 'NOT_FOUND');
      }

      const removedShare = techpack.sharedWith!.splice(shareIndex, 1)[0];
      const targetUser = await User.findById(userId);

      if (!techpack.auditLogs) {
        techpack.auditLogs = [];
      }
      techpack.auditLogs.push({
        action: 'share_revoked',
        performedBy: revoker._id,
        targetUser: removedShare.userId,
        role: removedShare.role,
        timestamp: new Date(),
        techpackId: techpack._id as Types.ObjectId,
        // Backward compatibility
        permission: removedShare.permission || 'view'
      });

      await techpack.save();

      // Invalidate cache for this techpack and techpack list to ensure the revoked user no longer sees it
      await CacheInvalidationUtil.invalidateTechPackCache(id);
      // Also invalidate cache for the revoked user's techpack list
      await CacheInvalidationUtil.invalidateUserCache(userId);

      // Log activity
      await logActivity({
        userId: revoker._id,
        userName: `${revoker.firstName} ${revoker.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: (techpack as any).articleName || (techpack as any).productName || 'Unknown'
        },
        req,
        details: `Revoked access from ${targetUser?.firstName || 'Unknown'} ${targetUser?.lastName || 'User'}`
      });

      sendSuccess(res, {}, `Access revoked successfully from ${targetUser?.firstName || 'Unknown'} ${targetUser?.lastName || 'User'}`);
    } catch (error: any) {
      console.error('Revoke share error:', error);
      sendError(res, 'Failed to revoke access');
    }
  }

  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id).populate('auditLogs.performedBy auditLogs.targetUser', 'firstName lastName email').lean();
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      if (user.role !== UserRole.Admin && !isOwner) {
        return sendError(res, 'Access denied. Only the creator or an admin can view audit logs.', 403, 'FORBIDDEN');
      }

      sendSuccess(res, techpack.auditLogs);
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      sendError(res, 'Failed to retrieve audit logs');
    }
  }

  async getShareableUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Global Admin always has access
      // Check if user has permission to view shareable users
      // Only Owner, Admin, or Editor can view (Viewer and Factory are not allowed)
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const userAccess = techpack.sharedWith?.find(
        (s) => s?.userId && s.userId.toString() === user._id.toString()
      );
      
      // Use getEffectiveRole to check permissions
      const { getEffectiveRole } = await import('../utils/access-control.util');
      let effectiveRole: string | undefined;
      if (isOwner) {
        effectiveRole = 'owner';
      } else if (user.role === UserRole.Admin) {
        effectiveRole = 'admin';
      } else if (userAccess) {
        effectiveRole = getEffectiveRole(user.role, userAccess.role);
      }
      
      // Only owner, admin, or editor can view shareable users
      const canView = effectiveRole && ['owner', 'admin', 'editor'].includes(effectiveRole);

      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can view shareable users. Viewer and Factory are not allowed.', 403, 'FORBIDDEN');
      }

      // Get all users except:
      // - System admins
      // - The technical designer
      // - Users already shared with
      // - The current user
      // Build excluded list and keep only valid ObjectIds to avoid BSON errors
      const excludedUserIdsRaw = [
        user._id?.toString(),
        // technicalDesignerId is a free text string, ignore for shareable-users filtering
        ...(techpack.sharedWith?.map((s) => (s?.userId ? s.userId.toString() : null)) || [])
      ].filter(Boolean) as string[];

      const excludedUserIds = excludedUserIdsRaw
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      // ✅ Optimized: Parse query params and build single query
      const includeAdmins = String((req.query || {}).includeAdmins || 'false') === 'true';
      const includeAll = String((req.query || {}).includeAll || 'false') === 'true';

      // ✅ Optimized: Build single query instead of multiple queries
      const baseFilters: any = {
        isActive: true
      };
      // Exclude current user and already-shared users (only if valid ObjectId)
      if (excludedUserIds.length > 0) {
        baseFilters._id = { $nin: excludedUserIds };
      } else {
        // At minimum, exclude current user (always a valid ObjectId)
        baseFilters._id = { $ne: user._id };
      }

      // includeAll=true returns everyone except current/excluded
      if (!includeAll && !includeAdmins) {
        // By default, exclude admins unless explicitly included
        baseFilters.role = { $ne: UserRole.Admin };
      }

      // ✅ Single query instead of multiple queries + fallback
      const shareableUsers = await User.find(baseFilters)
        .select('firstName lastName email role')
        .limit(100)
        .lean();

      sendSuccess(res, shareableUsers, 'Shareable users retrieved successfully');
    } catch (error: any) {
      console.error('Get shareable users error:', error);
      sendError(res, 'Failed to get shareable users');
    }
  }

  async getAccessList(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Global Admin always has access
      // Check if user has permission to view access list
      // Only Owner, Admin, or Editor can view (Viewer and Factory are not allowed)
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const userAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      
      // Use getEffectiveRole to check permissions
      const { getEffectiveRole } = await import('../utils/access-control.util');
      let effectiveRole: string | undefined;
      if (isOwner) {
        effectiveRole = 'owner';
      } else if (user.role === UserRole.Admin) {
        effectiveRole = 'admin';
      } else if (userAccess) {
        effectiveRole = getEffectiveRole(user.role, userAccess.role);
      }
      
      // Only owner, admin, or editor can view access list
      const canView = effectiveRole && ['owner', 'admin', 'editor'].includes(effectiveRole);

      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can view access list. Viewer and Factory are not allowed.', 403, 'FORBIDDEN');
      }

      // Get shared users information - optimize with single query instead of N+1
      const sharedUserIds = (techpack.sharedWith || []).map(s => s.userId);
      const sharedByUserIds = (techpack.sharedWith || [])
        .map(s => s.sharedBy)
        .filter((id): id is Types.ObjectId => !!id);
      
      // Filter out invalid ObjectIds to prevent BSON errors
      const allUserIds = [...new Set([...sharedUserIds, ...sharedByUserIds])]
        .filter(id => {
          if (!id) return false;
          // Check if it's a valid ObjectId
          if (id instanceof Types.ObjectId) {
            return Types.ObjectId.isValid(id);
          }
          // If it's a string, validate it
          if (typeof id === 'string') {
            return Types.ObjectId.isValid(id);
          }
          return false;
        })
        .map(id => {
          // Ensure all IDs are ObjectId instances
          if (id instanceof Types.ObjectId) {
            return id;
          }
          return new Types.ObjectId(id);
        });
      
      const usersMap = new Map();
      if (allUserIds.length > 0) {
        const users = await User.find({ _id: { $in: allUserIds } })
          .select('firstName lastName email role')
          .lean();
        users.forEach(u => usersMap.set(u._id.toString(), u));
      }

      const accessList = (techpack.sharedWith || []).map((share) => {
        const sharedUser = usersMap.get(share.userId?.toString());
        const sharedByUser = share.sharedBy ? usersMap.get(share.sharedBy.toString()) : null;

        // Fallbacks when user records were deleted or missing
        const sharedUserFallback = sharedUser || { firstName: 'Unknown', lastName: '', email: '', role: 'viewer' };
        const sharedByFallback = sharedByUser || null;

        return {
          userId: share.userId.toString(),
          role: share.role,
          permission: share.permission || 'view', // Backward compatibility
          sharedAt: share.sharedAt,
          sharedBy: sharedByFallback,
          user: sharedUserFallback
        };
      });

      sendSuccess(res, accessList, 'Access list retrieved successfully');
    } catch (error: any) {
      console.error('Get access list error:', error);
      sendError(res, 'Failed to get access list');
    }
  }

  async updateShareRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      const updater = req.user!;

      // Validate input
      if (!role || !Object.values(TechPackRole).includes(role)) {
        return sendError(res, 'Valid role is required', 400, 'VALIDATION_ERROR');
      }

      // Prevent updating to Owner role
      if (role === TechPackRole.Owner) {
        return sendError(res, 'Cannot update to Owner role. Use transfer ownership instead.', 400, 'VALIDATION_ERROR');
      }

      // Populate sharedWith.userId to ensure proper comparison
      const techpack = await TechPack.findById(id)
        .populate('sharedWith.userId', 'firstName lastName email');
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check if updater has permission to update roles
      // Handle both ObjectId and populated object for createdBy
      const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
      const updaterId = updater._id?.toString();
      const isOwner = createdById === updaterId;
      
      // Handle both ObjectId and populated object for sharedWith
      const updaterAccess = techpack.sharedWith?.find(s => {
        const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
        return shareUserId === updaterId;
      });
      const canUpdate = updater.role === UserRole.Admin || isOwner ||
                       (updaterAccess && ['admin'].includes(updaterAccess.role));

      if (!canUpdate) {
        return sendError(res, 'Access denied. Only Owner or Admin can update roles.', 403, 'FORBIDDEN');
      }

      // Find share entry - handle both ObjectId and populated object
      // Normalize userId from params to string for comparison
      // Validate ObjectId ngay từ đầu
    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400, 'VALIDATION_ERROR');
    }

    // Chuẩn hóa thành ObjectId string
    const normalizedUserId = new Types.ObjectId(userId).toString();

    const shareIndex = techpack.sharedWith?.findIndex(s => {
      if (!s.userId) return false;
      
      let shareUserId: string;
      const userIdValue = s.userId as any;
      
      if (typeof userIdValue === 'object' && userIdValue._id) {
        shareUserId = userIdValue._id.toString();
      } else if (userIdValue instanceof Types.ObjectId) {
        shareUserId = userIdValue.toString();
      } else {
        shareUserId = userIdValue.toString();
      }
      
      return shareUserId === normalizedUserId;
    }) ?? -1;
      if (shareIndex === -1) {
        return sendError(res, 'User does not have access to this TechPack.', 404, 'NOT_FOUND');
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return sendError(res, 'Target user not found', 404, 'NOT_FOUND');
      }

      // Validation: Cannot update to a techpack role higher than target user's global role
      const globalRoleToTechPackRoleLevel: { [key: string]: number } = {
        'admin': 4,      // Admin global role -> Admin techpack role
        'designer': 3,   // Designer global role -> Editor techpack role
        'merchandiser': 2, // Merchandiser global role -> Viewer techpack role
        'viewer': 2,     // Viewer global role -> Viewer techpack role
      };
      const techPackRoleLevels: { [key in TechPackRole]: number } = {
        [TechPackRole.Owner]: 5,
        [TechPackRole.Admin]: 4,
        [TechPackRole.Editor]: 3,
        [TechPackRole.Viewer]: 2,
        [TechPackRole.Factory]: 1,
      };
      
      const targetUserGlobalRole = targetUser.role?.toLowerCase() || '';
      const maxAllowedTechPackRoleLevel = globalRoleToTechPackRoleLevel[targetUserGlobalRole] || 0;
      const selectedRoleLevel = techPackRoleLevels[role as TechPackRole] || 0;
      
      if (maxAllowedTechPackRoleLevel > 0 && selectedRoleLevel > maxAllowedTechPackRoleLevel) {
        return sendError(res, `Cannot update to role "${role}" because user ${targetUser.email} has global role "${targetUser.role}" which is lower. You can only assign roles equal to or lower than the user's global role.`, 403, 'FORBIDDEN');
      }

      // Get updater's current techpack role
      let updaterTechPackRole: TechPackRole | undefined;
      if (isOwner) {
        updaterTechPackRole = TechPackRole.Owner;
      } else if (updater.role === UserRole.Admin) {
        updaterTechPackRole = TechPackRole.Admin;
      } else if (updaterAccess && Object.values(TechPackRole).includes(updaterAccess.role as TechPackRole)) {
        updaterTechPackRole = updaterAccess.role as TechPackRole;
      }

      // Validation: User cannot update to a role higher than their current techpack role
      if (updaterTechPackRole) {
        const roleLevels: { [key in TechPackRole]: number } = {
          [TechPackRole.Owner]: 5,
          [TechPackRole.Admin]: 4,
          [TechPackRole.Editor]: 3,
          [TechPackRole.Viewer]: 2,
          [TechPackRole.Factory]: 1,
        };
        const updaterLevel = roleLevels[updaterTechPackRole as TechPackRole] || 0;
        const targetLevel = roleLevels[role as TechPackRole] || 0;
        
        if (targetLevel > updaterLevel) {
          return sendError(res, `Cannot update to a role higher than your current access level (${updaterTechPackRole}).`, 403, 'FORBIDDEN');
        }
      }

      // Update the role
      const oldRole = techpack.sharedWith![shareIndex].role;
      techpack.sharedWith![shareIndex].role = role;
      // Update backward compatibility field
      techpack.sharedWith![shareIndex].permission = role === TechPackRole.Viewer || role === TechPackRole.Factory ? 'view' : 'edit';

      // Add audit log
      if (!techpack.auditLogs) {
        techpack.auditLogs = [];
      }
      techpack.auditLogs.push({
        action: 'role_changed',
        performedBy: updater._id,
        targetUser: new Types.ObjectId(userId),
        role,
        timestamp: new Date(),
        techpackId: techpack._id as Types.ObjectId,
        // Backward compatibility
        permission: role === TechPackRole.Viewer || role === TechPackRole.Factory ? 'view' : 'edit'
      });

      await techpack.save();

      // Invalidate cache for this techpack and techpack list to ensure changes are reflected
      await CacheInvalidationUtil.invalidateTechPackCache(id);
      // Also invalidate cache for the updated user's techpack list
      await CacheInvalidationUtil.invalidateUserCache(userId);

      // Log activity
      await logActivity({
        userId: updater._id,
        userName: `${updater.firstName} ${updater.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: (techpack as any).articleName || (techpack as any).productName || 'Unknown'
        },
        req,
        details: `Updated ${targetUser.firstName} ${targetUser.lastName} role from ${oldRole} to ${role}`
      });

      sendSuccess(res, techpack.sharedWith, `Role updated successfully for ${targetUser.firstName} ${targetUser.lastName}`);
    } catch (error: any) {
      console.error('Update share role error:', error);
      sendError(res, 'Failed to update role');
    }
  }

  /**
   * Export TechPack as PDF
   * GET /api/techpacks/:id/pdf
   */
  async exportPDF(req: AuthRequest, res: Response): Promise<void> {
    // Set a longer timeout for PDF generation (5 minutes)
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    
    try {
      const { id } = req.params;
      const { orientation, format } = req.query;
      const user = req.user!;

      // Get techpack (technicalDesignerId is now a string field, no need to populate)
      const techpack = await TechPack.findById(id)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .lean();

      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check access
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isSharedWith = techpack.sharedWith?.some(s => s.userId.toString() === user._id.toString()) || false;

      if (user.role !== UserRole.Admin && !isOwner && !isSharedWith) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      // Import PDF service
      const pdfService = (await import('../services/pdf.service')).default;

      // Prepare PDF options - Default to landscape for better table display
      // Reduced image quality and size limits for smaller PDF files
      const pdfOptions = {
        format: (format as 'A4' | 'Letter' | 'Legal') || 'A4',
        orientation: (orientation as 'portrait' | 'landscape') || 'landscape',
        displayHeaderFooter: true,
        includeImages: true,
        imageQuality: 65, // Reduced from 90 to 65 for better compression (target: <10MB)
        imageMaxWidth: 1200, // Max width in pixels
        imageMaxHeight: 800, // Max height in pixels
        margin: {
          top: '10mm',
          bottom: '15mm', // Tăng lên 15mm để đảm bảo footer có đủ không gian hiển thị số trang
          left: '10mm',
          right: '10mm',
        },
      };

      // Generate PDF (techpack is already a lean object from .lean() call)
      // Type assertion needed because .lean() returns FlattenMaps type which doesn't match ITechPack exactly
      const result = await pdfService.generatePDF(techpack as any, pdfOptions);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size.toString());

      // Send PDF buffer
      res.send(result.buffer);
    } catch (error: any) {
      console.error('Export PDF error:', error);
      sendError(res, `Failed to export PDF: ${error.message}`, 500, 'PDF_GENERATION_ERROR');
    }
  }


}

export default new TechPackController();