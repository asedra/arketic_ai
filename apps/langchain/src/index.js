import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import winston from 'winston';
import { createServer } from 'http';
import config from './config/config.js';
import DatabaseService from './services/databaseService.js';
import RedisService from './services/redisService.js';
import { setupWebSocket } from './websocket/socketServer.js';
import chatRoutes from './routes/chatRoutes.js';
import documentsRoutes from './routes/documents.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';

dotenv.config();

const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json' 
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => 
          `${timestamp} [${level}]: ${stack || message}`
        )
      ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.app.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// API routes
app.use('/', chatRoutes);
app.use('/api/documents', documentsRoutes);

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await DatabaseService.checkHealth();
    const redisHealth = await RedisService.checkHealth();
    
    const overallHealth = dbHealth.status === 'healthy' && redisHealth.status === 'healthy';
    
    const healthStatus = {
      status: overallHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth
      },
      uptime: process.uptime(),
      memory: {
        usage: process.memoryUsage(),
        free: Math.round(process.memoryUsage().free / 1024 / 1024),
        total: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    };
    
    res.status(overallHealth ? 200 : 503).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/database', async (req, res) => {
  try {
    const health = await DatabaseService.checkHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/health/redis', async (req, res) => {
  try {
    const health = await RedisService.checkHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'Arketic LangChain Microservice',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health - Overall health check',
      'GET /health/database - Database health check', 
      'GET /health/redis - Redis health check',
      'POST /api/chat/message - Process chat message',
      'GET /api/chat/:chatId/history - Get chat history',
      'POST /api/provider/test - Test provider connection',
      'DELETE /api/chat/:chatId/clear - Clear conversation',
      'GET /api/chat/:chatId/summary - Get conversation summary',
      'POST /api/documents/process - Process single document',
      'POST /api/documents/process-batch - Process multiple documents',
      'GET /api/documents/status/:jobId - Check processing status',
      'GET /api/documents/chunks/:documentId - Get document chunks',
      'POST /api/documents/validate - Validate document',
      'GET /api/documents/metrics - Get processing metrics',
      'GET /metrics - Service metrics'
    ]
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

let ioServer = null;

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close WebSocket connections first
    if (ioServer && ioServer.gracefulShutdown) {
      await ioServer.gracefulShutdown();
    }
    
    await DatabaseService.disconnect();
    await RedisService.disconnect();
    logger.info('All connections closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

async function startServer() {
  try {
    logger.info('Starting Arketic LangChain Microservice...');
    
    logger.info('Connecting to database...');
    await DatabaseService.connect();
    
    logger.info('Connecting to Redis...');
    await RedisService.connect();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Setup WebSocket server
    logger.info('Initializing WebSocket server...');
    ioServer = setupWebSocket(httpServer);
    
    // Add WebSocket stats endpoint
    app.get('/ws/stats', (req, res) => {
      try {
        const stats = ioServer.getStats();
        res.json({
          websocket: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error getting WebSocket stats:', error);
        res.status(500).json({
          error: 'Failed to get WebSocket statistics',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    const server = httpServer.listen(config.app.port, () => {
      logger.info(`🚀 Server running on port ${config.app.port}`);
      logger.info(`📊 Environment: ${config.app.env}`);
      logger.info(`🔗 Health check: http://localhost:${config.app.port}/health`);
      logger.info(`📡 WebSocket server initialized`);
      logger.info(`📈 WebSocket stats: http://localhost:${config.app.port}/ws/stats`);
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };