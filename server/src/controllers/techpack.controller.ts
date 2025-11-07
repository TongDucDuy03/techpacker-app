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
  }


  async getTechPacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = config.defaultPageSize, q = '', status, season, brand, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
      const user = req.user!;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.maxPageSize, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Tạo cache key dựa trên query parameters và user ID
      const queryString = JSON.stringify({
        userId: user._id,
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

      // Thử lấy từ cache trước
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        return sendSuccess(res, cachedResult, 'TechPacks retrieved from cache');
      }

      let query: any = {};

      // Base query for access control - Updated logic per requirements
      if (user.role === UserRole.Admin) {
        // Admins can see all TechPacks they own or are shared with
        query.$or = [
          { createdBy: user._id },
          { 'sharedWith.userId': user._id }
        ];
      } else if (user.role === UserRole.Designer) {
        // Designers can see TechPacks they created, are technical designer for, or are shared with
        query.$or = [
          { createdBy: user._id },
          { technicalDesignerId: user._id },
          { 'sharedWith.userId': user._id }
        ];
      } else if (user.role === UserRole.Viewer) {
        // Viewers can ONLY see TechPacks that are explicitly shared with them
        query = { 'sharedWith.userId': user._id };
      } else if (user.role === UserRole.Merchandiser) {
        // Merchandisers can see TechPacks they created or are shared with
        query.$or = [
          { createdBy: user._id },
          { 'sharedWith.userId': user._id }
        ];
      } else {
        // For any other roles, restrict to only shared TechPacks
        query = { 'sharedWith.userId': user._id };
      }

      // Additional search and filter criteria
      const filterQuery: any = {};
      if (q) {
        const searchRegex = { $regex: q, $options: 'i' };
        filterQuery.$or = [{ productName: searchRegex }, { articleCode: searchRegex }, { supplier: searchRegex }];
      }

      if (status) {
        filterQuery.status = status;
      } else {
        filterQuery.status = { $ne: 'Archived' };
      }

      if (season) filterQuery.season = season;
      if (brand) filterQuery.brand = brand;

      // Combine access control query with filter query
      query = { ...query, ...filterQuery };

      const sortOptions: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [techpacks, total] = await Promise.all([
        TechPack.find(query)
          .populate('technicalDesignerId', 'firstName lastName')
          .populate('createdBy', 'firstName lastName')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          // Trả về tất cả các trường liên quan đến các tab
          .select('articleCode productName brand season status category createdAt updatedAt technicalDesignerId createdBy sharedWith supplier lifecycleStage gender currency version auditLogs fabricDescription productDescription designSketchUrl bom measurements colorways howToMeasure revisionHistory sharing')
          .lean(),
        TechPack.countDocuments(query)
      ]);

      const pagination = { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) };
      const result = { data: techpacks, pagination };

      // Lưu kết quả vào cache với TTL ngắn (5 phút)
      await cacheService.set(cacheKey, result, CacheTTL.SHORT);

      sendSuccess(res, techpacks, 'Tech packs retrieved successfully', 200, pagination);
    } catch (error: any) {
      console.error('Get TechPacks error:', error);
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
      const existing = await TechPack.findOne({ articleCode: normalizedCode }).select('_id articleCode productName').lean();

      if (existing) {
        return sendSuccess(res, { 
          exists: true, 
          articleCode: existing.articleCode,
          productName: existing.productName 
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
        // Kiểm tra quyền truy cập từ cached data
        const isOwner = cachedTechpack.createdBy?._id?.toString() === requestUser._id.toString();
        const isTechnicalDesigner = cachedTechpack.technicalDesignerId?._id?.toString() === requestUser._id.toString();
        const sharedAccess = cachedTechpack.sharedWith?.find((s: any) => s.userId._id?.toString() === requestUser._id.toString());
        const hasAccess = requestUser.role === UserRole.Admin || isOwner || isTechnicalDesigner || sharedAccess;

        if (hasAccess) {
          return sendSuccess(res, cachedTechpack, 'TechPack retrieved from cache');
        }
      }

      // Handle both ObjectId and string ID formats
      let techpack;
      try {
        techpack = await TechPack.findById(id)
          .populate('technicalDesignerId createdBy updatedBy sharedWith.userId', 'firstName lastName email')
          .lean();
      } catch (error) {
        techpack = null;
      }

      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const currentUser = req.user!;
      const isOwner = techpack.createdBy?.toString() === currentUser._id.toString();
      const isSharedWith = techpack.sharedWith?.some(s => s.userId.toString() === currentUser._id.toString()) || false;

      if (currentUser.role !== UserRole.Admin && !isOwner && !isSharedWith) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      // Lưu vào cache với TTL trung bình (30 phút)
      await cacheService.set(cacheKey, techpack, CacheTTL.MEDIUM);

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
        if (!sourceId || !newProductName || !newArticleCode) {
          return sendError(res, 'Source ID, new product name, and new article code are required for cloning.', 400, 'VALIDATION_ERROR');
        }

        const sourceTechPack = await TechPack.findById(sourceId).lean();
        if (!sourceTechPack) {
          return sendError(res, 'Source TechPack not found.', 404, 'NOT_FOUND');
        }

        // Build the new tech pack data from the source
        const newTechPackData: Partial<ITechPack> = {};

        // Copy sections based on the checkbox selection
        if (copySections.includes('ArticleInfo')) {
          Object.assign(newTechPackData, {
            supplier: sourceTechPack.supplier,
            season: sourceTechPack.season,
            fabricDescription: sourceTechPack.fabricDescription,
            productDescription: sourceTechPack.productDescription,
            designSketchUrl: sourceTechPack.designSketchUrl,
            category: sourceTechPack.category,
            gender: sourceTechPack.gender,
            brand: sourceTechPack.brand,
            collectionName: sourceTechPack.collectionName,
            targetMarket: sourceTechPack.targetMarket,
            pricePoint: sourceTechPack.pricePoint,
            retailPrice: sourceTechPack.retailPrice,
            currency: sourceTechPack.currency,
            description: sourceTechPack.description,
            notes: sourceTechPack.notes,
            technicalDesignerId: sourceTechPack.technicalDesignerId,
          });
        }
        if (copySections.includes('BOM')) newTechPackData.bom = sourceTechPack.bom;
        if (copySections.includes('Measurements')) newTechPackData.measurements = sourceTechPack.measurements;
        if (copySections.includes('Colorways')) newTechPackData.colorways = sourceTechPack.colorways;
        if (copySections.includes('HowToMeasure')) newTechPackData.howToMeasure = sourceTechPack.howToMeasure;

        // Override with new details and reset metadata
        Object.assign(newTechPackData, {
          productName: newProductName,
          articleCode: newArticleCode.toUpperCase(),
          status: TechPackStatus.Draft,
          version: 'v1.0',
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
            summary: `Cloned from ${sourceTechPack.productName} (v${sourceTechPack.version})`,
            details: { clone: { cloned: 1 }, sourceId: sourceTechPack._id.toString() },
          },
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          description: `Initial version created by cloning from ${sourceTechPack.articleCode}`,
          statusAtChange: newTechPack.status,
          snapshot: newTechPack.toObject(),
        });
        await initialRevision.save();

        sendSuccess(res, newTechPack, 'TechPack cloned successfully', 201);

      } else {
        // --- CREATE FROM SCRATCH LOGIC (existing logic) ---
        const { articleInfo, bom, measurements, colorways, howToMeasures } = restOfBody;

        const productName = articleInfo?.productName || req.body.productName;
        const articleCode = articleInfo?.articleCode || req.body.articleCode;
        if (!productName || !articleCode) {
          return sendError(res, 'Product Name and Article Code are required.', 400, 'VALIDATION_ERROR');
        }

        const techpackData = {
          productName,
          articleCode: articleCode.toUpperCase(),
          version: 'v1.0',
          supplier: articleInfo?.supplier || req.body.supplier,
          season: articleInfo?.season || req.body.season,
          fabricDescription: articleInfo?.fabricDescription || req.body.fabricDescription,
          productDescription: articleInfo?.productDescription || req.body.productDescription,
          designSketchUrl: articleInfo?.designSketchUrl || req.body.designSketchUrl,
          technicalDesignerId: articleInfo?.technicalDesignerId || req.body.technicalDesignerId || user._id,
          status: TechPackStatus.Draft,
          // Additional fields from articleInfo
          category: articleInfo?.productClass || req.body.category || req.body.productClass,
          gender: articleInfo?.gender || req.body.gender,
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
      
      console.log('🔧 PATCH TechPack request received:', {
        techPackId: id,
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        requestBody: req.body
      });

      // Check if user has permission to edit tech packs
      if (!PermissionManager.canEditTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to edit tech packs', 403, 'FORBIDDEN');
      }

      // Handle both ObjectId and string ID formats
      let techpack;

      try {
        // First try as ObjectId
        techpack = await TechPack.findById(id)
          .populate('technicalDesignerId', 'firstName lastName email')
          .populate('createdBy', 'firstName lastName email')
          .populate('sharedWith.userId', 'firstName lastName email');
      } catch (error) {
        // If that fails, try with relaxed validation
        try {
          // Use findOne with mixed type to handle string IDs
          techpack = await TechPack.findOne({ _id: id } as any)
            .populate('technicalDesignerId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .populate('sharedWith.userId', 'firstName lastName email');
        } catch (secondError) {
          // Both attempts failed
          techpack = null;
        }
      }
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Data integrity patch: If createdBy is missing, assign it from technical designer or current user
      if (!techpack.createdBy) {
        console.warn(`TechPack ${techpack._id} is missing 'createdBy' field. Patching data...`);
        techpack.createdBy = techpack.technicalDesignerId || user._id;
      }

      // Debug logging
      console.log('TechPack found:', {
        id: techpack._id,
        technicalDesignerId: techpack.technicalDesignerId,
        createdBy: techpack.createdBy,
        userRole: user.role,
        userId: user._id
      });

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
  const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

  // IMPORTANT: technical designer should NOT implicitly receive edit permissions.
  // Edit permission is only granted to Admin, Owner, or explicit shared edit roles.
  const canEdit = user.role === UserRole.Admin || isOwner || hasEditAccess;

      if (!canEdit) {
        return sendError(res, 'Access denied. You do not have permission to edit this tech pack.', 403, 'FORBIDDEN');
      }

      // Define whitelist of updatable fields to prevent schema validation errors
      const allowedFields = [
        'productName', 'articleCode', 'version', 'supplier', 'season',
        'fabricDescription', 'productDescription', 'designSketchUrl', 'status', 'category', 'gender', 'brand',
        'technicalDesignerId', 'lifecycleStage', 'collectionName', 'targetMarket', 'pricePoint',
        'retailPrice', 'currency', 'description', 'notes', 'bom',
        'measurements', 'colorways', 'howToMeasure'
      ];

      // Safely update only whitelisted fields that exist in request body
      const updateData: any = {
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`
      };

      // Array fields that need special merging logic
      const arrayFields = ['bom', 'measurements', 'colorways', 'howToMeasure'];

      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          // Handle array fields specially - merge instead of replace
          if (arrayFields.includes(field)) {
            const oldArray = (techpack as any)[field] || [];
            const newArray = req.body[field];
            if (Array.isArray(newArray)) {
              updateData[field] = mergeSubdocumentArray(oldArray, newArray);
            } else {
              updateData[field] = req.body[field];
            }
          } else {
            updateData[field] = req.body[field];
          }
        }
      });

      // Map lifecycleStage to status if sent
      const lifecycleStage = (req.body as any).lifecycleStage;
      if (lifecycleStage) {
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
          case 'Shipped':
            updateData.status = TechPackStatus.Approved;
            break;
        }
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
      let revisionVersion = techpack.version; // Default to current version if no changes

      // If there are meaningful changes, increment the version
      if (changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
        const { revisionVersion: newRevisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
        revisionVersion = newRevisionVersion; // Get version for the revision log (e.g., "v1.2")
      }

      // Save the TechPack document once, with both user updates and the new version
      const updatedTechPack = await techpack.save();

      // Try to create the revision log separately
      let revisionCreated = null;
      try {
        // Use the pre-calculated 'changes' object. Only create a revision if there were changes.
        if (changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          console.log('🔍 Creating revision with version:', revisionVersion);

          const newRevision = new Revision({
            techPackId: updatedTechPack._id,
            version: revisionVersion, // Use the auto-incremented version
            changes: {
              summary: changes.summary,
              details: changes.details,
              diff: changes.diffData, // Pass the detailed diff data
            },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: req.body.changeDescription || changes.summary,
            changeType: 'auto' as const,
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: updatedTechPack.toObject()
          });

          revisionCreated = await newRevision.save();
          console.log('✅ Revision created successfully:', revisionCreated._id);
          console.log('📊 Revision details:', {
            version: revisionCreated.version,
            summary: revisionCreated.changes.summary,
            createdBy: revisionCreated.createdByName
          });
        } else {
          console.log('❌ No revision created - no significant changes detected');
          console.log('🔍 Changes summary was:', changes.summary);
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

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_DELETE, target: { type: 'TechPack', id: techpack._id as Types.ObjectId, name: techpack.productName }, req });
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
      const duplicatedTechPack = await TechPack.create({
        ...techPackData,
        articleCode: `${originalTechPack.articleCode}-COPY`,
        productName: `${originalTechPack.productName} (Copy)`,
        version: keepVersion ? originalTechPack.version : 'V1',
        status: TechPackStatus.Draft,
        createdBy: user._id,
        updatedBy: user._id,
        sharedWith: [],
        auditLogs: []
      });

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_CREATE, target: { type: 'TechPack', id: duplicatedTechPack._id as Types.ObjectId, name: duplicatedTechPack.productName }, req });
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
      if (user.role === UserRole.Designer) {
        query.technicalDesignerId = user._id;
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

      // Prevent sharing with system admin or technical designer
      if (targetUser.role === UserRole.Admin || techpack.technicalDesignerId?.toString() === userId) {
        return sendError(res, 'Cannot share with system admin or the assigned technical designer.', 400, 'BAD_REQUEST');
      }

      const existingShareIndex = techpack.sharedWith?.findIndex(s => s.userId.toString() === userId) || -1;
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
        techpack.sharedWith.push({
          userId,
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

      // Log activity
      await logActivity({
        userId: sharer._id,
        userName: `${sharer.firstName} ${sharer.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check if revoker has permission to revoke access
      const isOwner = techpack.createdBy?.toString() === revoker._id.toString();
      const revokerAccess = techpack.sharedWith?.find(s => s.userId.toString() === revoker._id.toString());
      const canRevoke = revoker.role === UserRole.Admin || isOwner ||
                       (revokerAccess && ['admin'].includes(revokerAccess.role));

      if (!canRevoke) {
        return sendError(res, 'Access denied. Only Owner or Admin can revoke access.', 403, 'FORBIDDEN');
      }

      const shareIndex = techpack.sharedWith?.findIndex(s => s.userId.toString() === userId) || -1;
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

      // Log activity
      await logActivity({
        userId: revoker._id,
        userName: `${revoker.firstName} ${revoker.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
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
      // Check if user has permission to share
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const userAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      
      // Global Admin OR Owner OR Shared Admin can share
      const canShare = user.role === UserRole.Admin || isOwner ||
                      (userAccess && ['admin'].includes(userAccess.role));

      if (!canShare) {
        return sendError(res, 'Access denied. Only Owner or Admin can view shareable users.', 403, 'FORBIDDEN');
      }

      // Get all users except:
      // - System admins
      // - The technical designer
      // - Users already shared with
      // - The current user
      const excludedUserIds = [
        user._id.toString(),
        techpack.technicalDesignerId?.toString(),
        ...(techpack.sharedWith?.map(s => s.userId.toString()) || [])
      ].filter(Boolean);

      console.log('🔍 Debug shareable users filters:', {
        currentUserId: user._id.toString(),
        currentUserRole: user.role,
        techpackId: (techpack._id as any).toString(),
        techpackCreatedBy: techpack.createdBy?.toString(),
        technicalDesignerId: techpack.technicalDesignerId?.toString(),
        sharedWithCount: techpack.sharedWith?.length || 0,
        excludedUserIds,
        excludedCount: excludedUserIds.length
      });

      // First, let's see total users in system
      const totalUsers = await User.countDocuments({ isActive: true });
      console.log('📊 Total active users in system:', totalUsers);

      // Check users by role
      const usersByRole = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);
      console.log('👥 Users by role:', usersByRole);

  // Parse query params to booleans explicitly
  const includeAdmins = String((req.query || {}).includeAdmins || 'false') === 'true';
  const includeAll = String((req.query || {}).includeAll || 'false') === 'true';

      // Build base filters
      const baseFilters: any = {
        _id: { $nin: excludedUserIds },
        isActive: true
      };

      // includeAll=true returns everyone except current/excluded
      if (!includeAll) {
        // By default, exclude admins unless explicitly included
        if (!includeAdmins) {
          baseFilters.role = { $ne: UserRole.Admin };
        }
      }

      let shareableUsers = await User.find({
        ...baseFilters
      }).select('firstName lastName email role').limit(100).lean();

      // Fallback: if still empty and includeAll not requested, try including admins
      if (!shareableUsers.length && !includeAll && !includeAdmins) {
        console.log('ℹ️ No non-admin shareable users found, applying admin-included fallback');
        shareableUsers = await User.find({
          _id: { $nin: excludedUserIds },
          isActive: true
        }).select('firstName lastName email role').limit(100).lean();
      }

      console.log('✅ Found shareable users:', {
        count: shareableUsers.length,
        users: shareableUsers.map(u => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role
        }))
      });

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
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const userAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      
      // Global Admin OR Owner OR Shared Admin can view
      const canView = user.role === UserRole.Admin || isOwner ||
                     (userAccess && ['admin'].includes(userAccess.role));

      if (!canView) {
        return sendError(res, 'Access denied. Only Owner or Admin can view access list.', 403, 'FORBIDDEN');
      }

      // Get shared users information manually
      const accessList = await Promise.all(
        (techpack.sharedWith || []).map(async (share) => {
          const sharedUser = await User.findById(share.userId).select('firstName lastName email role');
          const sharedByUser = share.sharedBy ? await User.findById(share.sharedBy).select('firstName lastName email') : null;

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
        })
      );

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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check if updater has permission to update roles
      const isOwner = techpack.createdBy?.toString() === updater._id.toString();
      const updaterAccess = techpack.sharedWith?.find(s => s.userId.toString() === updater._id.toString());
      const canUpdate = updater.role === UserRole.Admin || isOwner ||
                       (updaterAccess && ['admin'].includes(updaterAccess.role));

      if (!canUpdate) {
        return sendError(res, 'Access denied. Only Owner or Admin can update roles.', 403, 'FORBIDDEN');
      }

      const shareIndex = techpack.sharedWith?.findIndex(s => s.userId.toString() === userId) || -1;
      if (shareIndex === -1) {
        return sendError(res, 'User does not have access to this TechPack.', 404, 'NOT_FOUND');
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return sendError(res, 'Target user not found', 404, 'NOT_FOUND');
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

      // Log activity
      await logActivity({
        userId: updater._id,
        userName: `${updater.firstName} ${updater.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
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


}

export default new TechPackController();
