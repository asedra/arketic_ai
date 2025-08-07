import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3001,
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  },
  
  database: {
    url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'arketic'}:${process.env.DB_PASSWORD || 'arketic_dev_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'arketic_dev'}`,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'arketic',
    password: process.env.DB_PASSWORD || 'arketic_dev_password',
    name: process.env.DB_NAME || 'arketic_dev',
    ssl: process.env.DB_SSL === 'true',
    poolConfig: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  },
  
  redis: {
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}/${process.env.REDIS_DB || 0}`,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 2000,
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10) || 2000,
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    internalApiKey: process.env.INTERNAL_API_KEY,
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  vectorStore: {
    type: process.env.VECTOR_STORE_TYPE || 'memory',
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      indexName: process.env.PINECONE_INDEX_NAME,
    },
    chroma: {
      url: process.env.CHROMA_URL || 'http://localhost:8000',
    }
  }
};

const validateConfig = () => {
  const errors = [];
  
  if (config.app.env === 'production') {
    if (!config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required in production');
    }
    if (config.auth.jwtSecret === 'default-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed from default in production');
    }
    if (!config.auth.internalApiKey) {
      errors.push('INTERNAL_API_KEY is required in production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

validateConfig();

export default config;