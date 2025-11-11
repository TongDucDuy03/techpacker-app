import { Response } from 'express';
import { validationResult } from 'express-validator';
import TechPack, { TechPackStatus } from '../models/techpack.model';
import Revision from '../models/revision.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import { Types } from 'mongoose';

export class WorkflowController {
  /**
   * Handle workflow actions (submit, approve, reject)
   * POST /api/techpacks/:id/workflow
   */
  async handleWorkflowAction(req: AuthRequest, res: Response): Promise<void> {
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
      const { action, comments } = req.body;
      const user = req.user!;

      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Validate workflow transitions
      const validTransitions = this.getValidTransitions(techpack.status, user.role);
      if (!validTransitions.includes(action)) {
        res.status(400).json({
          success: false,
          message: `Invalid action '${action}' for current status '${techpack.status}' and role '${user.role}'`,
          validActions: validTransitions
        });
        return;
      }

      // Check permissions for specific actions
      if ((action === 'approve' || action === 'reject') && 
          ![UserRole.Merchandiser, UserRole.Admin].includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'Only Merchandisers and Admins can approve or reject TechPacks'
        });
        return;
      }

      // Check ownership for submit action
      if (action === 'submit_for_review' && 
          user.role === UserRole.Designer && 
          techpack.technicalDesignerId.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'You can only submit your own TechPacks for review'
        });
        return;
      }

      // Execute workflow action
      const oldStatus = techpack.status;
      const newStatus = this.getNewStatus(action);
      
      techpack.status = newStatus;
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      // Create revision for status changes
      if (oldStatus !== newStatus) {
        const revision = new Revision({
          techPackId: techpack._id,
          version: techpack.version,
          changes: {
            summary: `Status changed from ${oldStatus} to ${newStatus}`,
            details: {
              status: {
                modified: 1
              }
            },
            diff: {
              status: {
                old: oldStatus,
                new: newStatus
              }
            }
          },
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          description: comments || `Status changed from ${oldStatus} to ${newStatus}`,
          changeType: 'auto',
          statusAtChange: oldStatus,
          snapshot: techpack.toObject()
        });

        await revision.save();
      }

      await techpack.save();

      // Log activity
      const activityAction = this.getActivityAction(action);
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: activityAction,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: {
          action,
          oldStatus,
          newStatus,
          comments
        },
        req
      });

      res.json({
        success: true,
        message: `TechPack ${action.replace('_', ' ')} successfully`,
        data: {
          techpack: {
            id: techpack._id,
            productName: techpack.productName,
            articleCode: techpack.articleCode,
            status: techpack.status,
            updatedAt: techpack.updatedAt
          },
          statusChange: {
            from: oldStatus,
            to: newStatus,
            actionBy: `${user.firstName} ${user.lastName}`,
            comments
          }
        }
      });
    } catch (error: any) {
      console.error('Workflow action error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get revision history for a TechPack
   * GET /api/techpacks/:id/revisions
   */
  async getRevisions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Check if TechPack exists
      const techpack = await TechPack.findById(id);
      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions
      const user = req.user!;
      if (user.role === UserRole.Designer && 
          techpack.technicalDesignerId.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view revisions of your own TechPacks.'
        });
        return;
      }

      // Sort options
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Get revisions
      const [revisions, total] = await Promise.all([
        Revision.find({ techPackId: id })
          .populate('createdBy', 'firstName lastName username')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Revision.countDocuments({ techPackId: id })
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: {
          revisions,
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
      console.error('Get revisions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Revert TechPack to a previous revision
   * POST /api/techpacks/:id/revisions/revert
   */
  async revertToRevision(req: AuthRequest, res: Response): Promise<void> {
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
      const { revisionId, reason } = req.body;
      const user = req.user!;

      // Check permissions - only Admin can revert
      if (user.role !== UserRole.Admin) {
        res.status(403).json({
          success: false,
          message: 'Only Admins can revert TechPacks to previous revisions'
        });
        return;
      }

      const [techpack, revision] = await Promise.all([
        TechPack.findById(id),
        Revision.findById(revisionId)
      ]);

      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      if (!revision || revision.techPackId.toString() !== id) {
        res.status(404).json({
          success: false,
          message: 'Revision not found'
        });
        return;
      }

      // Create new revision before reverting
      const currentSnapshot = techpack.toObject();
      const newRevision = new Revision({
        techPackId: techpack._id,
        version: `${techpack.version}-REVERT`,
        changes: [{
          field: 'revert',
          oldValue: 'Current state',
          newValue: `Reverted to ${revision.version}`
        }],
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        reason: reason || `Reverted to revision ${revision.version}`,
        snapshot: currentSnapshot
      });

      // Restore TechPack from revision snapshot
      const { _id, createdAt, updatedAt, __v, ...snapshotData } = revision.snapshot;
      Object.assign(techpack, snapshotData);
      techpack.updatedBy = user._id;
      techpack.updatedByName = `${user.firstName} ${user.lastName}`;

      await Promise.all([
        newRevision.save(),
        techpack.save()
      ]);

      // Log activity
      await logActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        action: ActivityAction.TECHPACK_UPDATE,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: {
          action: 'revert',
          revertedToVersion: revision.version,
          reason
        },
        req
      });

      res.json({
        success: true,
        message: `TechPack reverted to revision ${revision.version} successfully`,
        data: {
          techpack,
          revertedFrom: revision.version,
          newRevisionId: newRevision._id
        }
      });
    } catch (error: any) {
      console.error('Revert revision error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get valid workflow transitions for current status and user role
   */
  private getValidTransitions(currentStatus: TechPackStatus, userRole: UserRole): string[] {
    const transitions: { [key: string]: { [key: string]: string[] } } = {
      [TechPackStatus.Draft]: {
        [UserRole.Designer]: ['submit_for_review'],
        [UserRole.Merchandiser]: ['submit_for_review', 'approve'],
        [UserRole.Admin]: ['submit_for_review', 'approve']
      },
      [TechPackStatus.InReview]: {
        [UserRole.Merchandiser]: ['approve', 'reject'],
        [UserRole.Admin]: ['approve', 'reject']
      },
      [TechPackStatus.Approved]: {
        [UserRole.Merchandiser]: ['reject'],
        [UserRole.Admin]: ['reject']
      },
      [TechPackStatus.Rejected]: {
        [UserRole.Designer]: ['submit_for_review'],
        [UserRole.Merchandiser]: ['submit_for_review', 'approve'],
        [UserRole.Admin]: ['submit_for_review', 'approve']
      }
    };

    return transitions[currentStatus]?.[userRole] || [];
  }

  /**
   * Get new status based on action
   */
  private getNewStatus(action: string): TechPackStatus {
    const statusMap: { [key: string]: TechPackStatus } = {
      'submit_for_review': TechPackStatus.InReview,
      'approve': TechPackStatus.Approved,
      'reject': TechPackStatus.Rejected
    };

    return statusMap[action] || TechPackStatus.Draft;
  }

  /**
   * Get activity action based on workflow action
   */
  private getActivityAction(action: string): ActivityAction {
    const actionMap: { [key: string]: ActivityAction } = {
      'submit_for_review': ActivityAction.STATUS_CHANGE_SUBMITTED,
      'approve': ActivityAction.STATUS_CHANGE_APPROVED,
      'reject': ActivityAction.STATUS_CHANGE_REJECTED
    };

    return actionMap[action] || ActivityAction.TECHPACK_UPDATE;
  }
}

export default new WorkflowController();
