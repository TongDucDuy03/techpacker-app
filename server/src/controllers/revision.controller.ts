import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Revision from '../models/revision.model';
import TechPack from '../models/techpack.model';
import RevisionService from '../services/revision.service';
import { sendSuccess, sendError } from '../utils/response.util';
import { UserRole } from '../models/user.model';

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

      // Check if TechPack exists and user has access
      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      // Check access permissions
      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      const hasViewAccess = sharedAccess?.permission === 'view' || sharedAccess?.permission === 'edit';
      const canView = user.role === UserRole.Admin || isOwner || isTechnicalDesigner || hasViewAccess;

      if (!canView) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      // Build query filters
      const query: any = { techPackId: id };
      if (changeType) query.changeType = changeType;
      if (createdBy) query.createdBy = createdBy;

      const skip = (Number(page) - 1) * Number(limit);
      const revisions = await Revision.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Revision.countDocuments(query);

      sendSuccess(res, {
        revisions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get TechPack revisions error:', error);
      sendError(res, 'Failed to fetch revisions');
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

      const revision = await Revision.findById(id)
        .populate('createdBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .populate('techPackId', 'productName articleCode');

      if (!revision) {
        return sendError(res, 'Revision not found', 404, 'NOT_FOUND');
      }

      // Check access to the associated TechPack
      const techpack = await TechPack.findById(revision.techPackId);
      if (!techpack) {
        return sendError(res, 'Associated TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      const hasViewAccess = sharedAccess?.permission === 'view' || sharedAccess?.permission === 'edit';
      const canView = user.role === UserRole.Admin || isOwner || isTechnicalDesigner || hasViewAccess;

      if (!canView) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      sendSuccess(res, revision);
    } catch (error) {
      console.error('Get revision error:', error);
      sendError(res, 'Failed to fetch revision');
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

      if (!from || !to) {
        return sendError(res, 'Both "from" and "to" revision IDs are required', 400, 'VALIDATION_ERROR');
      }

      // Check TechPack access
      const techpack = await TechPack.findById(id);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      const hasViewAccess = sharedAccess?.permission === 'view' || sharedAccess?.permission === 'edit';
      const canView = user.role === UserRole.Admin || isOwner || isTechnicalDesigner || hasViewAccess;

      if (!canView) {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
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
      if (fromRevision.techPackId.toString() !== id || toRevision.techPackId.toString() !== id) {
        return sendError(res, 'Revisions must belong to the specified TechPack', 400, 'VALIDATION_ERROR');
      }

      // Compare the snapshots
      const comparison = RevisionService.compareTechPacks(fromRevision.snapshot, toRevision.snapshot);

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
        comparison
      });
    } catch (error) {
      console.error('Compare revisions error:', error);
      sendError(res, 'Failed to compare revisions');
    }
  }



  /**
   * Revert TechPack to a previous revision (creates new revision entry)
   * POST /api/v1/revisions/revert/:techPackId/:revisionId
   */
  async revertToRevision(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { techPackId, revisionId } = req.params;
      const user = req.user!;

      // Check if user has permission to revert (admin or designer only)
      if (user.role !== UserRole.Admin && user.role !== UserRole.Designer) {
        return sendError(res, "You don't have permission to revert.", 403, 'FORBIDDEN');
      }

      // Check TechPack access and edit permissions
      const techpack = await TechPack.findById(techPackId);
      if (!techpack) {
        return sendError(res, 'TechPack not found', 404, 'NOT_FOUND');
      }

      const isOwner = techpack.createdBy?.toString() === user._id.toString();
      const isTechnicalDesigner = techpack.technicalDesignerId?.toString() === user._id.toString();
      const sharedAccess = techpack.sharedWith?.find(s => s.userId.toString() === user._id.toString());
      const hasEditAccess = sharedAccess?.permission === 'edit';
      const canEdit = user.role === UserRole.Admin || isOwner || isTechnicalDesigner || hasEditAccess;

      if (!canEdit) {
        return sendError(res, 'Access denied. You do not have permission to edit this tech pack.', 403, 'FORBIDDEN');
      }

      // Get the revision to revert to
      const targetRevision = await Revision.findById(revisionId);
      if (!targetRevision) {
        return sendError(res, 'Revision not found', 404, 'NOT_FOUND');
      }

      if (targetRevision.techPackId.toString() !== techPackId) {
        return sendError(res, 'Revision does not belong to this TechPack', 400, 'VALIDATION_ERROR');
      }

      // Don't allow reverting to rollback revisions
      if (targetRevision.changeType === 'rollback') {
        return sendError(res, 'Cannot revert to a rollback revision', 400, 'VALIDATION_ERROR');
      }

      // Revert the TechPack to the target revision snapshot
      const revertedData = { ...targetRevision.snapshot };
      delete revertedData._id; // Don't overwrite the ID
      delete revertedData.createdAt; // Keep original creation date
      delete revertedData.updatedAt; // Will be updated automatically

      // Generate new version number
      const latestRevision = await Revision.findOne({ techPackId })
        .sort({ createdAt: -1 })
        .select('version');

      let newVersionNumber = 1;
      if (latestRevision && latestRevision.version) {
        const match = latestRevision.version.match(/v?(\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          newVersionNumber = major * 100 + minor + 1;
        }
      }

      const newVersion = `v${Math.floor(newVersionNumber / 100)}.${newVersionNumber % 100}`;

      // Apply the reverted data to techpack using .set() to ensure deep paths are marked as modified
      techpack.set({
        ...revertedData,
        version: newVersion,
        updatedBy: user._id,
        updatedByName: `${user.firstName} ${user.lastName}`,
        updatedAt: new Date()
      });

      await techpack.save();

      // Create a new revision entry for the revert action
      const revertRevision = new Revision({
        techPackId: techpack._id,
        version: newVersion,
        changeType: 'rollback',
        changes: {
          summary: `Reverted to Revision ${targetRevision.version}`,
          details: {
            revertedFrom: targetRevision.version,
            revertedFromId: targetRevision._id,
            revertAction: true
          }
        },
        createdBy: user._id,
        createdByName: `${user.firstName} ${user.lastName}`,
        description: `Reverted to revision ${targetRevision.version} created on ${targetRevision.createdAt}`,
        statusAtChange: techpack.status,
        snapshot: techpack.toObject(),
        revertedFrom: targetRevision.version
      });

      await revertRevision.save();

      sendSuccess(res, {
        techpack,
        newRevision: revertRevision,
        revertedFrom: targetRevision.version
      }, `Successfully reverted to Revision ${targetRevision.version}`);

    } catch (error) {
      console.error('Revert to revision error:', error);
      sendError(res, 'Failed to revert to revision');
    }
  }
}

export default new RevisionController();
