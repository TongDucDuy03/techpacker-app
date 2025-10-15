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
      if (designer) query.designer = designer;
      if (brand) query.brand = brand;

      // Skip user role filtering for demo
      const sortOptions: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

      const [techpacks, total] = await Promise.all([
        TechPack.find(query).populate('designer', 'firstName lastName username').sort(sortOptions).skip(skip).limit(limitNum).lean(),
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
      const techpack = await TechPack.findById(req.params.id).populate('designer createdBy updatedBy', 'firstName lastName username').lean();
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

      const user = req.user!;

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
        description: articleInfo?.notes || req.body.description,
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      if (user.role === UserRole.Designer && techpack.designer.toString() !== user._id.toString()) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      // Define whitelist of updatable fields to prevent schema validation errors
      const allowedFields = [
        'productName', 'articleCode', 'version', 'supplier', 'season',
        'fabricDescription', 'status', 'category', 'gender', 'brand',
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      if (user.role === UserRole.Designer && techpack.designer.toString() !== user._id.toString()) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
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
