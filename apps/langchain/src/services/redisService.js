import { createClient } from 'redis';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600;
  }

  async connect() {
    try {
      // Use individual config options to avoid IPv6 issues
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Maximum Redis reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Reconnecting to Redis in ${delay}ms... (attempt ${retries})`);
            return delay;
          }
        }
      };
      
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }
      
      if (process.env.REDIS_DB) {
        redisConfig.database = parseInt(process.env.REDIS_DB) || 0;
      }
      
      this.client = createClient(redisConfig);

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      this.client.on('end', () => {
        logger.info('Redis client connection closed');
        this.isConnected = false;
      });

      await this.client.connect();
      await this.client.ping();
      
      this.isConnected = true;
      logger.info('Redis connection established successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  async getCachedConversation(chatId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `chat:${chatId}:context`;
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached conversation:', error);
      throw error;
    }
  }

  async setCachedConversation(chatId, context, ttl = null) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `chat:${chatId}:context`;
      const data = JSON.stringify(context);
      const expiry = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expiry, data);
      return true;
    } catch (error) {
      logger.error('Error setting cached conversation:', error);
      throw error;
    }
  }

  async deleteCachedConversation(chatId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `chat:${chatId}:context`;
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Error deleting cached conversation:', error);
      throw error;
    }
  }

  async cacheUserSession(userId, sessionData, ttl = 86400) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `user:${userId}:session`;
      const data = JSON.stringify(sessionData);
      await this.client.setEx(key, ttl, data);
      return true;
    } catch (error) {
      logger.error('Error caching user session:', error);
      throw error;
    }
  }

  async getUserSession(userId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `user:${userId}:session`;
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Error getting user session:', error);
      throw error;
    }
  }

  async invalidateUserSession(userId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `user:${userId}:session`;
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Error invalidating user session:', error);
      throw error;
    }
  }

  async cacheAPIResponse(endpoint, params, response, ttl = 300) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `api:${endpoint}:${JSON.stringify(params)}`;
      const data = JSON.stringify(response);
      await this.client.setEx(key, ttl, data);
      return true;
    } catch (error) {
      logger.error('Error caching API response:', error);
      throw error;
    }
  }

  async getCachedAPIResponse(endpoint, params) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `api:${endpoint}:${JSON.stringify(params)}`;
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached API response:', error);
      throw error;
    }
  }

  async incrementCounter(key, expiry = null) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const value = await this.client.incr(key);
      if (expiry && value === 1) {
        await this.client.expire(key, expiry);
      }
      return value;
    } catch (error) {
      logger.error('Error incrementing counter:', error);
      throw error;
    }
  }

  async getCounter(key) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      logger.error('Error getting counter:', error);
      throw error;
    }
  }

  async setRateLimitWindow(identifier, window = 60, maxRequests = 60) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = `ratelimit:${identifier}`;
      const current = await this.incrementCounter(key, window);
      
      if (current > maxRequests) {
        const ttl = await this.client.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetIn: ttl
        };
      }

      return {
        allowed: true,
        remaining: maxRequests - current,
        resetIn: window
      };
    } catch (error) {
      logger.error('Error setting rate limit:', error);
      throw error;
    }
  }

  async addToSet(key, members, ttl = null) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.sAdd(key, members);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Error adding to set:', error);
      throw error;
    }
  }

  async getSetMembers(key) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error('Error getting set members:', error);
      throw error;
    }
  }

  async isSetMember(key, member) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.sIsMember(key, member);
      return result;
    } catch (error) {
      logger.error('Error checking set membership:', error);
      throw error;
    }
  }

  async addToList(key, values, ttl = null) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.rPush(key, values);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Error adding to list:', error);
      throw error;
    }
  }

  async getListRange(key, start = 0, stop = -1) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      logger.error('Error getting list range:', error);
      throw error;
    }
  }

  async trimList(key, start, stop) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client.lTrim(key, start, stop);
    } catch (error) {
      logger.error('Error trimming list:', error);
      throw error;
    }
  }

  async flushCache(pattern = null) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      if (pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          return await this.client.del(keys);
        }
        return 0;
      } else {
        await this.client.flushDb();
        return true;
      }
    } catch (error) {
      logger.error('Error flushing cache:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      const info = await this.client.info('server');
      const memoryInfo = await this.client.info('memory');
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        latency: `${latency}ms`,
        info: {
          server: info,
          memory: memoryInfo
        }
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  async executeTransaction(operations) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const multi = this.client.multi();
      
      for (const op of operations) {
        const { command, args } = op;
        multi[command](...args);
      }
      
      return await multi.exec();
    } catch (error) {
      logger.error('Error executing Redis transaction:', error);
      throw error;
    }
  }
}

export default new RedisService();