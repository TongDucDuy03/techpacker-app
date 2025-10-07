import { Router } from 'express';
import techpackController from '../controllers/techpack.controller';
import { validate } from '../middleware/validation.middleware';
import {
  createTechPackSchema,
  updateTechPackSchema,
  getTechPackSchema,
  listTechPacksSchema,
  duplicateTechPackSchema,
  bulkOperationsSchema
} from '../validation/techpack.validation';

const router = Router();



/**
 * @route GET /api/techpacks
 * @desc List tech packs with filtering and pagination
 * @access Public (for demo purposes)
 */
router.get(
  '/',
  validate(listTechPacksSchema),
  techpackController.listTechPacks
);

/**
 * @route POST /api/techpacks
 * @desc Create new tech pack
 * @access Public (for demo purposes)
 */
router.post(
  '/',
  validate(createTechPackSchema),
  techpackController.createTechPack
);

/**
 * @route GET /api/techpacks/:id
 * @desc Get tech pack details
 * @access Public (for demo purposes)
 */
router.get(
  '/:id',
  validate(getTechPackSchema),
  techpackController.getTechPack
);

/**
 * @route PUT /api/techpacks/:id
 * @desc Update tech pack
 * @access Public (for demo purposes)
 */
router.put(
  '/:id',
  validate(updateTechPackSchema),
  techpackController.updateTechPack
);

/**
 * @route DELETE /api/techpacks/:id
 * @desc Soft delete tech pack
 * @access Public (for demo purposes)
 */
router.delete(
  '/:id',
  validate(getTechPackSchema),
  techpackController.deleteTechPack
);

/**
 * @route POST /api/techpacks/:id/duplicate
 * @desc Duplicate tech pack
 * @access Public (for demo purposes)
 */
router.post(
  '/:id/duplicate',
  validate(duplicateTechPackSchema),
  techpackController.duplicateTechPack
);

/**
 * @route PATCH /api/techpacks/bulk
 * @desc Bulk operations
 * @access Public (for demo purposes)
 */
router.patch(
  '/bulk',
  validate(bulkOperationsSchema),
  techpackController.bulkOperations
);

export default router;
