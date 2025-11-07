import { Router } from 'express';
import RevisionController from '../controllers/revision.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Get all revisions for a TechPack
router.get('/techpacks/:id/revisions', requireAuth, RevisionController.getTechPackRevisions);

// Get a specific revision by ID
router.get('/revisions/:id', requireAuth, RevisionController.getRevision);

// Compare two revisions
router.get('/techpacks/:id/revisions/compare', requireAuth, RevisionController.compareRevisions);

// Revert TechPack to a previous revision (creates new revision entry)
router.post('/revisions/revert/:techPackId/:revisionId', requireAuth, RevisionController.revertToRevision);

// Add comment to a revision
router.post('/revisions/:id/comments', requireAuth, RevisionController.addComment);

// Approve a revision
router.post('/revisions/:id/approve', requireAuth, RevisionController.approveRevision);

// Reject a revision
router.post('/revisions/:id/reject', requireAuth, RevisionController.rejectRevision);

export default router;

