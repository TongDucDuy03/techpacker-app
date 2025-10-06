import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/techpacker',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Redis (for caching)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

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

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  
  // Email (for future notifications)
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',

  // Pagination defaults
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10)
};

export default config;
