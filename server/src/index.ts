import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import connectDatabase from './config/database';
import { sendSuccess, sendError } from './utils/response.util';

// Routes
import authRoutes from './routes/auth.routes';
import techpackRoutes from './routes/techpack.routes';
import subdocumentRoutes from './routes/subdocument.routes';
import workflowRoutes from './routes/workflow.routes';
import pdfRoutes from './routes/pdf.routes';
import activityRoutes from './routes/activity.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import revisionRoutes from './routes/revision.routes';

// Middleware
import { setupSwagger } from './utils/swagger';

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
const normalizeOrigin = (value: string | undefined | null): string | null => {
  if (!value) return null;
  try {
    // Remove trailing slash for reliable comparison
    return value.trim().replace(/\/$/, '');
  } catch {
    return value;
  }
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const incomingOrigin = normalizeOrigin(origin);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!incomingOrigin) return callback(null, true);

    const rawAllowedOrigins = Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin];
    const allowedOrigins = rawAllowedOrigins
      .map(entry => normalizeOrigin(entry as string))
      .filter((entry): entry is string => !!entry);

    // Allow all if wildcard present
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // Exact match (after normalization)
    if (allowedOrigins.includes(incomingOrigin)) {
      return callback(null, true);
    }

    // Support simple wildcard patterns like https://*.example.com
    const wildcardMatch = allowedOrigins.some(pattern => {
      if (!pattern.includes('*')) return false;
      const regexPattern = '^' + pattern.split('*').map(seg => seg.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')).join('.*') + '$';
      try {
        const regex = new RegExp(regexPattern);
        return regex.test(incomingOrigin);
      } catch {
        return false;
      }
    });

    if (wildcardMatch) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${incomingOrigin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  handler: (_req, res) => sendError(res, 'Too many requests, please try again later.', 429, 'RATE_LIMIT_EXCEEDED'),
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



// Setup Swagger documentation
setupSwagger(app);

// API Versioning
const v1Router = express.Router();

// Static file serving for uploads
v1Router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/techpacks', techpackRoutes);
v1Router.use('/techpacks', subdocumentRoutes);
v1Router.use('/techpacks', workflowRoutes);
v1Router.use('/techpacks', pdfRoutes);
v1Router.use('/activities', activityRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/', revisionRoutes); // Revision routes

app.use('/api/v1', v1Router);

// Health check
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  }, 'TechPacker API is healthy');
});

// Root endpoint
app.get('/', (_req, res) => {
  sendSuccess(res, {
    name: 'TechPacker API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  }, 'Welcome to the TechPacker API');
});

// 404 handler
app.use('*', (_req, res) => {
  sendError(res, 'The requested endpoint does not exist', 404, 'ROUTE_NOT_FOUND');
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({ message: e.message, field: e.path }));
    return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400, 'INVALID_ID', [{ field: err.path, message: 'The provided ID is not a valid format' }]);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  const statusCode = err.status || 500;
  const message = err.message || 'An unexpected internal server error occurred';
  const code = err.code || 'INTERNAL_ERROR';

  return sendError(res, message, statusCode, code);
});

// Start server (exported for tests). When run directly, startServer will execute.
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    app.listen(config.port, '0.0.0.0', () => {
      // Server started successfully
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

// If this file is executed directly, start the server. Tests can import { app } without starting it.
if (require.main === module) {
  startServer();
}

export { app, startServer };

