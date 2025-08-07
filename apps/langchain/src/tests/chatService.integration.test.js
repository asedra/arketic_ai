import ChatService from '../services/chatService.js';
import DatabaseService from '../services/databaseService.js';
import RedisService from '../services/redisService.js';

describe('ChatService Integration Tests', () => {
  beforeAll(async () => {
    await DatabaseService.connect();
    await RedisService.connect();
  });

  afterAll(async () => {
    await DatabaseService.disconnect();
    await RedisService.disconnect();
  });

  beforeEach(() => {
    ChatService.chains.clear();
  });

  describe('Basic Functionality', () => {
    test('should estimate tokens correctly', () => {
      expect(ChatService.estimateTokens('Hello world')).toBe(3);
      expect(ChatService.estimateTokens('This is a longer message')).toBe(7);
      expect(ChatService.estimateTokens('')).toBe(0);
    });

    test('should create LLM with default settings', () => {
      const llm = ChatService.createLLM('test-key');
      expect(llm).toBeDefined();
    });

    test('should create LLM with custom settings', () => {
      const settings = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000
      };
      const llm = ChatService.createLLM('test-key', settings);
      expect(llm).toBeDefined();
    });

    test('should throw error for empty API key', () => {
      expect(() => {
        ChatService.createLLM('');
      }).toThrow();
    });
  });

  describe('Chain Management', () => {
    test('should create and cache chain', async () => {
      const chatId = 'test-chat-' + Date.now();
      const chain = await ChatService.getOrCreateChain(chatId, 'test-key');
      
      expect(chain).toBeDefined();
      expect(chain.chain).toBeDefined();
      expect(chain.memory).toBeDefined();
      expect(chain.llm).toBeDefined();
      
      const cachedChain = await ChatService.getOrCreateChain(chatId, 'test-key');
      expect(cachedChain).toBe(chain);
    });

    test('should clear conversation', async () => {
      const chatId = 'test-chat-' + Date.now();
      await ChatService.getOrCreateChain(chatId, 'test-key');
      
      expect(ChatService.chains.has(chatId)).toBe(true);
      
      await ChatService.clearConversation(chatId);
      
      expect(ChatService.chains.has(chatId)).toBe(false);
    });
  });

  describe('Health Checks', () => {
    test('should return chain health status', async () => {
      const health = await ChatService.getChainHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(typeof health.activeChains).toBe('number');
      expect(typeof health.cacheHitRate).toBe('number');
      expect(typeof health.averageProcessingTime).toBe('number');
    });
  });

  describe('Conversation Summary', () => {
    test('should create conversation summary from database', async () => {
      const chatId = 'test-chat-' + Date.now();
      
      const summary = await ChatService.getConversationSummary(chatId);
      
      expect(summary).toBeDefined();
      expect(summary.chatId).toBe(chatId);
      expect(typeof summary.messageCount).toBe('number');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all chains', async () => {
      const chatId1 = 'test-chat-1-' + Date.now();
      const chatId2 = 'test-chat-2-' + Date.now();
      
      await ChatService.getOrCreateChain(chatId1, 'test-key');
      await ChatService.getOrCreateChain(chatId2, 'test-key');
      
      expect(ChatService.chains.size).toBe(2);
      
      await ChatService.cleanup();
      
      expect(ChatService.chains.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      const originalConnect = DatabaseService.isConnected;
      DatabaseService.isConnected = false;
      
      try {
        await expect(ChatService.processMessage({
          chatId: 'test-chat',
          message: 'Hello',
          userId: 'user-1',
          apiKey: 'test-key'
        })).rejects.toThrow();
      } finally {
        DatabaseService.isConnected = originalConnect;
      }
    });

    test('should validate API key format', async () => {
      const result1 = await ChatService.validateApiKey('sk-test123');
      expect(result1.valid).toBe(false);
      
      const result2 = await ChatService.validateApiKey('');
      expect(result2.valid).toBe(false);
    });
  });
});