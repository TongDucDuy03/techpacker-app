import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { cacheService, CacheKeys, CacheTTL } from '../services/cache.service';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: AuthRequest) => string;
  condition?: (req: AuthRequest) => boolean;
  invalidatePatterns?: string[] | ((req: AuthRequest) => string[]);
}

/**
 * Middleware factory for caching responses
 */
export const createCacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = CacheTTL.MEDIUM,
    keyGenerator,
    condition = () => true,
    invalidatePatterns = []
  } = options;

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching if condition is not met
    if (!condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultCacheKey(req);

    try {
      // Try to get from cache for GET requests
      if (req.method === 'GET') {
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData) {
          res.json(cachedData);
          return;
        }
      }

      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(body: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300 && req.method === 'GET') {
          setImmediate(async () => {
            try {
              await cacheService.set(cacheKey, body, ttl);
            } catch (error) {
              console.error('Cache set error:', error);
            }
          });
        }

        // Invalidate cache patterns for write operations
        if (res.statusCode >= 200 && res.statusCode < 300 && 
            ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          setImmediate(async () => {
            try {
              const patternsToInvalidate = typeof invalidatePatterns === 'function'
                ? invalidatePatterns(req)
                : invalidatePatterns;

              if (patternsToInvalidate && patternsToInvalidate.length > 0) {
                for (const pattern of patternsToInvalidate) {
                  await cacheService.delPattern(pattern);
                }
              }
            } catch (error) {
              console.error('Cache invalidation error:', error);
            }
          });
        }

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Generate default cache key based on request
 */
function generateDefaultCacheKey(req: AuthRequest): string {
  const { method, originalUrl, user } = req;
  const queryString = JSON.stringify(req.query);
  const userId = user?._id?.toString() || 'anonymous';
  
  const keyData = `${method}:${originalUrl}:${queryString}:${userId}`;
  return crypto.createHash('md5').update(keyData).digest('hex');
}

/**
 * Pre-configured cache middleware for common routes
 */
export const cacheMiddleware = {
  // TechPack caching
  techpackList: createCacheMiddleware({
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => {
      const queryHash = crypto.createHash('md5')
        .update(JSON.stringify(req.query))
        .digest('hex');
      const userId = req.user?._id?.toString() || 'anonymous';
      return CacheKeys.techpackList(`${userId}:${queryHash}`);
    },
    condition: (req) => req.method === 'GET',
    invalidatePatterns: [CacheKeys.allTechpacks()]
  }),

  techpackDetail: createCacheMiddleware({
    ttl: CacheTTL.LONG,
    keyGenerator: (req) => CacheKeys.techpack(req.params.id),
    condition: (req) => req.method === 'GET',
    invalidatePatterns: (req) => [CacheKeys.techpackPattern(req.params.id || '')]
  }),

  // User profile caching
  userProfile: createCacheMiddleware({
    ttl: CacheTTL.LONG,
    keyGenerator: (req) => CacheKeys.userProfile(req.user!._id.toString()),
    condition: (req) => req.method === 'GET' && !!req.user
  }),

  // Revision history caching
  revisionHistory: createCacheMiddleware({
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => {
      const queryHash = crypto.createHash('md5')
        .update(JSON.stringify(req.query))
        .digest('hex');
      return `${CacheKeys.revisions(req.params.id)}:${queryHash}`;
    },
    condition: (req) => req.method === 'GET'
  }),

  // PDF info caching
  pdfInfo: createCacheMiddleware({
    ttl: CacheTTL.SHORT,
    keyGenerator: (req) => CacheKeys.pdfInfo(req.params.id),
    condition: (req) => req.method === 'GET'
  }),

  // Activity logs caching
  activities: createCacheMiddleware({
    ttl: CacheTTL.SHORT,
    keyGenerator: (req) => {
      const page = req.query.page || 1;
      const userId = req.user!._id.toString();
      return CacheKeys.activities(userId, Number(page));
    },
    condition: (req) => req.method === 'GET' && !!req.user
  })
};

/**
 * Cache invalidation middleware
 */
export const createCacheInvalidationMiddleware = (patterns: string[] | ((req: AuthRequest) => string[])) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Invalidate cache on successful write operations
      if (res.statusCode >= 200 && res.statusCode < 300 && 
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        setImmediate(async () => {
          try {
            const invalidationPatterns = typeof patterns === 'function' ? patterns(req) : patterns;
            
            for (const pattern of invalidationPatterns) {
              await cacheService.delPattern(pattern);
            }
          } catch (error) {
            console.error('Cache invalidation error:', error);
          }
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Cache warming utilities
 */
export const cacheWarming = {
  /**
   * Warm up TechPack cache
   */
  async warmTechPackCache(techpackId: string, techpackData: any): Promise<void> {
    try {
      const cacheKey = CacheKeys.techpack(techpackId);
      await cacheService.set(cacheKey, techpackData, CacheTTL.LONG);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  },

  /**
   * Warm up user profile cache
   */
  async warmUserProfileCache(userId: string, userData: any): Promise<void> {
    try {
      const cacheKey = CacheKeys.userProfile(userId);
      await cacheService.set(cacheKey, userData, CacheTTL.LONG);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }
};

/**
 * Cache statistics middleware
 */
export const cacheStatsMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const startTime = Date.now();
  
  const originalJson = res.json;
  res.json = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Add cache headers
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    // Add cache status if available
    if (res.locals.cacheHit) {
      res.setHeader('X-Cache', 'HIT');
    } else if (res.locals.cacheHit === false) {
      res.setHeader('X-Cache', 'MISS');
    }

    return originalJson.call(this, body);
  };

  next();
};

export default {
  createCacheMiddleware,
  cacheMiddleware,
  createCacheInvalidationMiddleware,
  cacheWarming,
  cacheStatsMiddleware
};
