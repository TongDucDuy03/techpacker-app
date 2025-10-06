import { Response } from 'express';
import { validationResult } from 'express-validator';
import TechPack, { ITechPack, TechPackStatus } from '../models/techpack.model';
import Revision from '../models/revision.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { config } from '../config/config';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';

export class TechPackController {
  /**
   * Get all TechPacks with pagination, search, and filters
   * GET /api/techpacks
   */
  async getTechPacks(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = config.defaultPageSize,
        q = '',
        status,
        season,
        designer,
        brand,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(config.maxPageSize, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};

      // Search in multiple fields
      if (q) {
        query.$or = [
          { productName: { $regex: q, $options: 'i' } },
          { articleCode: { $regex: q, $options: 'i' } },
          { supplier: { $regex: q, $options: 'i' } },
          { fabricDescription: { $regex: q, $options: 'i' } }
        ];
      }

      // Filters
      if (status) query.status = status;
      if (season) query.season = season;
      if (designer) query.designer = designer;
      if (brand) query.brand = brand;

      // Role-based filtering
      if (req.user?.role === UserRole.Designer) {
        query.designer = req.user._id;
      }

      // Sort options
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with lean() for performance
      const [techpacks, total] = await Promise.all([
        TechPack.find(query)
          .populate('designer', 'firstName lastName username')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        TechPack.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          techpacks,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: total,
            itemsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
        }
      });
    } catch (error: any) {
      console.error('Get TechPacks error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get single TechPack by ID
   * GET /api/techpacks/:id
   */
  async getTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const techpack = await TechPack.findById(id)
        .populate('designer', 'firstName lastName username')
        .populate('createdBy', 'firstName lastName username')
        .populate('updatedBy', 'firstName lastName username')
        .lean();

      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check ownership for Designer role
      if (req.user?.role === UserRole.Designer && 
          techpack.designer.toString() !== req.user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own TechPacks.'
        });
        return;
      }

      res.json({
        success: true,
        data: { techpack }
      });
    } catch (error: any) {
      console.error('Get TechPack error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Create new TechPack
   * POST /api/techpacks
   */
  async createTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const user = req.user!;
      const techpackData = {
        ...req.body,
        designer: user._id,
        designerName: user.fullName,
        createdBy: user._id,
        createdByName: user.fullName,
        updatedBy: user._id,
        updatedByName: user.fullName,
        version: 'V1'
      };

      const techpack = new TechPack(techpackData);
      await techpack.save();

      // Log activity
      await logActivity({
        userId: user._id,
        userName: user.fullName,
        action: ActivityAction.TECHPACK_CREATE,
        target: {
          type: 'TechPack',
          id: techpack._id,
          name: techpack.productName
        },
        req
      });

      res.status(201).json({
        success: true,
        message: 'TechPack created successfully',
        data: { techpack }
      });
    } catch (error: any) {
      console.error('Create TechPack error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update TechPack (creates new revision)
   * PUT /api/techpacks/:id
   */
  async updateTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { id } = req.params;
      const user = req.user!;

      const existingTechPack = await TechPack.findById(id);
      if (!existingTechPack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check ownership for Designer role
      if (user.role === UserRole.Designer && 
          existingTechPack.designer.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own TechPacks.'
        });
        return;
      }

      // Check if significant changes require new revision
      const significantFields = ['productName', 'fabricDescription', 'supplier', 'bom', 'measurements', 'colorways'];
      const hasSignificantChanges = significantFields.some(field => {
        if (field === 'bom' || field === 'measurements' || field === 'colorways') {
          return JSON.stringify(req.body[field]) !== JSON.stringify(existingTechPack[field]);
        }
        return req.body[field] !== existingTechPack[field];
      });

      let newVersion = existingTechPack.version;
      
      if (hasSignificantChanges) {
        // Create revision
        const versionNumber = parseInt(existingTechPack.version.replace('V', '')) + 1;
        newVersion = `V${versionNumber}`;

        const revision = new Revision({
          techPackId: existingTechPack._id,
          version: existingTechPack.version,
          changes: this.calculateChanges(existingTechPack.toObject(), req.body),
          createdBy: user._id,
          createdByName: user.fullName,
          reason: req.body.revisionReason || 'Significant changes made',
          snapshot: existingTechPack.toObject()
        });

        await revision.save();
      }

      // Update TechPack
      const updatedTechPack = await TechPack.findByIdAndUpdate(
        id,
        {
          ...req.body,
          version: newVersion,
          updatedBy: user._id,
          updatedByName: user.fullName
        },
        { new: true, runValidators: true }
      );

      // Log activity
      await logActivity({
        userId: user._id,
        userName: user.fullName,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: updatedTechPack!._id,
          name: updatedTechPack!.productName
        },
        details: { hasSignificantChanges, newVersion },
        req
      });

      res.json({
        success: true,
        message: 'TechPack updated successfully',
        data: { 
          techpack: updatedTechPack,
          revisionCreated: hasSignificantChanges
        }
      });
    } catch (error: any) {
      console.error('Update TechPack error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Partial update TechPack (autosave, no revision)
   * PATCH /api/techpacks/:id
   */
  async patchTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const existingTechPack = await TechPack.findById(id);
      if (!existingTechPack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check ownership for Designer role
      if (user.role === UserRole.Designer && 
          existingTechPack.designer.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own TechPacks.'
        });
        return;
      }

      // Update only provided fields
      const updatedTechPack = await TechPack.findByIdAndUpdate(
        id,
        {
          ...req.body,
          updatedBy: user._id,
          updatedByName: user.fullName
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'TechPack updated successfully',
        data: { techpack: updatedTechPack }
      });
    } catch (error: any) {
      console.error('Patch TechPack error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete TechPack (soft delete)
   * DELETE /api/techpacks/:id
   */
  async deleteTechPack(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check ownership for Designer role
      if (user.role === UserRole.Designer && 
          techpack.designer.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete your own TechPacks.'
        });
        return;
      }

      // Soft delete by changing status
      techpack.status = TechPackStatus.Archived;
      techpack.updatedBy = user._id;
      techpack.updatedByName = user.fullName;
      await techpack.save();

      // Log activity
      await logActivity({
        userId: user._id,
        userName: user.fullName,
        action: ActivityAction.TECHPACK_DELETE,
        target: {
          type: 'TechPack',
          id: techpack._id,
          name: techpack.productName
        },
        req
      });

      res.json({
        success: true,
        message: 'TechPack archived successfully'
      });
    } catch (error: any) {
      console.error('Delete TechPack error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Calculate changes between old and new TechPack data
   */
  private calculateChanges(oldData: any, newData: any): any[] {
    const changes: any[] = [];
    const fieldsToTrack = ['productName', 'fabricDescription', 'supplier', 'season', 'brand', 'retailPrice'];

    fieldsToTrack.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes.push({
          field,
          oldValue: oldData[field],
          newValue: newData[field]
        });
      }
    });

    // Track array changes (simplified)
    ['bom', 'measurements', 'colorways'].forEach(field => {
      if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
        changes.push({
          field,
          oldValue: `${oldData[field]?.length || 0} items`,
          newValue: `${newData[field]?.length || 0} items`
        });
      }
    });

    return changes;
  }
}

export default new TechPackController();
