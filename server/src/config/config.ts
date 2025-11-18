import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  dbProvider: (process.env.DB_PROVIDER as 'mongodb' | 'postgresql') || 'mongodb',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/techpacker',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/techpacker?schema=public',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'your-super-secret-refresh-token-key',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  twoFactorEnabled: process.env.ENABLE_TWO_FACTOR !== 'false',

  // Redis (for caching)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS - Support multiple origins
  corsOrigin: process.env.CORS_ORIGIN ?
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) :
    ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  uploadPath: process.env.UPLOAD_PATH || './uploads',

  // PDF Generation
  pdfTimeout: parseInt(process.env.PDF_TIMEOUT || '30000', 10),
  pdfConcurrentLimit: parseInt(process.env.PDF_CONCURRENT_LIMIT || '5', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Email (for 2FA and notifications)
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER || 'garmentibc@gmail.com',
  emailPass: process.env.EMAIL_PASS || 'vnfq nken fpsm bfxy',

  // Pagination defaults
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10)
};

export default config;
