import { createClient } from 'redis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient = null;

export async function initializeRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password,
      database: config.redis.db
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

export async function cacheGet(key) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

export async function cacheSet(key, value, ttl = config.redis.ttl) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
}

export async function cacheDelete(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
}

export async function cacheFlush() {
  try {
    await redisClient.flushDb();
    return true;
  } catch (error) {
    logger.error('Error flushing cache:', error);
    return false;
  }
}