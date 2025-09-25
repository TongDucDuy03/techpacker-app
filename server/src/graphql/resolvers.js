const { techpackService } = require('../services/techpackService');
const { validationService } = require('../services/validationService');
const { stateService } = require('../services/stateService');

const resolvers = {
  Query: {
    // Get all tech packs with filtering
    techPacks: async (_, { filters = {} }, { user }) => {
      try {
        const options = {
          page: filters.page || 1,
          limit: filters.limit || 20,
          status: filters.status,
          category: filters.category,
          brand: filters.brand,
          season: filters.season,
          search: filters.search,
          sortBy: filters.sortBy || 'last_modified',
          sortOrder: filters.sortOrder || 'DESC'
        };

        const techPacks = await techpackService.getAllTechPacks(options);
        const stats = await techpackService.getTechPackStats();
        const totalPages = Math.ceil(stats.total_techpacks / options.limit);

        return {
          success: true,
          data: techPacks,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: stats.total_techpacks,
            totalPages
          },
          stats
        };
      } catch (error) {
        throw new Error(`Failed to fetch tech packs: ${error.message}`);
      }
    },

    // Get tech pack by ID
    techPack: async (_, { id }, { user }) => {
      try {
        const techPack = await techpackService.getTechPackById(id);
        
        if (!techPack) {
          return {
            success: false,
            data: null,
            message: 'TechPack not found'
          };
        }

        return {
          success: true,
          data: techPack
        };
      } catch (error) {
        throw new Error(`Failed to fetch tech pack: ${error.message}`);
      }
    },

    // Get tech pack statistics
    techPackStats: async (_, __, { user }) => {
      try {
        return await techpackService.getTechPackStats();
      } catch (error) {
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }
    },

    // Get tech pack state
    techPackState: async (_, { id }, { user }) => {
      try {
        const state = await stateService.getTechPackState(id);
        
        if (!state) {
          return {
            success: false,
            data: null,
            message: 'TechPack state not found'
          };
        }

        return {
          success: true,
          data: state
        };
      } catch (error) {
        throw new Error(`Failed to fetch tech pack state: ${error.message}`);
      }
    },

    // Validate tech pack
    validateTechPack: async (_, { id }, { user }) => {
      try {
        const validation = await validationService.validateTechPackData(id);
        
        return {
          success: true,
          data: validation
        };
      } catch (error) {
        throw new Error(`Failed to validate tech pack: ${error.message}`);
      }
    },

    // Validate business rules
    validateBusinessRules: async (_, { id, ruleType }, { user }) => {
      try {
        const validation = await validationService.validateBusinessRules(id, ruleType);
        
        return {
          success: true,
          data: validation
        };
      } catch (error) {
        throw new Error(`Failed to validate business rules: ${error.message}`);
      }
    },

    // Check consistency
    checkConsistency: async (_, { id }, { user }) => {
      try {
        const consistency = await stateService.validateStateConsistency(id);
        
        return {
          success: true,
          data: consistency
        };
      } catch (error) {
        throw new Error(`Failed to check consistency: ${error.message}`);
      }
    }
  },

  Mutation: {
    // Create tech pack
    createTechPack: async (_, { input }, { user }) => {
      try {
        const techPackData = {
          ...input,
          created_by: user.id,
          updated_by: user.id
        };

        const newTechPack = await techpackService.createTechPack(techPackData, user.id);
        
        // Invalidate cache
        await stateService.invalidateTechPackState(newTechPack.id);

        return {
          success: true,
          data: newTechPack,
          message: 'TechPack created successfully'
        };
      } catch (error) {
        throw new Error(`Failed to create tech pack: ${error.message}`);
      }
    },

    // Update tech pack
    updateTechPack: async (_, { id, input }, { user }) => {
      try {
        const updateData = {
          ...input,
          updated_by: user.id
        };

        const updatedTechPack = await techpackService.updateTechPack(id, updateData, user.id);

        if (!updatedTechPack) {
          return {
            success: false,
            data: null,
            message: 'TechPack not found'
          };
        }

        // Invalidate cache
        await stateService.invalidateTechPackState(id);

        return {
          success: true,
          data: updatedTechPack,
          message: 'TechPack updated successfully'
        };
      } catch (error) {
        throw new Error(`Failed to update tech pack: ${error.message}`);
      }
    },

    // Delete tech pack
    deleteTechPack: async (_, { id }, { user }) => {
      try {
        const deleted = await techpackService.deleteTechPack(id, user.id);

        if (!deleted) {
          return {
            success: false,
            data: null,
            message: 'TechPack not found'
          };
        }

        // Invalidate cache
        await stateService.invalidateTechPackState(id);

        return {
          success: true,
          data: null,
          message: 'TechPack deleted successfully'
        };
      } catch (error) {
        throw new Error(`Failed to delete tech pack: ${error.message}`);
      }
    },

    // Update tech pack state
    updateTechPackState: async (_, { id, updates }, { user }) => {
      try {
        const updatedState = await stateService.updateTechPackState(id, {
          ...updates,
          updated_by: user.id
        });

        return {
          success: true,
          data: updatedState,
          message: 'TechPack state updated successfully'
        };
      } catch (error) {
        throw new Error(`Failed to update tech pack state: ${error.message}`);
      }
    },

    // Perform optimistic update
    performOptimisticUpdate: async (_, { id, input }, { user }) => {
      try {
        const { module, updateData, operation } = input;
        
        const result = await stateService.performOptimisticUpdate(
          id, 
          module, 
          updateData, 
          operation
        );

        return {
          success: true,
          data: result.data,
          message: 'Optimistic update performed successfully'
        };
      } catch (error) {
        throw new Error(`Failed to perform optimistic update: ${error.message}`);
      }
    },

    // Validate tech pack data
    validateTechPackData: async (_, { id }, { user }) => {
      try {
        const validation = await validationService.validateTechPackData(id);
        
        return {
          success: true,
          data: validation
        };
      } catch (error) {
        throw new Error(`Failed to validate tech pack data: ${error.message}`);
      }
    }
  },

  Subscription: {
    // Tech pack updated subscription
    techPackUpdated: {
      subscribe: (_, { id }, { pubsub }) => {
        return pubsub.asyncIterator(`TECHPACK_UPDATED_${id}`);
      }
    },

    // Tech pack state changed subscription
    techPackStateChanged: {
      subscribe: (_, { id }, { pubsub }) => {
        return pubsub.asyncIterator(`TECHPACK_STATE_CHANGED_${id}`);
      }
    },

    // Validation completed subscription
    validationCompleted: {
      subscribe: (_, { id }, { pubsub }) => {
        return pubsub.asyncIterator(`VALIDATION_COMPLETED_${id}`);
      }
    }
  },

  // Custom scalar resolvers
  Date: {
    serialize: (date) => date.toISOString(),
    parseValue: (value) => new Date(value),
    parseLiteral: (ast) => new Date(ast.value)
  },

  JSON: {
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
      switch (ast.kind) {
        case 'StringValue':
        case 'BooleanValue':
          return ast.value;
        case 'IntValue':
        case 'FloatValue':
          return parseFloat(ast.value);
        case 'ObjectValue':
          return ast.fields.reduce((obj, field) => {
            obj[field.name.value] = field.value;
            return obj;
          }, {});
        case 'ListValue':
          return ast.values.map(value => value.value);
        default:
          return null;
      }
    }
  }
};

module.exports = resolvers;
