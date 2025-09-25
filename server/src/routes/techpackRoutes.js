const express = require('express');
const { techpackService } = require('../services/techpackService');
const { validationService } = require('../services/validationService');
const { stateService } = require('../services/stateService');
const { validateRequest, techPackSchema } = require('../config/validation');
const { authenticateToken, authorize } = require('../middleware/security');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/techpacks - Get all tech packs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      category: req.query.category,
      brand: req.query.brand,
      season: req.query.season,
      search: req.query.search,
      sortBy: req.query.sortBy || 'last_modified',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const techPacks = await techpackService.getAllTechPacks(options);
    const stats = await techpackService.getTechPackStats();

    res.json({
      success: true,
      data: techPacks,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: stats.total_techpacks
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching tech packs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tech packs',
      error: error.message
    });
  }
});

// GET /api/techpacks/stats - Get tech pack statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await techpackService.getTechPackStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET /api/techpacks/:id - Get tech pack by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const techPack = await techpackService.getTechPackById(id);

    if (!techPack) {
      return res.status(404).json({
        success: false,
        message: 'TechPack not found'
      });
    }

    res.json({
      success: true,
      data: techPack
    });
  } catch (error) {
    console.error('Error fetching tech pack:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tech pack',
      error: error.message
    });
  }
});

// POST /api/techpacks - Create new tech pack
router.post('/', 
  validateRequest(techPackSchema),
  authorize('designer', 'admin'),
  async (req, res) => {
    try {
      const techPackData = req.body;
      const userId = req.user.id;

      const newTechPack = await techpackService.createTechPack(techPackData, userId);

      // Invalidate cache
      await stateService.invalidateTechPackState(newTechPack.id);

      res.status(201).json({
        success: true,
        data: newTechPack,
        message: 'TechPack created successfully'
      });
    } catch (error) {
      console.error('Error creating tech pack:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create tech pack',
        error: error.message
      });
    }
  }
);

// PUT /api/techpacks/:id - Update tech pack
router.put('/:id',
  authorize('designer', 'admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id;

      const updatedTechPack = await techpackService.updateTechPack(id, updateData, userId);

      if (!updatedTechPack) {
        return res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
      }

      // Invalidate cache
      await stateService.invalidateTechPackState(id);

      res.json({
        success: true,
        data: updatedTechPack,
        message: 'TechPack updated successfully'
      });
    } catch (error) {
      console.error('Error updating tech pack:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update tech pack',
        error: error.message
      });
    }
  }
);

// DELETE /api/techpacks/:id - Delete tech pack (soft delete)
router.delete('/:id',
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deleted = await techpackService.deleteTechPack(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
      }

      // Invalidate cache
      await stateService.invalidateTechPackState(id);

      res.json({
        success: true,
        message: 'TechPack deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tech pack:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete tech pack',
        error: error.message
      });
    }
  }
);

// GET /api/techpacks/:id/validate - Validate tech pack data
router.get('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = await validationService.validateTechPackData(id);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating tech pack:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate tech pack',
      error: error.message
    });
  }
});

// POST /api/techpacks/:id/validate/:ruleType - Validate specific business rules
router.post('/:id/validate/:ruleType', async (req, res) => {
  try {
    const { id, ruleType } = req.params;
    const validation = await validationService.validateBusinessRules(id, ruleType);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating business rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate business rules',
      error: error.message
    });
  }
});

// GET /api/techpacks/:id/state - Get tech pack state
router.get('/:id/state', async (req, res) => {
  try {
    const { id } = req.params;
    const state = await stateService.getTechPackState(id);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'TechPack state not found'
      });
    }

    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error fetching tech pack state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tech pack state',
      error: error.message
    });
  }
});

// PUT /api/techpacks/:id/state - Update tech pack state
router.put('/:id/state', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const updatedState = await stateService.updateTechPackState(id, {
      ...updates,
      updated_by: userId
    });

    res.json({
      success: true,
      data: updatedState,
      message: 'TechPack state updated successfully'
    });
  } catch (error) {
    console.error('Error updating tech pack state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tech pack state',
      error: error.message
    });
  }
});

// POST /api/techpacks/:id/optimistic-update - Perform optimistic update
router.post('/:id/optimistic-update', async (req, res) => {
  try {
    const { id } = req.params;
    const { module, updateData, operation } = req.body;

    const result = await stateService.performOptimisticUpdate(
      id, 
      module, 
      updateData, 
      operation
    );

    res.json({
      success: true,
      data: result.data,
      message: 'Optimistic update performed successfully'
    });
  } catch (error) {
    console.error('Error performing optimistic update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform optimistic update',
      error: error.message
    });
  }
});

// GET /api/techpacks/:id/consistency - Check state consistency
router.get('/:id/consistency', async (req, res) => {
  try {
    const { id } = req.params;
    const consistency = await stateService.validateStateConsistency(id);

    res.json({
      success: true,
      data: consistency
    });
  } catch (error) {
    console.error('Error checking consistency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check consistency',
      error: error.message
    });
  }
});

module.exports = router;
