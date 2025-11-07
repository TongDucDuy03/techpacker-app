import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import TechPack from '../models/techpack.model';
import Revision from '../models/revision.model';
import RevisionService from '../services/revision.service';
import CacheInvalidationUtil from '../utils/cache-invalidation.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';

export class SubdocumentController {
  /**
   * Add BOM item
   * POST /api/techpacks/:id/bom
   */
  async addBOMItem(req: AuthRequest, res: Response): Promise<void> {
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

      // technicalDesigner does not automatically get edit rights. Only Admin, Owner, or explicit shared editors can modify.
      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Keep a snapshot of the old techpack for revision comparison BEFORE mutation
      const oldTechPack = techpack.toObject({ virtuals: true });

      // Add new BOM item
      const newBOMItem = {
        _id: new Types.ObjectId(),
        ...req.body
      };

      techpack.bom.push(newBOMItem);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await techpack.save();

      // Create revision and invalidate cache (await to ensure subsequent GETs see fresh data)
      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (addBOMItem):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.BOM_ADD,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { bomItem: newBOMItem },
        req
      });

      res.status(201).json({
        success: true,
        message: 'BOM item added successfully',
        data: { bomItem: newBOMItem }
      });
    } catch (error: any) {
      console.error('Add BOM item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update BOM item
   * PUT /api/techpacks/:id/bom/:bomId
   */
  async updateBOMItem(req: AuthRequest, res: Response): Promise<void> {
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

      const { id, bomId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and update BOM item
      const bomItem = (techpack.bom as any).id(bomId);
      if (!bomItem) {
        res.status(404).json({
          success: false,
          message: 'BOM item not found'
        });
        return;
      }
      // Keep a snapshot of the old techpack for revision comparison BEFORE mutation
      const oldTechPack = techpack.toObject({ virtuals: true });

      Object.assign(bomItem, req.body);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (updateBOMItem):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.BOM_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { bomItemId: bomId, updates: req.body },
        req
      });

      res.json({
        success: true,
        message: 'BOM item updated successfully',
        data: { bomItem }
      });
    } catch (error: any) {
      console.error('Update BOM item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete BOM item
   * DELETE /api/techpacks/:id/bom/:bomId
   */
  async deleteBOMItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, bomId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and remove BOM item
      const bomItem = (techpack.bom as any).id(bomId);
      if (!bomItem) {
        res.status(404).json({
          success: false,
          message: 'BOM item not found'
        });
        return;
      }

      const deletedItem = bomItem.toObject();

      // Keep a snapshot of the old techpack for revision comparison BEFORE mutation
      const oldTechPack = techpack.toObject({ virtuals: true });

      (techpack.bom as any).pull(bomId);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (deleteBOMItem):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.BOM_DELETE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { deletedBomItem: deletedItem },
        req
      });

      res.json({
        success: true,
        message: 'BOM item deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete BOM item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Add Measurement
   * POST /api/techpacks/:id/measurements
   */
  async addMeasurement(req: AuthRequest, res: Response): Promise<void> {
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

  // Check access permissions based on role and sharing
  const isOwner = techpack.createdBy.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
  const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

  // technicalDesigner does NOT implicitly get edit rights. Require Admin, Owner, or explicit shared editor/admin role.
  if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Keep a snapshot of the old techpack for revision comparison BEFORE mutation
      const oldTechPack = techpack.toObject({ virtuals: true });

      // Add new measurement
      const newMeasurement = {
        _id: new Types.ObjectId(),
        ...req.body
      };

      techpack.measurements.push(newMeasurement);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (addMeasurement):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.MEASUREMENT_ADD,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { measurement: newMeasurement },
        req
      });

      res.status(201).json({
        success: true,
        message: 'Measurement added successfully',
        data: { measurement: newMeasurement }
      });
    } catch (error: any) {
      console.error('Add measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
      // Find and update measurement
      const measurement = (techpack.measurements as any).id(measurementId);
   */
  async updateMeasurement(req: AuthRequest, res: Response): Promise<void> {
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

      const { id, measurementId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = !!sharedAccess && ['owner','admin','editor'].includes((sharedAccess as any).role);

      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and update measurement
      const measurement = (techpack.measurements as any).id(measurementId);
      if (!measurement) {
        res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
        return;
      }

      // Keep a snapshot of the old techpack for revision comparison BEFORE mutation
      const oldTechPack = techpack.toObject({ virtuals: true });

      Object.assign(measurement, req.body);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (updateMeasurement):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.MEASUREMENT_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { measurementId, updates: req.body },
        req
      });

      res.json({
        success: true,
        message: 'Measurement updated successfully',
        data: { measurement }
      });
    } catch (error: any) {
      console.error('Update measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete Measurement
   * DELETE /api/techpacks/:id/measurements/:measurementId
   */
  async deleteMeasurement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, measurementId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = sharedAccess?.permission === 'edit';

      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and remove measurement
      const measurement = (techpack.measurements as any).id(measurementId);
      if (!measurement) {
        res.status(404).json({
          success: false,
          message: 'Measurement not found'
        });
        return;
      }

      const deletedMeasurement = measurement.toObject();
      (techpack.measurements as any).pull(measurementId);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;
      const oldTechPack = techpack.toObject({ virtuals: true });
      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (deleteMeasurement):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.MEASUREMENT_DELETE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { deletedMeasurement },
        req
      });

      res.json({
        success: true,
        message: 'Measurement deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete measurement error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Add Colorway
   * POST /api/techpacks/:id/colorways
   */
  async addColorway(req: AuthRequest, res: Response): Promise<void> {
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

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions based on role and sharing
      const isOwner = techpack.createdBy.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = sharedAccess?.permission === 'edit';

      if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Add new colorway
      const newColorway = {
        _id: new Types.ObjectId(),
        ...req.body
      };

      techpack.colorways.push(newColorway);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;
      const oldTechPack = techpack.toObject({ virtuals: true });
      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (addColorway):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.COLORWAY_ADD,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { colorway: newColorway },
        req
      });

      res.status(201).json({
        success: true,
        message: 'Colorway added successfully',
        data: { colorway: newColorway }
      });
    } catch (error: any) {
      console.error('Add colorway error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update Colorway
   * PUT /api/techpacks/:id/colorways/:colorwayId
   */
  async updateColorway(req: AuthRequest, res: Response): Promise<void> {
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

      const { id, colorwayId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

  // Check access permissions based on role and sharing
  const isOwner = techpack.createdBy.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
  const hasEditAccess = sharedAccess?.permission === 'edit';

  // technicalDesigner does NOT implicitly get edit rights. Require Admin, Owner, or explicit shared edit permission.
  if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and update colorway
      const colorway = (techpack.colorways as any).id(colorwayId);
      if (!colorway) {
        res.status(404).json({
          success: false,
          message: 'Colorway not found'
        });
        return;
      }

      Object.assign(colorway, req.body);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;
      const oldTechPack = techpack.toObject({ virtuals: true });
      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (updateColorway):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.COLORWAY_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { colorwayId, updates: req.body },
        req
      });

      res.json({
        success: true,
        message: 'Colorway updated successfully',
        data: { colorway }
      });
    } catch (error: any) {
      console.error('Update colorway error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete Colorway
   * DELETE /api/techpacks/:id/colorways/:colorwayId
   */
  async deleteColorway(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, colorwayId } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

  // Check access permissions based on role and sharing
  const isOwner = techpack.createdBy.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith.find(s => s.userId.toString() === user._id.toString());
  const hasEditAccess = sharedAccess?.permission === 'edit';

  // technicalDesigner does NOT implicitly get edit rights. Require Admin, Owner, or explicit shared edit permission.
  if (user.role !== UserRole.Admin && !isOwner && !hasEditAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to modify this Tech Pack.'
        });
        return;
      }

      // Find and remove colorway
      const colorway = (techpack.colorways as any).id(colorwayId);
      if (!colorway) {
        res.status(404).json({
          success: false,
          message: 'Colorway not found'
        });
        return;
      }

      const deletedColorway = colorway.toObject();
      (techpack.colorways as any).pull(colorwayId);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;
      const oldTechPack = techpack.toObject({ virtuals: true });
      await techpack.save();

      try {
        const changes = RevisionService.compareTechPacks(oldTechPack as any, techpack as any);
        if (changes.summary && changes.summary !== 'No changes detected.' && changes.summary !== 'Error detecting changes.') {
          const { revisionVersion } = await RevisionService.autoIncrementVersion(techpack._id as Types.ObjectId);
          const newRevision = new Revision({
            techPackId: techpack._id,
            version: revisionVersion,
            changes: { summary: changes.summary, details: changes.details, diff: changes.diffData },
            createdBy: user._id,
            createdByName: `${user.firstName} ${user.lastName}`,
            description: changes.summary,
            changeType: 'auto',
            statusAtChange: oldTechPack.status || 'draft',
            snapshot: techpack.toObject()
          });
          await newRevision.save();
        }

        await CacheInvalidationUtil.invalidateTechPackCache((techpack._id as Types.ObjectId).toString());
      } catch (err) {
        console.error('Subdocument revision/cache handling error (deleteColorway):', err);
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.COLORWAY_DELETE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: { deletedColorway },
        req
      });

      res.json({
        success: true,
        message: 'Colorway deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete colorway error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export default new SubdocumentController();
