import { cacheService, CacheKeys } from '../services/cache.service';

/**
 * Utility class để quản lý cache invalidation một cách hiệu quả
 */
export class CacheInvalidationUtil {
  
  /**
   * Invalidate cache cho TechPack khi có updates
   */
  static async invalidateTechPackCache(techPackId: string): Promise<void> {
    try {
      await Promise.all([
        // Xóa cache của TechPack cụ thể
        cacheService.del(CacheKeys.techpack(techPackId)),
        
        // Xóa tất cả cache patterns liên quan đến TechPack này
        cacheService.delPattern(CacheKeys.techpackPattern(techPackId)),
        
        // Xóa cache của revisions
        cacheService.del(CacheKeys.revisions(techPackId)),
        
        // Xóa cache của PDF info
        cacheService.del(CacheKeys.pdfInfo(techPackId)),
        
        // Xóa tất cả list caches (vì list có thể thay đổi)
        cacheService.delPattern('techpack:list:*')
      ]);
    } catch (error) {
      console.error('Cache invalidation error for TechPack:', error);
    }
  }

  /**
   * Invalidate cache cho revisions của TechPack
   */
  static async invalidateRevisions(techPackId: string): Promise<void> {
    try {
      await Promise.all([
        cacheService.del(CacheKeys.revisions(techPackId)),
        cacheService.del(CacheKeys.techpack(techPackId)),
        cacheService.delPattern(CacheKeys.techpackPattern(techPackId)),
        cacheService.delPattern('techpack:list:*')
      ]);
    } catch (error) {
      console.error('Cache invalidation error for revisions:', error);
    }
  }

  /**
   * Invalidate cache cho User khi có updates
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        // Xóa cache của User cụ thể
        cacheService.del(CacheKeys.user(userId)),
        cacheService.del(CacheKeys.userProfile(userId)),
        
        // Xóa tất cả cache patterns liên quan đến User này
        cacheService.delPattern(CacheKeys.userPattern(userId)),
        
        // Xóa cache activities của user
        cacheService.delPattern(`activities:${userId}:*`),
        
        // Xóa tất cả list caches có thể chứa user này
        cacheService.delPattern('techpack:list:*')
      ]);
    } catch (error) {
      console.error('Cache invalidation error for User:', error);
    }
  }

  /**
   * Invalidate cache cho sharing operations
   */
  static async invalidateSharingCache(techPackId: string, userIds: string[]): Promise<void> {
    try {
      const promises = [
        // Invalidate TechPack cache
        this.invalidateTechPackCache(techPackId)
      ];

      // Invalidate cache cho tất cả users được share
      userIds.forEach(userId => {
        promises.push(this.invalidateUserCache(userId));
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Cache invalidation error for sharing:', error);
    }
  }

  /**
   * Invalidate cache cho bulk operations
   */
  static async invalidateBulkCache(techPackIds: string[]): Promise<void> {
    try {
      const promises = techPackIds.map(id => this.invalidateTechPackCache(id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Cache invalidation error for bulk operations:', error);
    }
  }

  /**
   * Invalidate tất cả cache (sử dụng cẩn thận)
   */
  static async invalidateAllCache(): Promise<void> {
    try {
      await cacheService.flushAll();
    } catch (error) {
      console.error('Cache flush all error:', error);
    }
  }

  /**
   * Warm up cache cho TechPack thường xuyên được truy cập
   */
  static async warmUpTechPackCache(techPackId: string, techPackData: any): Promise<void> {
    try {
      await cacheService.set(CacheKeys.techpack(techPackId), techPackData, 3600); // 1 hour
    } catch (error) {
      console.error('Cache warm up error:', error);
    }
  }

  /**
   * Batch invalidation để tối ưu performance
   */
  static async batchInvalidate(operations: Array<{
    type: 'techpack' | 'user' | 'pattern';
    id?: string;
    pattern?: string;
  }>): Promise<void> {
    try {
      const promises = operations.map(op => {
        switch (op.type) {
          case 'techpack':
            return op.id ? this.invalidateTechPackCache(op.id) : Promise.resolve();
          case 'user':
            return op.id ? this.invalidateUserCache(op.id) : Promise.resolve();
          case 'pattern':
            return op.pattern ? cacheService.delPattern(op.pattern) : Promise.resolve();
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Batch cache invalidation error:', error);
    }
  }
}

export default CacheInvalidationUtil;
