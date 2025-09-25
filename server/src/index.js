const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import configurations and services
const { connectDatabases, checkDatabaseHealth, closeDatabases } = require('./config/database');
const { securityHeaders, corsOptions, requestLogger, errorHandler, apiLimits } = require('./middleware/security');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

// Import routes
const techpackRoutes = require('./routes/techpackRoutes');

const PORT = process.env.PORT || 4000;
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: corsOptions
});

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechPacker API',
      version: '1.0.0',
      description: 'Comprehensive TechPack Management API with real-time updates and validation',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/graphql/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      databases: dbHealth,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API Routes with rate limiting
app.use('/api/techpacks', apiLimits.general, techpackRoutes);

// Additional API routes can be added here
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'TechPacker API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Apollo Server setup
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Extract user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      } catch (error) {
        // Invalid token, user remains null
      }
    }
    
    return { user, pubsub: io };
  },
  introspection: true,
  playground: true,
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join techpack-specific rooms
  socket.on('join-techpack', (techPackId) => {
    socket.join(`techpack-${techPackId}`);
    console.log(`Client ${socket.id} joined techpack ${techPackId}`);
  });
  
  // Leave techpack rooms
  socket.on('leave-techpack', (techPackId) => {
    socket.leave(`techpack-${techPackId}`);
    console.log(`Client ${socket.id} left techpack ${techPackId}`);
  });
  
  // Handle real-time updates
  socket.on('techpack-update', async (data) => {
    const { techPackId, module, updateData } = data;
    
    // Broadcast to all clients in the techpack room
    socket.to(`techpack-${techPackId}`).emit('techpack-updated', {
      techPackId,
      module,
      updateData,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

async function start() {
  try {
    // Connect to databases
    await connectDatabases();
    console.log('✅ All databases connected successfully');

    // Start Apollo Server
    await apolloServer.start();
    apolloServer.applyMiddleware({ app, path: '/graphql' });
    console.log('✅ GraphQL server started at /graphql');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 TechPacker API Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🔍 GraphQL Playground available at http://localhost:${PORT}/graphql`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
    });
    
    // Close database connections
    await closeDatabases();
    console.log('✅ Database connections closed');
    
    // Close Apollo Server
    await apolloServer.stop();
    console.log('✅ Apollo Server stopped');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start the server
start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});


