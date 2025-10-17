import { Response } from 'express';
import { validationResult } from 'express-validator';
import TechPack, { ITechPack, TechPackStatus } from '../models/techpack.model';
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
  }


  async getTechPacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = config.defaultPageSize, q = '', status, season, brand, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
      const user = req.user!;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.maxPageSize, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      let query: any = {};

      // Base query for access control
      if (user.role === UserRole.Admin) {
        // Admins can see all non-archived packs
      } else if (user.role === UserRole.Designer) {
        query.$or = [
          { technicalDesignerId: user._id },
          { 'sharedWith.userId': user._id }
        ];
      } else {
        // Other roles (Merchandiser, Viewer) are restricted by customerId and sharing
        query.$or = [
          { customerId: user.customerId },
          { 'sharedWith.userId': user._id }
        ];
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
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        TechPack.countDocuments(query)
      ]);

      const pagination = { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) };
      sendSuccess(res, techpacks, 'Tech packs retrieved successfully', 200, pagination);
    } catch (error: any) {
      console.error('Get TechPacks error:', error);
      sendError(res, 'Failed to retrieve tech packs');
    }
  }

  async getTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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

      const user = req.user!;
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const isSharedWith = techpack.sharedWith?.some(s => s.userId.toString() === user._id.toString()) || false;

      if (user.role !== UserRole.Admin && !isOwner && !isTechnicalDesigner && !isSharedWith) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      sendSuccess(res, techpack);
    } catch (error: any) {
      console.error('Get TechPack error:', error);
      sendError(res, 'Failed to retrieve tech pack');
    }
  }

  async createTechPack(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
      return;
    }

    try {
      const { articleInfo, bom, measurements, colorways, howToMeasures } = req.body;

      // Ensure user is authenticated and has permission to create tech packs
      const user = req.user;
      if (!user) {
        return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      }

      // Check if user has permission to create tech packs
      if (!PermissionManager.canCreateTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to create tech packs', 403, 'FORBIDDEN');
      }

      // Validate required fields
      const productName = articleInfo?.productName || req.body.productName;
      const articleCode = articleInfo?.articleCode || req.body.articleCode;
      const supplier = articleInfo?.supplier || req.body.supplier;
      const season = articleInfo?.season || req.body.season;
      const fabricDescription = articleInfo?.fabricDescription || req.body.fabricDescription;

      if (!productName) {
        return sendError(res, 'Product name is required', 400, 'VALIDATION_ERROR');
      }
      if (!articleCode) {
        return sendError(res, 'Article code is required', 400, 'VALIDATION_ERROR');
      }
      if (!supplier) {
        return sendError(res, 'Supplier is required', 400, 'VALIDATION_ERROR');
      }
      if (!season) {
        return sendError(res, 'Season is required', 400, 'VALIDATION_ERROR');
      }
      if (!fabricDescription) {
        return sendError(res, 'Fabric description is required', 400, 'VALIDATION_ERROR');
      }

      // Derive status from lifecycleStage if provided
      const lifecycleStage = articleInfo?.lifecycleStage || req.body.lifecycleStage;
      const statusFromLifecycle = (() => {
        switch (lifecycleStage) {
          case 'Concept':
          case 'Design':
            return TechPackStatus.Draft;
          case 'Development':
          case 'Pre-production':
            return TechPackStatus.InReview;
          case 'Production':
          case 'Shipped':
            return TechPackStatus.Approved;
          default:
            return undefined;
        }
      })();

      const technicalDesignerId = articleInfo?.technicalDesignerId || req.body.technicalDesignerId;
      if (!technicalDesignerId || !Types.ObjectId.isValid(technicalDesignerId)) {
        return sendError(res, 'A valid Technical Designer is required', 400, 'VALIDATION_ERROR');
      }

      // Map frontend data to backend format
      const techpackData = {
        productName,
        articleCode: articleCode.toUpperCase(),
        version: articleInfo?.version?.toString() || 'V1',
        supplier,
        season,
        fabricDescription,
        productDescription: articleInfo?.productDescription,
        designSketchUrl: articleInfo?.designSketchUrl,
        category: articleInfo?.productClass || req.body.category,
        gender: articleInfo?.gender || req.body.gender,
        brand: articleInfo?.brand || req.body.brand,
        technicalDesignerId,
        customerId: user.customerId, // Assign customerId from the user
        lifecycleStage: lifecycleStage,
        collectionName: articleInfo?.collection || req.body.collectionName || req.body.collection,
        targetMarket: articleInfo?.targetMarket || req.body.targetMarket,
        pricePoint: articleInfo?.pricePoint || req.body.pricePoint,
        description: articleInfo?.notes || req.body.description,
        notes: req.body.notes || articleInfo?.notes,
        retailPrice: req.body.retailPrice ?? undefined,
        currency: req.body.currency ?? undefined,
        status: statusFromLifecycle || req.body.status || TechPackStatus.Draft,
        bom: bom || [],
        measurements: measurements || [],
        colorways: colorways || [],
        howToMeasure: howToMeasures || [],
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`,
        sharedWith: [],
        auditLogs: [],
      };

      console.log('Creating techpack with data:', JSON.stringify(techpackData, null, 2));

      const techpack = await TechPack.create(techpackData);

      // Skip activity logging for demo
      sendSuccess(res, techpack, 'TechPack created successfully', 201);
    } catch (error: any) {
      console.error('Create TechPack error:', error);

      // Handle specific MongoDB errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0];
        return sendError(res, `${field} already exists. Please use a different value.`, 409, 'DUPLICATE_KEY');
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => ({
          field: err.path,
          message: err.message
        }));
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
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = sharedAccess?.permission === 'edit';

      // For existing TechPacks without technicalDesignerId, allow the creator to edit
      const canEdit = user.role === UserRole.Admin || isOwner || isTechnicalDesigner || hasEditAccess;

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

      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          updateData[field] = req.body[field];
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
      const isTechnicalDesigner = originalTechPack.technicalDesignerId?.toString() === user._id.toString();
      const hasPermission = user.role === UserRole.Admin || isOwner || isTechnicalDesigner;

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
      const { userId, permission } = req.body;
      const sharer = req.user!;

      if (!userId || !permission || !['view', 'edit'].includes(permission)) {
        return sendError(res, 'Valid userId and permission (view/edit) are required', 400, 'VALIDATION_ERROR');
      }

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = techpack.createdBy?.toString() === sharer._id.toString();
      if (sharer.role !== UserRole.Admin && !isOwner) {
        return sendError(res, 'Access denied. Only the creator or an admin can share this tech pack.', 403, 'FORBIDDEN');
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return sendError(res, 'Target user not found', 404, 'NOT_FOUND');
      }

      if (targetUser.role === UserRole.Admin || techpack.technicalDesignerId?.toString() === userId) {
        return sendError(res, 'Cannot share with an admin or the assigned technical designer.', 400, 'BAD_REQUEST');
      }

      const existingShareIndex = techpack.sharedWith?.findIndex(s => s.userId.toString() === userId) || -1;
      let action: 'share_granted' | 'permission_changed' = 'share_granted';

      if (existingShareIndex > -1) {
        action = 'permission_changed';
        techpack.sharedWith![existingShareIndex].permission = permission;
      } else {
        if (!techpack.sharedWith) {
          techpack.sharedWith = [];
        }
        techpack.sharedWith.push({ userId, permission, sharedAt: new Date(), sharedBy: sharer._id });
      }

      if (!techpack.auditLogs) {
        techpack.auditLogs = [];
      }
      techpack.auditLogs.push({
        action,
        performedBy: sharer._id,
        targetUser: userId,
        permission,
        timestamp: new Date(),
        techpackId: techpack._id as Types.ObjectId
      });

      await techpack.save();
      sendSuccess(res, techpack.sharedWith, 'TechPack shared successfully');
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

      const isOwner = techpack.createdBy?.toString() === revoker._id.toString();
      if (revoker.role !== UserRole.Admin && !isOwner) {
        return sendError(res, 'Access denied. Only the creator or an admin can revoke access.', 403, 'FORBIDDEN');
      }

      const shareIndex = techpack.sharedWith?.findIndex(s => s.userId.toString() === userId) || -1;
      if (shareIndex === -1) {
        return sendError(res, 'User does not have access to this TechPack.', 404, 'NOT_FOUND');
      }

      const removedShare = techpack.sharedWith!.splice(shareIndex, 1)[0];

      if (!techpack.auditLogs) {
        techpack.auditLogs = [];
      }
      techpack.auditLogs.push({
        action: 'share_revoked',
        performedBy: revoker._id,
        targetUser: removedShare.userId,
        permission: removedShare.permission,
        timestamp: new Date(),
        techpackId: techpack._id as Types.ObjectId
      });

      await techpack.save();
      sendSuccess(res, {}, 'Access revoked successfully');
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
}

export default new TechPackController();
