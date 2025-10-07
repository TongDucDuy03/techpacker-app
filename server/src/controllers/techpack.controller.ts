import { Response } from 'express';
import { Types } from 'mongoose';
import TechPack, { ITechPack, TechPackStatus, RevisionHistory } from '../models/techpack.model';
import { ValidatedRequest } from '../middleware/validation.middleware';
import {
  CreateTechPackInput,
  UpdateTechPackInput,
  GetTechPackInput,
  ListTechPacksInput,
  DuplicateTechPackInput,
  BulkOperationsInput
} from '../validation/techpack.validation';

export class TechPackController {
  /**
   * List tech packs with filtering and pagination
   * GET /api/techpacks
   */
  async listTechPacks(req: ValidatedRequest<ListTechPacksInput>, res: Response): Promise<void> {
    try {
      const { query } = req.validated;
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      // Build filter query
      const filter: any = { isDeleted: false };

      // Search functionality
      if (query.q) {
        filter.$text = { $search: query.q };
      }

      // Status filter
      if (query.status) {
        filter.status = query.status;
      }

      // Designer filter
      if (query.designer) {
        filter.ownerId = query.designer;
      }

      // Execute query
      const [techPacks, total] = await Promise.all([
        TechPack.find(filter)
          .populate('ownerId', 'firstName lastName username')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        TechPack.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        data: techPacks,
        total,
        page,
        totalPages
      });
    } catch (error: any) {
      console.error('List TechPacks error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Create new tech pack
   * POST /api/techpacks
   */
  async createTechPack(req: ValidatedRequest<CreateTechPackInput>, res: Response): Promise<void> {
    try {
      const { body } = req.validated;
      const techPackData = {
        ...body,
        version: 'V1',
        status: TechPackStatus.DRAFT,
        isDeleted: false,
        revisions: [
          {
            version: 'V1',
            changedBy: new Types.ObjectId(body.ownerId), // Assuming owner is the creator
            changedByName: 'System',
            changeDate: new Date(),
            changeType: 'created',
            changes: [],
            notes: 'Initial creation'
          }
        ]
      };

      const techPack = new TechPack(techPackData);
      await techPack.save();

      res.status(201).json(techPack);
    } catch (error: any) {
      console.error('Create TechPack error:', error);
      if (error.code === 11000) {
        res.status(400).json({
          error: 'Duplicate article code',
          details: 'An item with this article code already exists.'
        });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          details: error.message
        });
      }
    }
  }

  /**
   * Get tech pack details
   * GET /api/techpacks/:id
   */
  async getTechPack(req: ValidatedRequest<GetTechPackInput>, res: Response): Promise<void> {
    try {
      const { id } = req.validated.params;
      const techPack = await TechPack.findOne({
        _id: id,
        isDeleted: false
      }).populate('ownerId', 'firstName lastName username');

      if (!techPack) {
        res.status(404).json({ error: 'TechPack not found' });
        return;
      }

      res.json(techPack);
    } catch (error: any) {
      console.error('Get TechPack error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }


  /**
   * Update tech pack
   * PUT /api/techpacks/:id
   */
  async updateTechPack(req: ValidatedRequest<UpdateTechPackInput>, res: Response): Promise<void> {
    try {
      const { id } = req.validated.params;
      const updateData = req.validated.body;

      const originalTechPack = await TechPack.findOne({ _id: id, isDeleted: false });

      if (!originalTechPack) {
        res.status(404).json({ error: 'TechPack not found' });
        return;
      }

      let newVersion = originalTechPack.version;
      const changes: any[] = [];
      let changeType: RevisionHistory['changeType'] = 'updated';

      // Detect significant changes
      for (const key in updateData) {
        if (JSON.stringify(originalTechPack[key]) !== JSON.stringify(updateData[key])) {
          changes.push({
            field: key,
            oldValue: originalTechPack[key],
            newValue: updateData[key]
          });
        }
      }

      // Update version if status changes from draft to approved
      if (updateData.status === TechPackStatus.APPROVED && originalTechPack.status === TechPackStatus.DRAFT) {
        const versionNum = parseInt(originalTechPack.version.replace('V', ''), 10) + 1;
        newVersion = `V${versionNum}`;
        changeType = 'approved';
      }

      const revisionEntry = this.createRevisionEntry(
        newVersion,
        originalTechPack.ownerId, // Placeholder for actual user
        'System', // Placeholder for actual user name
        changeType,
        changes
      );

      const updatedTechPack = await TechPack.findByIdAndUpdate(
        id,
        {
          $set: { ...updateData, version: newVersion },
          $push: { revisions: revisionEntry }
        },
        { new: true, runValidators: true }
      );

      res.json(updatedTechPack);
    } catch (error: any) {
      console.error('Update TechPack error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Soft delete tech pack
   * DELETE /api/techpacks/:id
   */
  async deleteTechPack(req: ValidatedRequest<GetTechPackInput>, res: Response): Promise<void> {
    try {
      const { id } = req.validated.params;

      const techPack = await TechPack.findOne({ _id: id, isDeleted: false });

      if (!techPack) {
        res.status(404).json({ error: 'TechPack not found' });
        return;
      }

      await TechPack.findByIdAndUpdate(id, { isDeleted: true });

      res.json({ message: 'TechPack deleted successfully' });
    } catch (error: any) {
      console.error('Delete TechPack error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Duplicate tech pack
   * POST /api/techpacks/:id/duplicate
   */
  async duplicateTechPack(req: ValidatedRequest<DuplicateTechPackInput>, res: Response): Promise<void> {
    try {
      const { id } = req.validated.params;
      const { keepVersion = false } = req.validated.body;

      const originalTechPack = await TechPack.findOne({ _id: id, isDeleted: false });

      if (!originalTechPack) {
        res.status(404).json({ error: 'TechPack not found' });
        return;
      }

      // Create duplicate data
      const duplicateData = originalTechPack.toObject();
      delete duplicateData._id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;

      // Handle version
      if (!keepVersion) {
        const versionMatch = originalTechPack.version.match(/V(\d+)/);
        if (versionMatch) {
          const versionNum = parseInt(versionMatch[1], 10) + 1;
          duplicateData.version = `V${versionNum}`;
        } else {
          duplicateData.version = `${originalTechPack.version}-copy`;
        }
      }

      // Update article code to ensure uniqueness
      duplicateData.articleCode = `${originalTechPack.articleCode}-COPY-${Date.now()}`;

      // Reset status and add creation revision
      duplicateData.status = TechPackStatus.DRAFT;
      duplicateData.revisions = [
        this.createRevisionEntry(
          duplicateData.version,
          originalTechPack.ownerId,
          'System',
          'created',
          [],
          'Duplicated from original tech pack'
        )
      ];

      const duplicatedTechPack = new TechPack(duplicateData);
      await duplicatedTechPack.save();

      res.status(201).json(duplicatedTechPack);
    } catch (error: any) {
      console.error('Duplicate TechPack error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Bulk operations
   * PATCH /api/techpacks/bulk
   */
  async bulkOperations(req: ValidatedRequest<BulkOperationsInput>, res: Response): Promise<void> {
    try {
      const { ids, action, payload } = req.validated.body;

      let updateOperation: any = {};
      let message = '';

      switch (action) {
        case 'delete':
          updateOperation = { isDeleted: true };
          message = `${ids.length} tech packs deleted successfully`;
          break;
        case 'approve':
          updateOperation = { status: TechPackStatus.APPROVED };
          message = `${ids.length} tech packs approved successfully`;
          break;
        case 'setStatus':
          if (!payload?.status) {
            res.status(400).json({ error: 'Status is required for setStatus action' });
            return;
          }
          updateOperation = { status: payload.status };
          message = `${ids.length} tech packs status updated successfully`;
          break;
        default:
          res.status(400).json({ error: 'Invalid action' });
          return;
      }

      const result = await TechPack.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        updateOperation
      );

      res.json({
        message,
        modifiedCount: result.modifiedCount
      });
    } catch (error: any) {
      console.error('Bulk operations error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Helper method to create revision entry
   */
  private createRevisionEntry(
    version: string,
    changedBy: Types.ObjectId,
    changedByName: string,
    changeType: RevisionHistory['changeType'],
    changes: any[],
    notes?: string
  ): RevisionHistory {
    return {
      version,
      changedBy,
      changedByName,
      changeDate: new Date(),
      changeType,
      changes,
      notes
    };
  }
}

export default new TechPackController();
