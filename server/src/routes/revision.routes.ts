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

// Restore a TechPack to a specific revision
router.post('/techpacks/:id/revisions/:revisionId/restore', requireAuth, RevisionController.restoreRevision);

export default router;

