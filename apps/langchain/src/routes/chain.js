import { Router } from 'express';
import Joi from 'joi';
import { createConversationChain } from '../services/langchain.js';
import { ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

const chainSchema = Joi.object({
  input: Joi.string().required(),
  chainType: Joi.string().valid('conversation', 'qa', 'summarization').default('conversation'),
  provider: Joi.string().valid('openai', 'anthropic', 'huggingface').default('openai'),
  memory: Joi.boolean().default(true)
});

const chains = new Map();

router.post('/execute', async (req, res, next) => {
  try {
    const { error, value } = chainSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { input, chainType, provider, memory } = value;
    const userId = req.user.id;
    const chainKey = `${userId}_${chainType}_${provider}`;

    let chain;
    if (memory && chains.has(chainKey)) {
      chain = chains.get(chainKey);
    } else {
      chain = await createConversationChain(provider);
      if (memory) {
        chains.set(chainKey, chain);
      }
    }

    const startTime = Date.now();
    const result = await chain.call({ input });
    const latency = Date.now() - startTime;

    res.json({
      response: result.response,
      chainType,
      provider,
      latency,
      memoryUsed: memory,
      timestamp: new Date().toISOString()
    });

    logger.info('Chain executed', {
      chainType,
      provider,
      latency,
      inputLength: input.length
    });

  } catch (error) {
    logger.error('Chain execution error:', error);
    next(error);
  }
});

router.post('/clear-memory', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chainType = 'conversation', provider = 'openai' } = req.body;
    const chainKey = `${userId}_${chainType}_${provider}`;

    if (chains.has(chainKey)) {
      const chain = chains.get(chainKey);
      if (chain.memory) {
        await chain.memory.clear();
      }
      chains.delete(chainKey);
    }

    res.json({
      message: 'Chain memory cleared successfully',
      chainType,
      provider
    });

  } catch (error) {
    logger.error('Clear memory error:', error);
    next(error);
  }
});

router.get('/memory-status', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userChains = [];

    for (const [key, chain] of chains.entries()) {
      if (key.startsWith(userId)) {
        const [, chainType, provider] = key.split('_');
        let memoryContent = null;
        
        if (chain.memory) {
          try {
            const messages = await chain.memory.chatHistory.getMessages();
            memoryContent = messages.length;
          } catch (e) {
            memoryContent = 'unknown';
          }
        }

        userChains.push({
          chainType,
          provider,
          messagesInMemory: memoryContent
        });
      }
    }

    res.json({
      activeChains: userChains,
      totalChains: userChains.length
    });

  } catch (error) {
    logger.error('Memory status error:', error);
    next(error);
  }
});

export default router;