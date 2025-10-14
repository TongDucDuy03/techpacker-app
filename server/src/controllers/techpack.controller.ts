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

      if (status) query.status = status;
      if (season) query.season = season;
      if (designer) query.designer = designer;
      if (brand) query.brand = brand;

      if (req.user?.role === UserRole.Designer) {
        query.designer = req.user._id;
      }

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
      const user = req.user!;
      const techpack = await TechPack.create({
        ...req.body,
        designer: user._id,
        designerName: `${user.firstName} ${user.lastName}`,
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`,
        version: 'V1'
      });

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_CREATE, target: { type: 'TechPack', id: techpack._id as Types.ObjectId, name: techpack.productName }, req });
      sendSuccess(res, techpack, 'TechPack created successfully', 201);
    } catch (error: any) {
      console.error('Create TechPack error:', error);
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

      Object.assign(techpack, { ...req.body, updatedBy: user._id, updatedByName: `${user.firstName} ${user.lastName}` });
      const updatedTechPack = await techpack.save();

      await logActivity({ userId: user._id, userName: `${user.firstName} ${user.lastName}`, action: ActivityAction.TECHPACK_UPDATE, target: { type: 'TechPack', id: updatedTechPack._id as Types.ObjectId, name: updatedTechPack.productName }, req });
      sendSuccess(res, updatedTechPack, 'TechPack updated successfully');
    } catch (error: any) {
      console.error('Patch TechPack error:', error);
      sendError(res, 'Failed to update tech pack');
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
