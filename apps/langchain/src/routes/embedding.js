import { Router } from 'express';
import Joi from 'joi';
import { OpenAIEmbeddings } from '@langchain/openai';
import { query } from '../services/database.js';
import { ValidationError } from '../middleware/errorHandler.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = Router();

const embeddingSchema = Joi.object({
  text: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).required(),
  model: Joi.string().default('text-embedding-ada-002'),
  store: Joi.boolean().default(false),
  metadata: Joi.object().optional()
});

const searchSchema = Joi.object({
  query: Joi.string().required(),
  limit: Joi.number().min(1).max(100).default(10),
  threshold: Joi.number().min(0).max(1).default(0.7)
});

let embeddings = null;

function getEmbeddings() {
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.langchain.openai.apiKey,
      modelName: 'text-embedding-ada-002'
    });
  }
  return embeddings;
}

router.post('/generate', async (req, res, next) => {
  try {
    const { error, value } = embeddingSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { text, model, store, metadata } = value;
    const embedder = getEmbeddings();
    
    const texts = Array.isArray(text) ? text : [text];
    const vectors = await embedder.embedDocuments(texts);

    if (store) {
      for (let i = 0; i < texts.length; i++) {
        await query(
          'INSERT INTO embeddings (content, embedding, metadata) VALUES ($1, $2, $3)',
          [texts[i], `[${vectors[i].join(',')}]`, metadata || {}]
        );
      }
    }

    res.json({
      embeddings: vectors,
      dimension: vectors[0].length,
      model,
      stored: store,
      count: vectors.length
    });

    logger.info('Embeddings generated', {
      count: vectors.length,
      stored: store
    });

  } catch (error) {
    logger.error('Embedding generation error:', error);
    next(error);
  }
});

router.post('/search', async (req, res, next) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { query: searchQuery, limit, threshold } = value;
    const embedder = getEmbeddings();
    
    const queryVector = await embedder.embedQuery(searchQuery);
    
    const result = await query(
      `SELECT id, content, metadata,
              1 - (embedding <=> $1::vector) as similarity
       FROM embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [`[${queryVector.join(',')}]`, threshold, limit]
    );

    res.json({
      results: result.rows,
      query: searchQuery,
      count: result.rowCount
    });

  } catch (error) {
    logger.error('Embedding search error:', error);
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as total,
              AVG(LENGTH(content)) as avg_content_length,
              MIN(created_at) as oldest,
              MAX(created_at) as newest
       FROM embeddings`
    );

    res.json({
      statistics: result.rows[0]
    });

  } catch (error) {
    logger.error('Embedding stats error:', error);
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const embeddingId = req.params.id;
    
    const result = await query(
      'DELETE FROM embeddings WHERE id = $1 RETURNING id',
      [embeddingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Embedding not found' });
    }

    res.json({ 
      message: 'Embedding deleted successfully',
      id: result.rows[0].id 
    });

  } catch (error) {
    logger.error('Embedding deletion error:', error);
    next(error);
  }
});

export default router;