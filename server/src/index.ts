import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config/config';
import connectDatabase from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import techpackRoutes from './routes/techpack.routes';
import subdocumentRoutes from './routes/subdocument.routes';
import workflowRoutes from './routes/workflow.routes';
import pdfRoutes from './routes/pdf.routes';
import activityRoutes from './routes/activity.routes';

// Middleware
import { cacheStatsMiddleware } from './middleware/cache.middleware';
import { setupSwagger } from './utils/swagger';

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Cache statistics
app.use(cacheStatsMiddleware);

// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/techpacks', techpackRoutes);
app.use('/api/techpacks', subdocumentRoutes);
app.use('/api/techpacks', workflowRoutes);
app.use('/api/techpacks', pdfRoutes);
app.use('/api/activities', activityRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'TechPacker API is healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'TechPacker API - Fashion Tech Pack Management System',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist'
    }
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: Object.values(err.errors).map((e: any) => e.message)
      }
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: {
        code: 'INVALID_ID',
        message: 'The provided ID is not valid'
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: {
        code: 'INVALID_TOKEN',
        message: 'The provided token is not valid'
      }
    });
  }

  // Default error
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' ? 'Something went wrong' : err.message
    }
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`🚀 TechPacker API running on http://localhost:${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🗄️  Database: Connected`);
      console.log(`📊 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

