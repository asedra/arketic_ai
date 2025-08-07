import DatabaseService from '../src/services/databaseService.js';

jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
    on: jest.fn()
  };

  const mockPool = {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0
  };

  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('DatabaseService', () => {
  let mockPool;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    const pg = require('pg');
    mockPool = new pg.Pool();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    DatabaseService.pool = mockPool;
    DatabaseService.isConnected = true;
  });

  describe('connect', () => {
    it('should establish database connection successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ now: new Date() }] });
      
      const result = await DatabaseService.connect();
      
      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);
      
      await expect(DatabaseService.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('getChatHistory', () => {
    it('should fetch chat history successfully', async () => {
      const mockMessages = [
        { id: 1, chat_id: 'chat-123', content: 'Hello' },
        { id: 2, chat_id: 'chat-123', content: 'Hi there' }
      ];
      mockPool.query.mockResolvedValue({ rows: mockMessages });

      const result = await DatabaseService.getChatHistory('chat-123');

      expect(result).toEqual(mockMessages);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM chat_messages'),
        ['chat-123']
      );
    });

    it('should throw error when not connected', async () => {
      DatabaseService.isConnected = false;
      
      await expect(DatabaseService.getChatHistory('chat-123'))
        .rejects.toThrow('Database not connected');
    });
  });

  describe('saveMessage', () => {
    it('should save message successfully', async () => {
      const messageData = {
        chatId: 'chat-123',
        userId: 'user-456',
        content: 'Test message',
        messageType: 'text',
        aiModelUsed: 'gpt-4',
        tokensUsed: 50,
        processingTimeMs: 1200
      };

      const savedMessage = { id: 1, ...messageData };
      mockPool.query.mockResolvedValue({ rows: [savedMessage] });

      const result = await DatabaseService.saveMessage(messageData);

      expect(result).toEqual(savedMessage);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        [
          messageData.chatId,
          messageData.userId,
          messageData.content,
          messageData.messageType,
          messageData.aiModelUsed,
          messageData.tokensUsed,
          messageData.processingTimeMs
        ]
      );
    });

    it('should handle missing optional fields', async () => {
      const messageData = {
        chatId: 'chat-123',
        userId: 'user-456',
        content: 'Test message'
      };

      const savedMessage = { id: 1, ...messageData };
      mockPool.query.mockResolvedValue({ rows: [savedMessage] });

      const result = await DatabaseService.saveMessage(messageData);

      expect(result).toEqual(savedMessage);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO chat_messages'),
        [
          messageData.chatId,
          messageData.userId,
          messageData.content,
          'text',
          messageData.aiModelUsed,
          0,
          0
        ]
      );
    });
  });

  describe('updateMessage', () => {
    it('should update message successfully', async () => {
      const messageId = 1;
      const updates = { content: 'Updated message', tokensUsed: 75 };
      const updatedMessage = { id: messageId, ...updates };
      
      mockPool.query.mockResolvedValue({ rows: [updatedMessage] });

      const result = await DatabaseService.updateMessage(messageId, updates);

      expect(result).toEqual(updatedMessage);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_messages'),
        ['Updated message', 75, messageId]
      );
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message successfully', async () => {
      const messageId = 1;
      const deletedMessage = { id: messageId, is_deleted: true };
      
      mockPool.query.mockResolvedValue({ rows: [deletedMessage] });

      const result = await DatabaseService.deleteMessage(messageId);

      expect(result).toEqual(deletedMessage);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE chat_messages'),
        [messageId]
      );
    });
  });

  describe('beginTransaction', () => {
    it('should begin transaction successfully', async () => {
      const result = await DatabaseService.beginTransaction();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(result).toBe(mockClient);
    });
  });

  describe('commitTransaction', () => {
    it('should commit transaction successfully', async () => {
      await DatabaseService.commitTransaction(mockClient);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('rollbackTransaction', () => {
    it('should rollback transaction successfully', async () => {
      await DatabaseService.rollbackTransaction(mockClient);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('executeInTransaction', () => {
    it('should execute callback in transaction successfully', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      
      const result = await DatabaseService.executeInTransaction(callback);

      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toBe('result');
    });

    it('should rollback transaction on error', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Callback error'));
      
      await expect(DatabaseService.executeInTransaction(callback))
        .rejects.toThrow('Callback error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await DatabaseService.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return unhealthy status on error', async () => {
      mockPool.query.mockRejectedValue(new Error('Health check failed'));

      const result = await DatabaseService.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.error).toBe('Health check failed');
    });
  });

  describe('getTokenUsageStats', () => {
    it('should get token usage statistics', async () => {
      const mockStats = [
        {
          ai_model_used: 'gpt-4',
          message_count: '10',
          total_tokens: '500',
          avg_tokens: '50',
          avg_processing_time: '1200'
        }
      ];
      mockPool.query.mockResolvedValue({ rows: mockStats });

      const userId = 'user-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await DatabaseService.getTokenUsageStats(userId, startDate, endDate);

      expect(result).toEqual(mockStats);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId, startDate, endDate]
      );
    });
  });
});