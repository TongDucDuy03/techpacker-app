const { redisClient } = require('../config/database');
const { mongoDb } = require('../config/database');

class StateService {
  constructor() {
    this.cachePrefix = 'techpacker:';
    this.defaultTTL = 3600; // 1 hour
  }

  // Cache Management
  async setCache(key, data, ttl = this.defaultTTL) {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      await redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async getCache(key) {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      const data = await redisClient.get(cacheKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async deleteCache(key) {
    try {
      const cacheKey = `${this.cachePrefix}${key}`;
      await redisClient.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clearPattern(pattern) {
    try {
      const cachePattern = `${this.cachePrefix}${pattern}`;
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return false;
    }
  }

  // TechPack State Management
  async getTechPackState(techPackId) {
    const cacheKey = `techpack:${techPackId}`;
    let state = await this.getCache(cacheKey);
    
    if (!state) {
      // Load from MongoDB and cache
      const doc = await mongoDb.collection('techpacks').findOne({ id: techPackId, is_active: true });
      if (doc) {
        state = doc;
        await this.setCache(cacheKey, state, 1800);
      }
    }
    
    return state;
  }

  async updateTechPackState(techPackId, updates) {
    const cacheKey = `techpack:${techPackId}`;
    
    // Update cache
    let state = await this.getCache(cacheKey);
    if (state) {
      state = { ...state, ...updates, last_modified: new Date().toISOString() };
      await this.setCache(cacheKey, state, 1800);
    }
    
    // Clear related caches
    await this.clearPattern(`techpack:${techPackId}:*`);
    await this.clearPattern('techpacks:list:*');
    
    return state;
  }

  async invalidateTechPackState(techPackId) {
    await this.clearPattern(`techpack:${techPackId}*`);
    await this.clearPattern('techpacks:list:*');
  }

  // Module-specific State Management
  async getModuleState(techPackId, module) {
    const cacheKey = `module:${techPackId}:${module}`;
    return await this.getCache(cacheKey);
  }

  async updateModuleState(techPackId, module, data) {
    const cacheKey = `module:${techPackId}:${module}`;
    await this.setCache(cacheKey, data, 1800);
    
    // Also update the main techpack state
    await this.updateTechPackState(techPackId, {
      [`${module}_updated`]: new Date().toISOString()
    });
  }

  // Optimistic Updates
  async performOptimisticUpdate(techPackId, module, updateData, operation) {
    const moduleState = await this.getModuleState(techPackId, module);
    const originalState = JSON.parse(JSON.stringify(moduleState));
    
    try {
      // Apply optimistic update
      const updatedState = this.applyOptimisticUpdate(moduleState, updateData, operation);
      await this.updateModuleState(techPackId, module, updatedState);
      
      return {
        success: true,
        data: updatedState,
        rollback: () => this.updateModuleState(techPackId, module, originalState)
      };
    } catch (error) {
      // Rollback on error
      await this.updateModuleState(techPackId, module, originalState);
      throw error;
    }
  }

  applyOptimisticUpdate(state, updateData, operation) {
    if (!state) return updateData;
    
    switch (operation) {
      case 'create':
        return Array.isArray(state) ? [...state, updateData] : { ...state, ...updateData };
      case 'update':
        if (Array.isArray(state)) {
          return state.map(item => 
            item.id === updateData.id ? { ...item, ...updateData } : item
          );
        }
        return { ...state, ...updateData };
      case 'delete':
        if (Array.isArray(state)) {
          return state.filter(item => item.id !== updateData.id);
        }
        return { ...state, [updateData.id]: undefined };
      default:
        return state;
    }
  }

  // Real-time State Synchronization
  async broadcastStateChange(techPackId, module, changeType, data) {
    // This would typically use WebSocket or Server-Sent Events
    // For now, we'll use Redis pub/sub
    const channel = `techpack:${techPackId}:${module}`;
    const message = {
      type: changeType,
      data,
      timestamp: new Date().toISOString()
    };
    
    try {
      await redisClient.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Broadcast error:', error);
      return false;
    }
  }

  // Offline Capability
  async getOfflineData(userId) {
    const cacheKey = `offline:${userId}`;
    return await this.getCache(cacheKey);
  }

  async saveOfflineData(userId, data) {
    const cacheKey = `offline:${userId}`;
    await this.setCache(cacheKey, data, 86400); // 24 hours
  }

  async syncOfflineData(userId) {
    const offlineData = await this.getOfflineData(userId);
    if (!offlineData) return { success: true, synced: 0 };
    
    let synced = 0;
    const errors = [];
    
    try {
      // Sync techpack changes
      if (offlineData.techpacks) {
        for (const [techPackId, changes] of Object.entries(offlineData.techpacks)) {
          try {
            // Apply changes to database
            await this.applyOfflineChanges(techPackId, changes);
            synced++;
          } catch (error) {
            errors.push({ techPackId, error: error.message });
          }
        }
      }
      
      // Clear offline data after successful sync
      if (errors.length === 0) {
        await this.deleteCache(`offline:${userId}`);
      }
      
      return { success: errors.length === 0, synced, errors };
    } catch (error) {
      return { success: false, synced, errors: [{ general: error.message }] };
    }
  }

  async applyOfflineChanges(techPackId, changes) {
    // This would apply the offline changes to the database
    // Implementation depends on the specific change types
    console.log(`Applying offline changes for techpack ${techPackId}:`, changes);
  }

  // Performance Optimization
  async preloadTechPackData(techPackIds) {
    const promises = techPackIds.map(id => this.getTechPackState(id));
    return await Promise.all(promises);
  }

  async getTechPackListState(filters = {}) {
    const cacheKey = `techpacks:list:${JSON.stringify(filters)}`;
    let listState = await this.getCache(cacheKey);
    
    if (!listState) {
      // Load from database
      const { techpackService } = require('./techpackService');
      listState = await techpackService.getAllTechPacks(filters);
      await this.setCache(cacheKey, listState, 300); // 5 minutes
    }
    
    return listState;
  }

  // Memory Management
  async cleanupExpiredCache() {
    try {
      // Redis automatically handles TTL, but we can add custom cleanup logic here
      const pattern = `${this.cachePrefix}*`;
      const keys = await redisClient.keys(pattern);
      
      // Log cache statistics
      console.log(`Cache cleanup: ${keys.length} keys found`);
      
      return true;
    } catch (error) {
      console.error('Cache cleanup error:', error);
      return false;
    }
  }

  // State Validation
  async validateStateConsistency(techPackId) {
    const dbState = await this.getTechPackState(techPackId);
    const cacheState = await this.getCache(`techpack:${techPackId}`);
    
    if (!dbState || !cacheState) {
      return { consistent: true, message: 'No state to compare' };
    }
    
    // Compare critical fields
    const criticalFields = ['id', 'name', 'status', 'last_modified'];
    const inconsistencies = [];
    
    for (const field of criticalFields) {
      if (dbState[field] !== cacheState[field]) {
        inconsistencies.push({
          field,
          db: dbState[field],
          cache: cacheState[field]
        });
      }
    }
    
    if (inconsistencies.length > 0) {
      // Refresh cache with DB state
      await this.setCache(`techpack:${techPackId}`, dbState, 1800);
    }
    
    return {
      consistent: inconsistencies.length === 0,
      inconsistencies
    };
  }
}

module.exports = { stateService: new StateService() };
