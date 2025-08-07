import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { generateCompletion, createConversationChain } from '../services/langchain.js';
import { query, transaction } from '../services/database.js';
import { cacheGet, cacheSet } from '../services/redis.js';
import { ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(10000),
  conversationId: Joi.string().uuid().optional(),
  provider: Joi.string().valid('openai', 'anthropic', 'huggingface').default('openai'),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().min(1).max(4096).optional(),
  stream: Joi.boolean().default(false)
});

router.post('/', async (req, res, next) => {
  try {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { message, conversationId, provider, temperature, maxTokens, stream } = value;
    const userId = req.user.id;

    let convId = conversationId;
    if (!convId) {
      const result = await query(
        'INSERT INTO conversations (user_id, title, model) VALUES ($1, $2, $3) RETURNING id',
        [userId, message.substring(0, 100), provider]
      );
      convId = result.rows[0].id;
    }

    await query(
      'INSERT INTO messages (conversation_id, role, content, model) VALUES ($1, $2, $3, $4)',
      [convId, 'user', message, provider]
    );

    const cacheKey = `chat:${convId}:${message}`;
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      logger.info('Returning cached response');
      return res.json({
        conversationId: convId,
        response: cached.response,
        cached: true
      });
    }

    const response = await generateCompletion(message, {
      provider,
      temperature,
      maxTokens,
      stream: false
    });

    await query(
      'INSERT INTO messages (conversation_id, role, content, model) VALUES ($1, $2, $3, $4)',
      [convId, 'assistant', response, provider]
    );

    await cacheSet(cacheKey, { response }, 3600);

    res.json({
      conversationId: convId,
      response,
      provider,
      cached: false
    });

  } catch (error) {
    next(error);
  }
});

router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(
      `SELECT id, title, model, created_at, updated_at 
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      conversations: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (conversation.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    res.json({
      conversation: conversation.rows[0],
      messages: messages.rows
    });

  } catch (error) {
    next(error);
  }
});

router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ 
      message: 'Conversation deleted successfully',
      conversationId: result.rows[0].id 
    });

  } catch (error) {
    next(error);
  }
});

export default router;