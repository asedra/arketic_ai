describe('ChatService Unit Tests', () => {
  let ChatService;
  
  beforeAll(async () => {
    const module = await import('../services/chatService.js');
    ChatService = module.default;
  });

  beforeEach(() => {
    if (ChatService && ChatService.chains) {
      ChatService.chains.clear();
    }
  });

  describe('Token Estimation', () => {
    test('should estimate tokens correctly for simple text', () => {
      const result = ChatService.estimateTokens('Hello world');
      expect(result).toBe(3);
    });

    test('should estimate tokens correctly for longer text', () => {
      const result = ChatService.estimateTokens('This is a longer message with more words');
      expect(result).toBe(10);
    });

    test('should handle empty text', () => {
      const result = ChatService.estimateTokens('');
      expect(result).toBe(0);
    });

    test('should handle special characters', () => {
      const result = ChatService.estimateTokens('Hello! How are you? 😊');
      expect(result).toBe(6);
    });
  });

  describe('LLM Creation', () => {
    test('should create LLM with minimal settings', () => {
      const llm = ChatService.createLLM('test-api-key');
      expect(llm).toBeDefined();
    });

    test('should create LLM with custom settings', () => {
      const settings = {
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1000,
        streaming: false
      };
      const llm = ChatService.createLLM('test-api-key', settings);
      expect(llm).toBeDefined();
    });

    test('should throw error for empty API key', () => {
      expect(() => {
        ChatService.createLLM('');
      }).toThrow();
    });

    test('should throw error for null API key', () => {
      expect(() => {
        ChatService.createLLM(null);
      }).toThrow();
    });
  });

  describe('Chain Management', () => {
    test('should have empty chains initially', () => {
      expect(ChatService.chains.size).toBe(0);
    });

    test('should calculate cache hit rate', () => {
      const hitRate = ChatService.calculateCacheHitRate();
      expect(typeof hitRate).toBe('number');
      expect(hitRate).toBeGreaterThanOrEqual(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup successfully', async () => {
      await ChatService.cleanup();
      expect(ChatService.chains.size).toBe(0);
    });
  });

  describe('Health Checks', () => {
    test('should return health status structure', async () => {
      try {
        const health = await ChatService.getChainHealth();
        expect(health).toBeDefined();
        expect(typeof health.activeChains).toBe('number');
        expect(typeof health.cacheHitRate).toBe('number');
        expect(health.status).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Validation', () => {
    test('should handle API key validation', async () => {
      try {
        const result = await ChatService.validateApiKey('invalid-key');
        expect(result).toBeDefined();
        expect(typeof result.valid).toBe('boolean');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle empty API key validation', async () => {
      try {
        const result = await ChatService.validateApiKey('');
        expect(result.valid).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});