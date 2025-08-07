import RedisService from '../src/services/redisService.js';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    sAdd: jest.fn(),
    sMembers: jest.fn(),
    sIsMember: jest.fn(),
    rPush: jest.fn(),
    lRange: jest.fn(),
    lTrim: jest.fn(),
    keys: jest.fn(),
    flushDb: jest.fn(),
    info: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn()
    }))
  }))
}));

describe('RedisService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    const redis = require('redis');
    mockClient = redis.createClient();
    RedisService.client = mockClient;
    RedisService.isConnected = true;
  });

  describe('connect', () => {
    it('should establish Redis connection successfully', async () => {
      mockClient.connect.mockResolvedValue();
      mockClient.ping.mockResolvedValue('PONG');
      
      const result = await RedisService.connect();
      
      expect(result).toBe(true);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(error);
      
      await expect(RedisService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('getCachedConversation', () => {
    it('should get cached conversation successfully', async () => {
      const chatId = 'chat-123';
      const cachedData = { messages: ['Hello', 'Hi'] };
      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await RedisService.getCachedConversation(chatId);

      expect(result).toEqual(cachedData);
      expect(mockClient.get).toHaveBeenCalledWith(`chat:${chatId}:context`);
    });

    it('should return null when no cache exists', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await RedisService.getCachedConversation('chat-123');

      expect(result).toBeNull();
    });

    it('should throw error when not connected', async () => {
      RedisService.isConnected = false;
      
      await expect(RedisService.getCachedConversation('chat-123'))
        .rejects.toThrow('Redis not connected');
    });
  });

  describe('setCachedConversation', () => {
    it('should cache conversation successfully', async () => {
      const chatId = 'chat-123';
      const context = { messages: ['Hello', 'Hi'] };
      const ttl = 1800;
      
      mockClient.setEx.mockResolvedValue('OK');

      const result = await RedisService.setCachedConversation(chatId, context, ttl);

      expect(result).toBe(true);
      expect(mockClient.setEx).toHaveBeenCalledWith(
        `chat:${chatId}:context`,
        ttl,
        JSON.stringify(context)
      );
    });

    it('should use default TTL when none provided', async () => {
      const chatId = 'chat-123';
      const context = { messages: ['Hello'] };
      
      mockClient.setEx.mockResolvedValue('OK');

      await RedisService.setCachedConversation(chatId, context);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        `chat:${chatId}:context`,
        3600,
        JSON.stringify(context)
      );
    });
  });

  describe('deleteCachedConversation', () => {
    it('should delete cached conversation successfully', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await RedisService.deleteCachedConversation('chat-123');

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('chat:chat-123:context');
    });

    it('should return false when key does not exist', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await RedisService.deleteCachedConversation('chat-123');

      expect(result).toBe(false);
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter successfully', async () => {
      mockClient.incr.mockResolvedValue(5);

      const result = await RedisService.incrementCounter('test:counter');

      expect(result).toBe(5);
      expect(mockClient.incr).toHaveBeenCalledWith('test:counter');
    });

    it('should set expiry for new counter', async () => {
      mockClient.incr.mockResolvedValue(1);

      const result = await RedisService.incrementCounter('test:counter', 60);

      expect(result).toBe(1);
      expect(mockClient.incr).toHaveBeenCalledWith('test:counter');
      expect(mockClient.expire).toHaveBeenCalledWith('test:counter', 60);
    });

    it('should not set expiry for existing counter', async () => {
      mockClient.incr.mockResolvedValue(2);

      await RedisService.incrementCounter('test:counter', 60);

      expect(mockClient.expire).not.toHaveBeenCalled();
    });
  });

  describe('setRateLimitWindow', () => {
    it('should allow request within limit', async () => {
      mockClient.incr.mockResolvedValue(5);

      const result = await RedisService.setRateLimitWindow('user:123', 60, 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(95);
      expect(result.resetIn).toBe(60);
    });

    it('should reject request over limit', async () => {
      mockClient.incr.mockResolvedValue(101);
      mockClient.ttl.mockResolvedValue(45);

      const result = await RedisService.setRateLimitWindow('user:123', 60, 100);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetIn).toBe(45);
    });
  });

  describe('addToSet', () => {
    it('should add members to set successfully', async () => {
      mockClient.sAdd.mockResolvedValue(2);

      const result = await RedisService.addToSet('test:set', ['member1', 'member2']);

      expect(result).toBe(2);
      expect(mockClient.sAdd).toHaveBeenCalledWith('test:set', ['member1', 'member2']);
    });

    it('should set TTL when provided', async () => {
      mockClient.sAdd.mockResolvedValue(1);

      await RedisService.addToSet('test:set', ['member1'], 300);

      expect(mockClient.expire).toHaveBeenCalledWith('test:set', 300);
    });
  });

  describe('getSetMembers', () => {
    it('should get all set members', async () => {
      const members = ['member1', 'member2', 'member3'];
      mockClient.sMembers.mockResolvedValue(members);

      const result = await RedisService.getSetMembers('test:set');

      expect(result).toEqual(members);
      expect(mockClient.sMembers).toHaveBeenCalledWith('test:set');
    });
  });

  describe('isSetMember', () => {
    it('should check if member exists in set', async () => {
      mockClient.sIsMember.mockResolvedValue(true);

      const result = await RedisService.isSetMember('test:set', 'member1');

      expect(result).toBe(true);
      expect(mockClient.sIsMember).toHaveBeenCalledWith('test:set', 'member1');
    });
  });

  describe('addToList', () => {
    it('should add values to list', async () => {
      mockClient.rPush.mockResolvedValue(3);

      const result = await RedisService.addToList('test:list', ['value1', 'value2']);

      expect(result).toBe(3);
      expect(mockClient.rPush).toHaveBeenCalledWith('test:list', ['value1', 'value2']);
    });
  });

  describe('getListRange', () => {
    it('should get list range', async () => {
      const values = ['value1', 'value2', 'value3'];
      mockClient.lRange.mockResolvedValue(values);

      const result = await RedisService.getListRange('test:list', 0, 2);

      expect(result).toEqual(values);
      expect(mockClient.lRange).toHaveBeenCalledWith('test:list', 0, 2);
    });

    it('should use default range parameters', async () => {
      const values = ['value1', 'value2'];
      mockClient.lRange.mockResolvedValue(values);

      await RedisService.getListRange('test:list');

      expect(mockClient.lRange).toHaveBeenCalledWith('test:list', 0, -1);
    });
  });

  describe('flushCache', () => {
    it('should flush specific pattern', async () => {
      const keys = ['test:key1', 'test:key2'];
      mockClient.keys.mockResolvedValue(keys);
      mockClient.del.mockResolvedValue(2);

      const result = await RedisService.flushCache('test:*');

      expect(result).toBe(2);
      expect(mockClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockClient.del).toHaveBeenCalledWith(keys);
    });

    it('should flush entire cache when no pattern provided', async () => {
      mockClient.flushDb.mockResolvedValue('OK');

      const result = await RedisService.flushCache();

      expect(result).toBe(true);
      expect(mockClient.flushDb).toHaveBeenCalled();
    });

    it('should handle empty key pattern', async () => {
      mockClient.keys.mockResolvedValue([]);

      const result = await RedisService.flushCache('nonexistent:*');

      expect(result).toBe(0);
      expect(mockClient.del).not.toHaveBeenCalled();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      mockClient.ping.mockResolvedValue('PONG');
      mockClient.info.mockResolvedValueOnce('server info').mockResolvedValueOnce('memory info');

      const result = await RedisService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(result.latency).toMatch(/\d+ms/);
      expect(mockClient.ping).toHaveBeenCalled();
      expect(mockClient.info).toHaveBeenCalledWith('server');
      expect(mockClient.info).toHaveBeenCalledWith('memory');
    });

    it('should return unhealthy status on error', async () => {
      mockClient.ping.mockRejectedValue(new Error('Health check failed'));

      const result = await RedisService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Health check failed');
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockMulti = {
        setEx: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(['OK', 1])
      };
      mockClient.multi.mockReturnValue(mockMulti);

      const operations = [
        { command: 'setEx', args: ['key1', 60, 'value1'] },
        { command: 'del', args: ['key2'] }
      ];

      const result = await RedisService.executeTransaction(operations);

      expect(result).toEqual(['OK', 1]);
      expect(mockClient.multi).toHaveBeenCalled();
      expect(mockMulti.setEx).toHaveBeenCalledWith('key1', 60, 'value1');
      expect(mockMulti.del).toHaveBeenCalledWith('key2');
      expect(mockMulti.exec).toHaveBeenCalled();
    });
  });
});