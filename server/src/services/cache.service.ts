import Redis from 'ioredis';
import { config } from '../config/config';

export class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean;
  private connectionAttempted: boolean = false;

  constructor() {
    // Check if Redis is enabled via environment variable
    this.isEnabled = process.env.REDIS_ENABLED !== 'false';
    
    if (!this.isEnabled) {
      console.log('Redis caching is disabled (REDIS_ENABLED=false)');
      return;
    }

    try {
      this.redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => {
          // Stop retrying after 3 attempts
          if (times > 3) {
            console.warn('Redis connection failed after 3 attempts. Caching will be disabled.');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        enableOfflineQueue: false // Don't queue commands when disconnected
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        // Only log error once, not on every retry
        if (!this.connectionAttempted) {
          console.warn('⚠️  Redis connection error. Caching will be disabled. Error:', error.message);
          this.connectionAttempted = true;
        }
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        if (this.isConnected) {
          console.log('Redis connection closed');
        }
        this.isConnected = false;
      });
    } catch (error) {
      console.warn('⚠️  Failed to initialize Redis. Caching will be disabled.');
      this.redis = null;
      this.isEnabled = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          // Connection failed, disable Redis
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return null;
      }

      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      // Silently fail - caching is optional
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return -1;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return -1;
      }

      return await this.redis.ttl(key);
    } catch (error) {
      // Silently fail - caching is optional
      return -1;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return 0;
      }

      const value = await this.redis.incr(key);
      
      if (ttlSeconds && value === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      
      return value;
    } catch (error) {
      // Silently fail - caching is optional
      return 0;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: { [key: string]: any }, ttlSeconds: number = 3600): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pipeline.setex(key, ttlSeconds, JSON.stringify(value));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isEnabled || !this.redis) {
      return keys.map(() => null);
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return keys.map(() => null);
      }

      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      // Silently fail - caching is optional
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
    // If Redis is not enabled, just fetch the data
    if (!this.isEnabled || !this.redis) {
      return await fetchFunction();
    }

    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch data
      const data = await fetchFunction();
      
      // Store in cache (may fail silently)
      await this.set(key, data, ttlSeconds);
      
      return data;
    } catch (error) {
      // If cache fails, still return the fetched data
      return await fetchFunction();
    }
  }

  /**
   * Flush all cache
   */
  async flushAll(): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return false;
      }

      await this.redis.flushall();
      return true;
    } catch (error) {
      // Silently fail - caching is optional
      return false;
    }
  }

  /**
   * Get cache info
   */
  async getInfo(): Promise<any> {
    if (!this.isEnabled || !this.redis) {
      return {
        enabled: false,
        connected: false,
        message: 'Redis caching is disabled'
      };
    }

    try {
      if (!this.isConnected && this.redis) {
        await this.redis.connect().catch(() => {
          this.isEnabled = false;
        });
      }

      if (!this.isConnected || !this.redis) {
        return {
          enabled: true,
          connected: false,
          message: 'Redis is not connected'
        };
      }

      const info = await this.redis.info();
      const keyCount = await this.redis.dbsize();
      
      return {
        enabled: true,
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
      return {
        enabled: true,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.quit();
      this.isConnected = false;
    } catch (error) {
      // Silently fail
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
