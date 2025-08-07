import express from 'express';
import ChatService from '../services/chatService.js';
import { authMiddleware, internalServiceAuth } from '../middleware/auth.js';
import { query } from '../services/database.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import winston from 'winston';
import Joi from 'joi';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Request validation schemas
const messageSchema = Joi.object({
  chatId: Joi.string().uuid().required(),
  message: Joi.string().required().min(1).max(10000),
  settings: Joi.object({
    provider: Joi.string().valid('openai', 'anthropic').default('openai'),
    model: Joi.string().default('gpt-3.5-turbo'),
    temperature: Joi.number().min(0).max(2).default(0.7),
    maxTokens: Joi.number().min(1).max(4096).default(2048),
    systemPrompt: Joi.string().max(1000).optional(),
    streaming: Joi.boolean().default(false)
  }).default({})
});

const providerTestSchema = Joi.object({
  provider: Joi.string().valid('openai', 'anthropic').required(),
  apiKey: Joi.string().required(),
  model: Joi.string().default('gpt-3.5-turbo')
});

// Helper function to get API key
async function getApiKeyForUser(userId, provider = 'openai') {
  try {
    const result = await query(
      'SELECT api_key FROM user_api_keys WHERE user_id = $1 AND provider = $2',
      [userId, provider]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].api_key;
    }
    
    // Fallback to environment variables
    return provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
  } catch (error) {
    logger.error('Error getting API key:', error);
    throw new Error('Failed to retrieve API key');
  }
}

// Get metrics from Redis
async function getMetricsFromRedis() {
  try {
    const metrics = await cacheGet('langchain:metrics');
    return metrics || { totalRequests: 0 };
  } catch (error) {
    logger.error('Error getting metrics from Redis:', error);
    return { totalRequests: 0 };
  }
}

// Get average response time
async function getAverageResponseTime() {
  try {
    const result = await query(`
      SELECT AVG(processing_time_ms) as avg_time 
      FROM chat_messages 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      AND processing_time_ms IS NOT NULL
    `);
    return Math.round(result.rows[0]?.avg_time || 0);
  } catch (error) {
    logger.error('Error calculating average response time:', error);
    return 0;
  }
}

// Process chat message
router.post('/api/chat/message', authMiddleware, async (req, res) => {
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { chatId, message, settings } = value;
    const userId = req.user.user_id;
    
    // Get API key from request headers or database
    const apiKey = req.headers['x-api-key'] || await getApiKeyForUser(userId, settings.provider);
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API key not found',
        code: 'API_KEY_MISSING',
        message: 'Please provide an API key either in headers (x-api-key) or configure it in your settings'
      });
    }

    // Validate API key before processing
    const validation = await ChatService.validateApiKey(apiKey);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid API key',
        code: 'API_KEY_INVALID',
        details: validation.error
      });
    }
    
    const result = await ChatService.processMessage({
      chatId,
      message,
      userId,
      apiKey,
      settings
    });
    
    // Update metrics
    try {
      const currentMetrics = await getMetricsFromRedis();
      await cacheSet('langchain:metrics', {
        ...currentMetrics,
        totalRequests: (currentMetrics.totalRequests || 0) + 1,
        lastRequest: new Date().toISOString()
      }, 3600);
    } catch (metricsError) {
      logger.warn('Failed to update metrics:', metricsError);
    }
    
    res.json({
      success: true,
      chatId,
      userMessage: result.userMessage,
      aiMessage: result.aiMessage,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
      provider: settings.provider,
      model: settings.model
    });
  } catch (error) {
    logger.error('Chat processing error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'CHAT_PROCESSING_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Get chat history
router.get('/api/chat/:chatId/history', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.user_id;
    
    if (!chatId) {
      return res.status(400).json({
        error: 'Chat ID is required',
        code: 'CHAT_ID_MISSING'
      });
    }
    
    // Verify chat belongs to user
    const chatCheck = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found or access denied',
        code: 'CHAT_NOT_FOUND'
      });
    }
    
    // Check cache first
    const cacheKey = `chat_history:${chatId}`;
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return res.json({
        chatId,
        history: cached,
        cached: true
      });
    }
    
    // Get from database
    const history = await query(
      `SELECT id, content, message_type, ai_model_used, tokens_used, 
              processing_time_ms, created_at 
       FROM chat_messages 
       WHERE chat_id = $1 
       ORDER BY created_at ASC`,
      [chatId]
    );
    
    // Cache for 5 minutes
    await cacheSet(cacheKey, history.rows, 300);
    
    res.json({
      chatId,
      history: history.rows,
      cached: false
    });
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'CHAT_HISTORY_ERROR'
    });
  }
});

