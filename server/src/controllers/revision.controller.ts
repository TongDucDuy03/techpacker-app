import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Revision from '../models/revision.model';
import TechPack from '../models/techpack.model';
import RevisionService from '../services/revision.service';
import { sendSuccess, sendError } from '../utils/response.util';
import { UserRole } from '../models/user.model';
import mongoose, { Types } from 'mongoose';
import CacheInvalidationUtil from '../utils/cache-invalidation.util';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import NotificationService from '../services/notification.service';
import _ from 'lodash';
import { getEffectiveRole } from '../utils/access-control.util';

/**
 * Helper function to safely extract ID from object (handles both populated and non-populated)
 */
const safeId = (obj: any): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return String(obj._id || obj || '');
};

/**
 * Helper function to check if user has edit access to TechPack
 * Now uses getEffectiveRole to respect system role limits
 * Only owner, admin, or editor can access revisions (viewer and factory are not allowed)
 */
const hasEditAccess = (techpack: any, user: any): boolean => {
  const isOwner = safeId(techpack.createdBy) === safeId(user._id);
  const isAdmin = user.role === UserRole.Admin;
  
  const sharedAccess = techpack.sharedWith?.find((s: any) => {
    const sharedUserId = safeId(s.userId);
    return sharedUserId === safeId(user._id);
  });
  
  if (sharedAccess) {
    // Use effective role to check permissions
    const effectiveRole = getEffectiveRole(user.role, sharedAccess.role);
    const hasSharedEditAccess = ['owner', 'admin', 'editor'].includes(effectiveRole);
    return isAdmin || isOwner || hasSharedEditAccess;
  }
  
  // Technical Designer chỉ có quyền xem, không có quyền edit/revert
  return isAdmin || isOwner;
};

export class RevisionController {
  /**
   * Get all revisions for a specific TechPack
   * GET /api/v1/techpacks/:id/revisions
   */
  async getTechPackRevisions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { page = 1, limit = 20, changeType, createdBy } = req.query;

