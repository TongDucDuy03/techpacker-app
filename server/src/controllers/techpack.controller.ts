import { Response } from 'express';
import { validationResult } from 'express-validator';
import TechPack, { TechPackStatus } from '../models/techpack.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
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
  }


  async getTechPacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = config.defaultPageSize, q = '', status, season, designer, brand, sortBy = 'updatedAt', sortOrder = 'desc' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.maxPageSize, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      const query: any = {};
      if (q) {
        const searchRegex = { $regex: q, $options: 'i' };
        query.$or = [{ productName: searchRegex }, { articleCode: searchRegex }, { supplier: searchRegex }, { fabricDescription: searchRegex }];
      }

      // Filter by status, excluding archived by default
      if (status) {
        query.status = status;
      } else {
        query.status = { $ne: 'Archived' };
      }
      if (season) query.season = season;
      if (designer) {
        // Validate designer parameter is a valid ObjectId before using it
        const designerStr = designer as string;
        if (Types.ObjectId.isValid(designerStr)) {
          query.designer = designerStr;
        } else {
          console.warn(`Invalid designer ObjectId provided: ${designerStr}`);
          // Skip invalid designer filter rather than causing a 500 error
        }
      }
      if (brand) query.brand = brand;

      // Skip user role filtering for demo
      const sortOptions: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      // Execute queries without populate to avoid CastError from invalid ObjectIds
      const [techpacks, total] = await Promise.all([
        TechPack.find(query)
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
        // First try as ObjectId
        techpack = await TechPack.findById(id).populate('designer createdBy updatedBy', 'firstName lastName username').lean();
      } catch (error) {
        // If that fails, try with relaxed validation
        try {
          // Use findOne with mixed type to handle string IDs
          techpack = await TechPack.findOne({ _id: id } as any).populate('designer createdBy updatedBy', 'firstName lastName username').lean();
        } catch (secondError) {
          // Both attempts failed
          techpack = null;
        }
      }

      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      if (req.user?.role === UserRole.Designer && techpack.designer.toString() !== req.user._id.toString()) {
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

      // Map frontend data to backend format
      const techpackData = {
        productName,
        articleCode: articleCode.toUpperCase(),
        version: articleInfo?.version?.toString() || 'V1',
        supplier,
        season,
        fabricDescription,
        category: articleInfo?.productClass || req.body.category,
        gender: articleInfo?.gender || req.body.gender,
        brand: articleInfo?.brand || req.body.brand,
        technicalDesigner: articleInfo?.technicalDesigner || req.body.technicalDesigner,
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
        designer: user._id,
        designerName: `${user.firstName} ${user.lastName}`,
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`,
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

      // Check if user has permission to edit tech packs
      if (!PermissionManager.canEditTechPacks(user.role)) {
        return sendError(res, 'Insufficient permissions to edit tech packs', 403, 'FORBIDDEN');
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

      // Designers can only edit their own tech packs, Admins can edit any
      if (user.role === UserRole.Designer && techpack.designer.toString() !== user._id.toString()) {
        return sendError(res, 'Access denied. You can only edit tech packs you created.', 403, 'FORBIDDEN');
      }

      // Define whitelist of updatable fields to prevent schema validation errors
      const allowedFields = [
        'productName', 'articleCode', 'version', 'supplier', 'season',
        'fabricDescription', 'status', 'category', 'gender', 'brand',
        'technicalDesigner', 'lifecycleStage', 'collectionName', 'targetMarket', 'pricePoint',
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

      // Apply updates to the document
      Object.assign(techpack, updateData);
      const updatedTechPack = await techpack.save();

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_UPDATE, target: { type: 'TechPack', id: updatedTechPack._id as Types.ObjectId, name: updatedTechPack.productName }, req });
      sendSuccess(res, updatedTechPack, 'TechPack updated successfully');
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

      // Designers can only delete their own tech packs, Admins can delete any
      if (user.role === UserRole.Designer && techpack.designer.toString() !== user._id.toString()) {
        return sendError(res, 'Access denied. You can only delete tech packs you created.', 403, 'FORBIDDEN');
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

      if (user.role === UserRole.Designer && originalTechPack.designer.toString() !== user._id.toString()) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      const { _id, createdAt, updatedAt, ...techPackData } = originalTechPack;
      const duplicatedTechPack = await TechPack.create({
        ...techPackData,
        articleCode: `${originalTechPack.articleCode}-COPY`,
        productName: `${originalTechPack.productName} (Copy)`,
        version: keepVersion ? originalTechPack.version : 'V1',
        status: TechPackStatus.Draft,
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`
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
        query.designer = user._id;
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
}

export default new TechPackController();