// Test provider connection
router.post('/api/provider/test', authMiddleware, async (req, res) => {
  try {
    const { error, value } = providerTestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }
    
    const { provider, apiKey, model } = value;
    
    const llm = ChatService.createLLM(apiKey, { 
      model, 
      maxTokens: 5,
      temperature: 0 
    });
    
    const testMessage = "Test connection - respond with 'OK'";
    const response = await llm.invoke(testMessage);
    
    res.json({ 
      success: true, 
      provider, 
      model,
      testMessage,
      response: response.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Provider test error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message,
      code: 'PROVIDER_TEST_FAILED'
    });
  }
});

// Clear conversation
router.delete('/api/chat/:chatId/clear', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.user_id;
    
    // Verify chat belongs to user
    const chatCheck = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found or access denied',
        code: 'CHAT_NOT_FOUND'
      });
    }
    
    await ChatService.clearConversation(chatId);
    
    res.json({
      success: true,
      chatId,
      message: 'Conversation cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing conversation:', error);
    res.status(500).json({
      error: error.message,
      code: 'CLEAR_CONVERSATION_ERROR'
    });
  }
});

// Get conversation summary
router.get('/api/chat/:chatId/summary', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.user_id;
    
    // Verify chat belongs to user
    const chatCheck = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );
    
    if (chatCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found or access denied',
        code: 'CHAT_NOT_FOUND'
      });
    }
    
    const summary = await ChatService.getConversationSummary(chatId);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Error getting conversation summary:', error);
    res.status(500).json({
      error: error.message,
      code: 'SUMMARY_ERROR'
    });
  }
});

// Auth test endpoint
router.get('/api/auth-test', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'langchain-chat',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    endpoints: [
      'POST /api/chat/message - Process chat message',
      'GET /api/chat/:chatId/history - Get chat history', 
      'POST /api/provider/test - Test provider connection',
      'DELETE /api/chat/:chatId/clear - Clear conversation',
      'GET /api/chat/:chatId/summary - Get conversation summary',
      'GET /health - Health check',
      'GET /metrics - Service metrics'
    ]
  });
});

// Metrics endpoint
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = {
      activeChains: ChatService.chains?.size || 0,
      totalRequests: (await getMetricsFromRedis()).totalRequests || 0,
      averageResponseTime: await getAverageResponseTime(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      chatServiceHealth: await ChatService.getChainHealth()
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      code: 'METRICS_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Internal chat message endpoint (for service-to-service communication)
router.post('/internal/chat/message', internalServiceAuth, async (req, res) => {
  try {
    const { error, value } = messageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
        code: 'VALIDATION_ERROR'
      });
    }

    const { chatId, message, settings } = value;
    const userId = req.headers['x-user-id'] || null;
    
    // Get API key from request headers
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API key not found',
        code: 'API_KEY_MISSING',
        message: 'Please provide an API key in x-api-key header'
      });
    }

    const result = await ChatService.processMessage({
      chatId,
      message,
      userId,
      apiKey,
      settings
    });
    
    res.json({
      success: true,
      chatId,
      userMessage: result.userMessage,
      aiMessage: result.aiMessage,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
      provider: settings.provider,
      model: settings.model
    });
  } catch (error) {
    logger.error('Internal chat processing error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'INTERNAL_CHAT_PROCESSING_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Internal health check (no auth required)
router.get('/internal/health', internalServiceAuth, async (req, res) => {
  try {
    const health = await ChatService.getChainHealth();
    res.json({
      status: health.status,
      service: 'langchain-chat-internal',
      details: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Internal health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;