      // Validate ObjectId
      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid TechPack ID format', 400, 'VALIDATION_ERROR');
      }

      // Check if TechPack exists and user has access
      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check view access permissions - only owner/admin/editor can view revisions
      // Viewer and Factory are not allowed
      const canView = hasEditAccess(techpack, user); // Use hasEditAccess instead of hasViewAccess
      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can view revision history.', 403, 'FORBIDDEN');
      }

      // Build query filters
      const query: any = { techPackId: id };
      if (changeType) query.changeType = changeType;
      if (createdBy) {
        if (!Types.ObjectId.isValid(createdBy as string)) {
          return sendError(res, 'Invalid createdBy ID format', 400, 'VALIDATION_ERROR');
        }
        query.createdBy = createdBy;
      }

      // Clamp limit between 10 and 50
      const limitNum = Math.min(50, Math.max(10, Number(limit) || 20));
      const pageNum = Math.max(1, Number(page) || 1);
      const skip = (pageNum - 1) * limitNum;

      // Check if snapshot should be included
      const includeSnapshot = req.query.includeSnapshot === 'true';

      // Parallelize queries and exclude snapshot for performance (unless explicitly requested)
      const [revisions, total] = await Promise.all([
        Revision.find(query)
          .populate('createdBy', 'firstName lastName email')
          .select(includeSnapshot ? '' : '-snapshot') // Exclude snapshot from list view unless requested
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Revision.countDocuments(query)
      ]);

      sendSuccess(res, {
        revisions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      sendError(res, error.message || 'Failed to fetch revisions', 500);
    }
  }

  /**
   * Get a specific revision by ID
   * GET /api/v1/revisions/:id
   */
  async getRevision(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Validate ObjectId
      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid revision ID format', 400, 'VALIDATION_ERROR');
      }

      const revision = await Revision.findById(id)
        .populate('createdBy', 'firstName lastName email')
        .populate('techPackId', 'productName articleCode');

      if (!revision) {
        return sendError(res, 'Revision not found', 404, 'NOT_FOUND');
      }

      // Get TechPack ID (handle both populated and non-populated)
      const techPackId = safeId(revision.techPackId);
      if (!Types.ObjectId.isValid(techPackId)) {
        return sendError(res, 'Invalid TechPack ID in revision', 400, 'VALIDATION_ERROR');
      }

      // Check access to the associated TechPack
      const techpack = await TechPack.findById(techPackId);
      if (!techpack) {
        return sendError(res, 'Associated TechPack not found', 404, 'NOT_FOUND');
      }

      // Check view access permissions - only owner/admin/editor can view revisions
      // Viewer and Factory are not allowed
      const canView = hasEditAccess(techpack, user); // Use hasEditAccess instead of hasViewAccess
      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can view revision history.', 403, 'FORBIDDEN');
      }

      // If this revision lacks stored field-level diff, compute it on-the-fly against the previous revision
      try {
        const hasStoredDiff =
          revision.changes &&
          (revision.changes as any).diff &&
          typeof (revision.changes as any).diff === 'object' &&
          Object.keys((revision.changes as any).diff || {}).length > 0;
        const hasSnapshot = !!revision.snapshot;
        if (!hasStoredDiff && hasSnapshot) {
          // Find previous revision for the same TechPack by createdAt
          const previous = await Revision.findOne({
            techPackId: techPackId,
            createdAt: { $lt: revision.createdAt }
          })
            .sort({ createdAt: -1 })
            .select('snapshot version createdAt');
          if (previous && previous.snapshot) {
            const comparison = RevisionService.compareTechPacks(previous.snapshot as any, revision.snapshot as any);
            // Enrich revision object for response only (do not persist)
            (revision as any).changes = {
              ...(revision.changes as any),
              diff: comparison.diffData,
              // Optionally attach formatted helpers
              details: {
                ...((revision.changes as any)?.details || {}),
                ...(function () {
                  const formatted = RevisionService.formatDiffData(
                    comparison.diffData as any,
                    previous.snapshot as any,
                    revision.snapshot as any
                  );
                  return {
                    formattedBySection: formatted.perSection,
                    formattedText: formatted.asText
                  };
                })()
              }
            };
          }
        }
      } catch (_e) {
        // If dynamic diff computation fails, still return the revision
      }

      // Return full revision details including snapshot and computed diff (if any)
      sendSuccess(res, revision);
    } catch (error: any) {
      sendError(res, error.message || 'Failed to fetch revision', 500);
    }
  }

  /**
   * Compare two revisions
   * GET /api/v1/techpacks/:id/revisions/compare?from=revisionId1&to=revisionId2
   */
  async compareRevisions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { from, to } = req.query;
      const user = req.user!;

      // Validate inputs
      if (!from || !to) {
        return sendError(res, 'Both "from" and "to" revision IDs are required', 400, 'VALIDATION_ERROR');
      }

      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid TechPack ID format', 400, 'VALIDATION_ERROR');
      }

      if (!Types.ObjectId.isValid(from as string) || !Types.ObjectId.isValid(to as string)) {
        return sendError(res, 'Invalid revision ID format', 400, 'VALIDATION_ERROR');
      }

      // Check TechPack access
      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check view access permissions - only owner/admin/editor can view revisions
      // Viewer and Factory are not allowed
      const canView = hasEditAccess(techpack, user); // Use hasEditAccess instead of hasViewAccess
      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can view revision history.', 403, 'FORBIDDEN');
      }

      // Get both revisions
      const [fromRevision, toRevision] = await Promise.all([
        Revision.findById(from),
        Revision.findById(to)
      ]);

      if (!fromRevision || !toRevision) {
        return sendError(res, 'One or both revisions not found', 404, 'NOT_FOUND');
      }

      // Ensure both revisions belong to the same TechPack
      const fromTechPackId = safeId(fromRevision.techPackId);
      const toTechPackId = safeId(toRevision.techPackId);
      
      if (fromTechPackId !== id || toTechPackId !== id) {
        return sendError(res, 'Revisions must belong to the specified TechPack', 400, 'VALIDATION_ERROR');
      }

      // Validate snapshots exist
      if (!fromRevision.snapshot || !toRevision.snapshot) {
        return sendError(res, 'One or both revisions are missing snapshot data', 400, 'VALIDATION_ERROR');
      }

      // Compare the snapshots
      const comparison = RevisionService.compareTechPacks(fromRevision.snapshot, toRevision.snapshot);

      // Limit diff size if too large (max 100 fields)
      let limitedDiff: Record<string, any> | undefined = comparison.diffData;
      let hasMore = false;
      if (limitedDiff && Object.keys(limitedDiff).length > 100) {
        const keys = Object.keys(limitedDiff).slice(0, 100);
        limitedDiff = keys.reduce((acc, key) => {
          acc[key] = limitedDiff![key];
          return acc;
        }, {} as Record<string, any>);
        hasMore = true;
      }

      sendSuccess(res, {
        fromRevision: {
          _id: fromRevision._id,
          version: fromRevision.version,
          createdAt: fromRevision.createdAt,
          createdByName: fromRevision.createdByName
        },
        toRevision: {
          _id: toRevision._id,
          version: toRevision.version,
          createdAt: toRevision.createdAt,
          createdByName: toRevision.createdByName
        },
        comparison: {
          ...comparison,
          diffData: limitedDiff,
          hasMore
        }
      });
    } catch (error: any) {
      sendError(res, error.message || 'Failed to compare revisions', 500);
    }
  }

  /**
   * Revert TechPack to a previous revision (creates new revision entry)
   * POST /api/v1/revisions/revert/:techPackId/:revisionId
   */
  async revertToRevision(req: AuthRequest, res: Response): Promise<void> {
    const session = await mongoose.startSession();
    let techPackId: string | undefined;
    let revisionId: string | undefined;

    try {
      techPackId = req.params.techPackId;
      revisionId = req.params.revisionId;
      const user = req.user!;
      const { reason } = req.body; // Optional reason/description for revert

      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(techPackId) || !Types.ObjectId.isValid(revisionId)) {
        return sendError(res, 'Invalid ID format', 400, 'VALIDATION_ERROR');
      }

      // Use withTransaction for automatic commit/abort
      let savedTechpack: any;
      let revertRevision: any;
      let targetRevision: any;
      let newVersion: string = '';

      const runRevertLogic = async (useSession: boolean) => {
        // Check TechPack access and edit permissions
        const techpackQuery = TechPack.findById(techPackId);
        const techpack = useSession ? await techpackQuery.session(session) : await techpackQuery;
        if (!techpack) {
          throw new Error('TechPack not found');
        }

        // Check edit permissions (Owner, Admin, or Editor with explicit share access)
        // Remove global role gate - only check ownership and shared access
        const canEdit = hasEditAccess(techpack, user);
        if (!canEdit) {
          throw new Error("You don't have permission to revert this TechPack");
        }

        // Get the revision to revert to
        const revQuery = Revision.findById(revisionId);
        targetRevision = useSession ? await revQuery.session(session) : await revQuery;
        if (!targetRevision) {
          throw new Error('Revision not found');
        }

        // Validate revision belongs to this TechPack (null-safe)
        const techPackIdFromRevision = safeId(targetRevision.techPackId);
        if (techPackIdFromRevision !== techPackId) {
          throw new Error('Revision does not belong to this TechPack');
        }

        // Validate snapshot exists
        if (!targetRevision.snapshot) {
          throw new Error('Cannot revert — snapshot data missing for this revision');
        }

        // Don't allow reverting to rollback revisions
        if (targetRevision.changeType === 'rollback') {
          throw new Error('Cannot revert to a rollback revision');
        }

        // Deep clone the snapshot to avoid reference issues
        const clonedSnapshot = _.cloneDeep(targetRevision.snapshot);

        // Sanitize MongoDB metadata fields
        delete clonedSnapshot._id;
        delete clonedSnapshot.__v;
        delete clonedSnapshot.createdAt;
        delete clonedSnapshot.updatedAt;

        // Prepare diff before applying snapshot (old vs. target snapshot)
        let oldTechpackObject: any;
        try {
          oldTechpackObject = techpack.toObject({ virtuals: true });
        } catch {
          oldTechpackObject = (techpack as any);
        }
        // Build a preview of the new object by overlaying snapshot on current
        const previewNewObject = _.cloneDeep(oldTechpackObject);
        Object.assign(previewNewObject, clonedSnapshot);
        // Ensure arrays are taken from snapshot when available
        ['bom', 'measurements', 'colorways', 'howToMeasure'].forEach((key) => {
          if ((clonedSnapshot as any)[key] !== undefined) {
            (previewNewObject as any)[key] = (clonedSnapshot as any)[key];
          }
        });
        const changes = RevisionService.compareTechPacks(oldTechpackObject, previewNewObject);
        const formatted = RevisionService.formatDiffData(
          changes.diffData as any,
          oldTechpackObject,
          previewNewObject
        );

        // Apply reverted data to TechPack
        Object.assign(techpack, clonedSnapshot);

        // Ensure Mongoose detects array modifications
        const arrayFields: string[] = ['bom', 'measurements', 'colorways', 'howToMeasure'];
        arrayFields.forEach((field) => {
          if ((clonedSnapshot as any)[field] !== undefined) {
            try {
              techpack.markModified(field as any);
            } catch (_) {
              // ignore
            }
          }
        });

        // Generate new revision version number (do not change TechPack.version)
        const versionResult = await RevisionService.autoIncrementVersion(new Types.ObjectId(techPackId));
        newVersion = versionResult.revisionVersion;

        // Update metadata (keep product version unchanged)
        techpack.updatedBy = user._id;
        techpack.updatedByName = `${user.firstName} ${user.lastName}`;
        techpack.updatedAt = new Date();

        // Save TechPack within transaction
        savedTechpack = useSession ? await techpack.save({ session }) : await techpack.save();

        // Create a new revision entry for the revert action
        revertRevision = new Revision({
          techPackId: savedTechpack._id,
          version: newVersion,
          changeType: 'rollback',
          changes: {
            summary: `Reverted to Revision ${targetRevision.version} — ${changes.summary}`,
            details: {
              revertedFrom: targetRevision.version,
              revertedFromId: String(targetRevision._id),
              revertAction: true,
              formattedBySection: formatted.perSection,
              formattedText: formatted.asText
            },
            diff: changes.diffData
          },
          createdBy: user._id,
          createdByName: `${user.firstName} ${user.lastName}`,
          description: reason || formatted.asText || `Reverted to revision ${targetRevision.version}`,
          statusAtChange: savedTechpack.status,
          snapshot: savedTechpack.toObject({ virtuals: true }),
          revertedFrom: targetRevision.version,
          revertedFromId: targetRevision._id
        });

        // Save revision within transaction
        if (useSession) {
          await revertRevision.save({ session });
        } else {
          await revertRevision.save();
        }
      };

      // Prefer transaction, fallback to non-transactional if not supported
      try {
        await session.withTransaction(async () => {
          await runRevertLogic(true);
        });
      } catch (txErr: any) {
        const msg = String(txErr?.message || '');
        if (msg.includes('Transaction numbers are only allowed on a replica set member') ||
            msg.includes('ReplicaSet') ||
            msg.includes('not supported')) {
          // Fallback: run without transactions for standalone MongoDB
          await runRevertLogic(false);
        } else {
          throw txErr;
        }
      }

      // Post-transaction actions (after successful commit)
      // Cache invalidation
      try {
        await CacheInvalidationUtil.invalidateRevisions(techPackId);
      } catch (cacheErr) {
        console.error('Failed to invalidate cache after revert:', cacheErr);
      }

      // Audit log
      try {
        await logActivity({
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          action: ActivityAction.TECHPACK_UPDATE,
          target: {
            type: 'TechPack',
            id: savedTechpack._id as Types.ObjectId,
            name: (savedTechpack as any).articleName || (savedTechpack as any).productName || 'Unknown'
          },
          details: {
            action: 'revert',
            techPackId: String(savedTechpack._id),
            revertedToVersion: targetRevision.version,
            revertedFromId: String(targetRevision._id),
            newVersion: newVersion,
            reason: reason || undefined
          },
          req
        });
      } catch (auditErr) {
        console.error('Failed to log revert activity:', auditErr);
      }

      // Notification
      try {
        await NotificationService.notifyRevert(
          techPackId,
          { _id: user._id, firstName: user.firstName, lastName: user.lastName },
          targetRevision.version,
          newVersion
        );
      } catch (notifErr) {
        console.error('Failed to send revert notification:', notifErr);
      }

      // Return success response
      sendSuccess(res, {
        techpack: savedTechpack,
        newRevision: {
          _id: revertRevision._id,
          version: revertRevision.version,
          changeType: revertRevision.changeType,
          createdAt: revertRevision.createdAt,
          revertedFrom: revertRevision.revertedFrom,
          revertedFromId: revertRevision.revertedFromId
        },
        revertedFrom: targetRevision.version
      }, `Successfully reverted to Revision ${targetRevision.version}`);

    } catch (error: any) {
      // Handle transaction errors
      if (error.message === 'TechPack not found') {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }
      if (error.message === 'Revision not found') {
        return sendError(res, 'Revision not found', 404, 'NOT_FOUND');
      }
      if (error.message.includes('permission')) {
        return sendError(res, error.message, 403, 'FORBIDDEN');
      }
      if (error.message.includes('snapshot') || error.message.includes('rollback')) {
        return sendError(res, error.message, 400, 'VALIDATION_ERROR');
      }
      sendError(res, error.message || 'Failed to revert to revision', 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Add comment to a revision
   * POST /api/v1/revisions/:id/comments
   */
  async addComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const user = req.user!;

      // Validate ObjectId
      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 'Invalid revision ID format', 400, 'VALIDATION_ERROR');
      }

      // Validate comment
      if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        return sendError(res, 'Comment is required and must be a non-empty string', 400, 'VALIDATION_ERROR');
      }

      // Get revision
      const revision = await Revision.findById(id);
      if (!revision) {
        return sendError(res, 'Revision not found', 404, 'NOT_FOUND');
      }

      // Get TechPack to check access
      const techPackId = safeId(revision.techPackId);
      if (!Types.ObjectId.isValid(techPackId)) {
        return sendError(res, 'Invalid TechPack ID in revision', 400, 'VALIDATION_ERROR');
      }

      const techpack = await TechPack.findById(techPackId);
      if (!techpack) {
        return sendError(res, 'Associated TechPack not found', 404, 'NOT_FOUND');
      }

      // Check view access - only owner/admin/editor can comment on revisions
      // Viewer and Factory are not allowed
      const canView = hasEditAccess(techpack, user); // Use hasEditAccess instead of hasViewAccess
      if (!canView) {
        return sendError(res, 'Access denied. Only Owner, Admin, or Editor can comment on revisions.', 403, 'FORBIDDEN');
      }

      // Initialize comments array if not exists
      if (!revision.comments) {
        revision.comments = [];
      }

      // Add comment
      const newComment = {
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        comment: comment.trim(),
        createdAt: new Date()
      };

      revision.comments.push(newComment);
      await revision.save();

      // Cache invalidation
      try {
        await CacheInvalidationUtil.invalidateRevisions(techPackId);
      } catch (cacheErr) {
        console.error('Failed to invalidate cache after comment:', cacheErr);
      }

      // Audit log (optional)
      try {
        await logActivity({
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          action: ActivityAction.TECHPACK_UPDATE,
          target: {
            type: 'TechPack',
            id: techpack._id as Types.ObjectId,
            name: (techpack as any).articleName || (techpack as any).productName || 'Unknown'
          },
          details: {
            action: 'comment',
            revisionId: String(revision._id),
            revisionVersion: revision.version
          },
          req
        });
      } catch (auditErr) {
        console.error('Failed to log comment activity:', auditErr);
      }

      sendSuccess(res, {
        comment: newComment,
        revision: {
          _id: revision._id,
          version: revision.version,
          commentsCount: revision.comments.length
        }
      }, 'Comment added successfully');
    } catch (error: any) {
      sendError(res, error.message || 'Failed to add comment', 500);
    }
  }

}

export default new RevisionController();
