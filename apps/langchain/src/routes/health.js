import { Router } from 'express';
import { getRedisClient } from '../services/redis.js';
import { getPool } from '../services/database.js';
import { getAvailableModels } from '../services/langchain.js';

const router = Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'langchain-microservice',
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(health);
});

router.get('/detailed', async (req, res) => {
  const checks = {
    service: 'langchain-microservice',
    status: 'checking',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    checks.checks.redis = { status: 'healthy', connected: true };
  } catch (error) {
    checks.checks.redis = { status: 'unhealthy', error: error.message };
  }

  try {
    const pool = getPool();
    const result = await pool.query('SELECT 1');
    checks.checks.database = { status: 'healthy', connected: true };
  } catch (error) {
    checks.checks.database = { status: 'unhealthy', error: error.message };
  }

  try {
    const models = getAvailableModels();
    checks.checks.langchain = { 
      status: 'healthy', 
      availableModels: models 
    };
  } catch (error) {
    checks.checks.langchain = { status: 'unhealthy', error: error.message };
  }

  const allHealthy = Object.values(checks.checks).every(
    check => check.status === 'healthy'
  );
  
  checks.status = allHealthy ? 'healthy' : 'degraded';

  res.status(allHealthy ? 200 : 503).json(checks);
});

router.get('/ready', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    
    const pool = getPool();
    await pool.query('SELECT 1');
    
    const models = getAvailableModels();
    if (models.length === 0) {
      throw new Error('No models available');
    }

    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ 
      ready: false, 
      error: error.message 
    });
  }
});

router.get('/live', (req, res) => {
  res.json({ alive: true });
});

export default router;