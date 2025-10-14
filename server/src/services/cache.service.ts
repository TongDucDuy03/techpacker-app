import Redis from 'ioredis';
import { config } from '../config/config';

export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const value = await this.redis.incr(key);
      
      if (ttlSeconds && value === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      
      return value;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: { [key: string]: any }, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pipeline.setex(key, ttlSeconds, JSON.stringify(value));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Cache with automatic invalidation
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch data
      const data = await fetchFunction();
      
      // Store in cache
      await this.set(key, data, ttlSeconds);
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // If cache fails, still return the fetched data
      return await fetchFunction();
    }
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      await this.redis.flushall();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      const info = await this.redis.info();
      const keyCount = await this.redis.dbsize();
      
      return {
        connected: this.isConnected,
        keyCount,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Cache info error:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.isConnected = false;
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }
}

// Cache key generators
export const CacheKeys = {
  techpack: (id: string) => `techpack:${id}`,
  techpackList: (query: string) => `techpack:list:${query}`,
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  revisions: (techpackId: string) => `revisions:${techpackId}`,
  activities: (userId: string, page: number) => `activities:${userId}:${page}`,
  pdfInfo: (techpackId: string) => `pdf:info:${techpackId}`,
  stats: (type: string) => `stats:${type}`,
  
  // Pattern keys for bulk deletion
  techpackPattern: (id: string) => `techpack:${id}*`,
  userPattern: (id: string) => `user:${id}*`,
  allTechpacks: () => 'techpack:*',
  allUsers: () => 'user:*'
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
