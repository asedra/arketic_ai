import { Router } from 'express';
import Joi from 'joi';
import { generateCompletion, generateWithTemplate } from '../services/langchain.js';
import { ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = Router();

const completionSchema = Joi.object({
  prompt: Joi.string().required().min(1).max(10000),
  provider: Joi.string().valid('openai', 'anthropic', 'huggingface').default('openai'),
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().min(1).max(4096).optional(),
  topP: Joi.number().min(0).max(1).optional(),
  frequencyPenalty: Joi.number().min(-2).max(2).optional(),
  presencePenalty: Joi.number().min(-2).max(2).optional(),
  stopSequences: Joi.array().items(Joi.string()).optional()
});

const templateSchema = Joi.object({
  template: Joi.string().required(),
  variables: Joi.object().required(),
  provider: Joi.string().valid('openai', 'anthropic', 'huggingface').default('openai')
});

router.post('/', async (req, res, next) => {
  try {
    const { error, value } = completionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const startTime = Date.now();
    const response = await generateCompletion(value.prompt, value);
    const latency = Date.now() - startTime;

    const tokenEstimate = Math.ceil((value.prompt.length + response.length) / 4);

    res.json({
      completion: response,
      provider: value.provider,
      usage: {
        promptTokens: Math.ceil(value.prompt.length / 4),
        completionTokens: Math.ceil(response.length / 4),
        totalTokens: tokenEstimate
      },
      latency,
      timestamp: new Date().toISOString()
    });

    logger.info('Completion generated', {
      provider: value.provider,
      promptLength: value.prompt.length,
      responseLength: response.length,
      latency
    });

  } catch (error) {
    logger.error('Completion error:', error);
    next(error);
  }
});

router.post('/template', async (req, res, next) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { template, variables, provider } = value;
    
    const startTime = Date.now();
    const response = await generateWithTemplate(template, variables, provider);
    const latency = Date.now() - startTime;

    res.json({
      completion: response,
      provider,
      variables,
      latency,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Template completion error:', error);
    next(error);
  }
});

router.post('/stream', async (req, res, next) => {
  try {
    const { error, value } = completionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const { streamCompletion } = await import('../services/langchain.js');
    
    let fullResponse = '';
    for await (const chunk of streamCompletion(value.prompt, value)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ chunk, partial: fullResponse })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, completion: fullResponse })}\n\n`);
    res.end();

  } catch (error) {
    logger.error('Stream completion error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default router;