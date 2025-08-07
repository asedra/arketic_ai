import ChatService from '../services/chatService.js';
import DatabaseService from '../services/databaseService.js';
import RedisService from '../services/redisService.js';

jest.mock('../services/databaseService.js');
jest.mock('../services/redisService.js');
jest.mock('@langchain/openai');

const mockChatHistory = [
  {
    id: 1,
    chat_id: 'test-chat-1',
    user_id: 'user-1',
    content: 'Hello',
    message_type: 'USER',
    created_at: '2025-08-07T10:00:00Z'
  },
  {
    id: 2,
    chat_id: 'test-chat-1',
    user_id: null,
    content: 'Hi there! How can I help you?',
    message_type: 'AI',
    created_at: '2025-08-07T10:00:01Z'
  }
];

const mockSavedMessage = {
  id: 3,
  chat_id: 'test-chat-1',
  user_id: 'user-1',
  content: 'What is the weather?',
  message_type: 'USER',
  created_at: '2025-08-07T10:01:00Z'
};

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ChatService.chains.clear();
  });

  describe('createLLM', () => {
    it('should create OpenAI LLM with default settings', () => {
      const llm = ChatService.createLLM('test-api-key');
      expect(llm).toBeDefined();
    });

    it('should create OpenAI LLM with custom settings', () => {
      const settings = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000
      };
      const llm = ChatService.createLLM('test-api-key', settings);
      expect(llm).toBeDefined();
    });

    it('should throw error for invalid API key format', () => {
      expect(() => {
        ChatService.createLLM('');
      }).toThrow();
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      const text = 'Hello world';
      const tokens = ChatService.estimateTokens(text);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty text', () => {
      const tokens = ChatService.estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('getOrCreateChain', () => {
    it('should create new chain when not cached', async () => {
      DatabaseService.getChatHistory.mockResolvedValue(mockChatHistory);
      
      const chain = await ChatService.getOrCreateChain('test-chat-1', 'test-api-key');
      
      expect(chain).toBeDefined();
      expect(chain.chain).toBeDefined();
      expect(chain.memory).toBeDefined();
      expect(chain.llm).toBeDefined();
      expect(DatabaseService.getChatHistory).toHaveBeenCalledWith('test-chat-1');
    });

    it('should return cached chain when available', async () => {
      DatabaseService.getChatHistory.mockResolvedValue(mockChatHistory);
      
      const chain1 = await ChatService.getOrCreateChain('test-chat-1', 'test-api-key');
      const chain2 = await ChatService.getOrCreateChain('test-chat-1', 'test-api-key');
      
      expect(chain1).toBe(chain2);
      expect(DatabaseService.getChatHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('processMessage', () => {
    it('should process message successfully', async () => {
      DatabaseService.getChatHistory.mockResolvedValue(mockChatHistory);
      DatabaseService.saveMessage.mockResolvedValueOnce(mockSavedMessage);
      DatabaseService.saveMessage.mockResolvedValueOnce({
        ...mockSavedMessage,
        id: 4,
        content: 'I can help you with weather information!',
        message_type: 'AI'
      });
      RedisService.setCachedConversation.mockResolvedValue(true);

      const mockChain = {
        call: jest.fn().mockResolvedValue({ output: 'I can help you with weather information!' })
      };
      
      jest.spyOn(ChatService, 'getOrCreateChain').mockResolvedValue({
        chain: mockChain,
        memory: { chatHistory: { getMessages: () => mockChatHistory } }
      });

      const result = await ChatService.processMessage({
        chatId: 'test-chat-1',
        message: 'What is the weather?',
        userId: 'user-1',
        apiKey: 'test-api-key',
        settings: { model: 'gpt-3.5-turbo' }
      });

      expect(result.success).toBe(true);
      expect(result.userMessage).toBeDefined();
      expect(result.aiMessage).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('should handle chain call errors with retry', async () => {
      DatabaseService.getChatHistory.mockResolvedValue([]);
      DatabaseService.saveMessage.mockResolvedValueOnce(mockSavedMessage);

      const mockChain = {
        call: jest.fn()
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce({ output: 'Success after retry!' })
      };
      
      jest.spyOn(ChatService, 'getOrCreateChain').mockResolvedValue({
        chain: mockChain,
        memory: { chatHistory: { getMessages: () => [] } }
      });

      const result = await ChatService.processMessage({
        chatId: 'test-chat-1',
        message: 'Hello',
        userId: 'user-1',
        apiKey: 'test-api-key'
      });

      expect(mockChain.call).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should fail after maximum retries', async () => {
      DatabaseService.getChatHistory.mockResolvedValue([]);
      DatabaseService.saveMessage.mockResolvedValue(mockSavedMessage);

      const mockChain = {
        call: jest.fn().mockRejectedValue(new Error('Persistent error'))
      };
      
      jest.spyOn(ChatService, 'getOrCreateChain').mockResolvedValue({
        chain: mockChain,
        memory: { chatHistory: { getMessages: () => [] } }
      });

      await expect(ChatService.processMessage({
        chatId: 'test-chat-1',
        message: 'Hello',
        userId: 'user-1',
        apiKey: 'test-api-key'
      })).rejects.toThrow('Persistent error');

      expect(mockChain.call).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation successfully', async () => {
      ChatService.chains.set('test-chat-1', { chain: {}, expiresAt: Date.now() + 10000 });
      RedisService.deleteCachedConversation.mockResolvedValue(true);

      const result = await ChatService.clearConversation('test-chat-1');

      expect(result).toBe(true);
      expect(ChatService.chains.has('test-chat-1')).toBe(false);
      expect(RedisService.deleteCachedConversation).toHaveBeenCalledWith('test-chat-1');
    });
  });

  describe('getConversationSummary', () => {
    it('should return cached summary when available', async () => {
      const cachedSummary = {
        chatId: 'test-chat-1',
        messageCount: 2,
        lastMessage: 'Hello'
      };
      RedisService.getCachedConversation.mockResolvedValue(cachedSummary);

      const result = await ChatService.getConversationSummary('test-chat-1');

      expect(result).toEqual(cachedSummary);
      expect(DatabaseService.getChatHistory).not.toHaveBeenCalled();
    });

    it('should create summary from database when not cached', async () => {
      RedisService.getCachedConversation.mockResolvedValue(null);
      DatabaseService.getChatHistory.mockResolvedValue(mockChatHistory);
      RedisService.setCachedConversation.mockResolvedValue(true);

      const result = await ChatService.getConversationSummary('test-chat-1');

      expect(result.chatId).toBe('test-chat-1');
      expect(result.messageCount).toBe(2);
      expect(result.lastMessage).toBe('Hi there! How can I help you?');
      expect(RedisService.setCachedConversation).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      const mockLLM = {
        invoke: jest.fn().mockResolvedValue('Test response')
      };
      
      jest.doMock('@langchain/openai', () => ({
        ChatOpenAI: jest.fn(() => mockLLM)
      }));

      const result = await ChatService.validateApiKey('valid-api-key');
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const mockLLM = {
        invoke: jest.fn().mockRejectedValue(new Error('Invalid API key'))
      };
      
      jest.doMock('@langchain/openai', () => ({
        ChatOpenAI: jest.fn(() => mockLLM)
      }));

      const result = await ChatService.validateApiKey('invalid-api-key');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('getChainHealth', () => {
    it('should return health status', async () => {
      ChatService.chains.set('test-1', { chain: {}, expiresAt: Date.now() + 10000 });
      ChatService.chains.set('test-2', { chain: {}, expiresAt: Date.now() + 10000 });
      
      DatabaseService.pool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ avg_time: 1500 }]
        })
      };

      const health = await ChatService.getChainHealth();

      expect(health.status).toBe('healthy');
      expect(health.activeChains).toBe(2);
      expect(health.averageProcessingTime).toBe(1500);
    });
  });

  describe('cleanup', () => {
    it('should clear all chains', async () => {
      ChatService.chains.set('test-1', { chain: {} });
      ChatService.chains.set('test-2', { chain: {} });

      await ChatService.cleanup();

      expect(ChatService.chains.size).toBe(0);
    });
  });
});