const { MongoClient } = require('mongodb');
const Redis = require('redis');

// MongoDB Configuration (Primary Database)
let mongoClient;
let mongoDb;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'techpacker_app';

// Redis Configuration (Caching)
let redisClient;
const REDIS_URL = process.env.REDIS_URL; // Make optional; if undefined, use stub

function createRedisStub() {
  const store = new Map();
  return {
    async setEx(key, ttlSeconds, value) { store.set(key, value); },
    async get(key) { return store.get(key) || null; },
    async del(keys) { Array.isArray(keys) ? keys.forEach(k => store.delete(k)) : store.delete(keys); },
    async keys(pattern) {
      const regex = new RegExp('^' + pattern.replace(/[*]/g, '.*') + '$');
      return Array.from(store.keys()).filter(k => regex.test(k));
    },
    async publish(channel, message) { return 0; },
    async ping() { return 'PONG'; },
    async quit() { return; }
  };
}

// Database Connection Functions
async function connectDatabases() {
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db(DB_NAME);
    console.log('✅ Connected to MongoDB');

    // Connect to Redis (optional)
    if (REDIS_URL) {
      try {
        redisClient = Redis.createClient({ url: REDIS_URL });
        await redisClient.connect();
        console.log('✅ Connected to Redis');
      } catch (err) {
        console.warn('⚠️ Redis connection failed, using in-memory stub:', err.message);
        redisClient = createRedisStub();
      }
    } else {
      console.log('ℹ️ REDIS_URL not set, using in-memory cache stub.');
      redisClient = createRedisStub();
    }

    return { mongoDb, redisClient };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Database Health Check
async function checkDatabaseHealth() {
  const health = {
    mongodb: false,
    redis: false,
  };

  try {
    // Check MongoDB
    await mongoDb.admin().ping();
    health.mongodb = true;
  } catch (error) {
    console.error('MongoDB health check failed:', error.message);
  }

  try {
    if (redisClient && typeof redisClient.ping === 'function') {
      await redisClient.ping();
      health.redis = true;
    }
  } catch (error) {
    console.error('Redis health check failed:', error.message);
  }

  return health;
}

// Graceful Shutdown
async function closeDatabases() {
  try {
    await mongoClient.close();
    if (redisClient && typeof redisClient.quit === 'function') {
      await redisClient.quit();
    }
    console.log('✅ All database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

module.exports = {
  mongoDb,
  redisClient,
  connectDatabases,
  checkDatabaseHealth,
  closeDatabases,
};


