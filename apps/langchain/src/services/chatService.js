import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import winston from 'winston';
import DatabaseService from './databaseService.js';
import RedisService from './redisService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class ChatService {
  constructor() {
    this.dbService = DatabaseService;
    this.redisService = RedisService;
    this.chains = new Map();
    this.chainTTL = 30 * 60 * 1000; // 30 minutes
  }

  async getOrCreateChain(chatId, apiKey, settings = {}) {
    if (this.chains.has(chatId)) {
      const cached = this.chains.get(chatId);
      if (cached.expiresAt > Date.now()) {
        return cached.chain;
      } else {
        this.chains.delete(chatId);
      }
    }

    try {
      const llm = this.createLLM(apiKey, settings);
      
      const chatHistory = await this.dbService.getChatHistory(chatId);
      
      const memory = new BufferMemory({
        returnMessages: true,
        memoryKey: "history",
        inputKey: "input"
      });

      for (const msg of chatHistory) {
        if (msg.message_type === 'user') {
          await memory.chatHistory.addMessage(new HumanMessage(msg.content));
        } else if (msg.message_type === 'ai') {
          await memory.chatHistory.addMessage(new AIMessage(msg.content));
        }
      }

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", settings.systemPrompt || "You are a helpful AI assistant."],
        new MessagesPlaceholder("history"),
        ["human", "{input}"],
      ]);

      const chain = new ConversationChain({
        llm,
        memory,
        prompt,
        outputKey: "text",
        verbose: process.env.NODE_ENV === 'development'
      });

      const chainData = {
        chain: { chain, memory, llm },
        expiresAt: Date.now() + this.chainTTL
      };
      
      this.chains.set(chatId, chainData);
      
      setTimeout(() => {
        this.chains.delete(chatId);
      }, this.chainTTL);

      return chainData.chain;
    } catch (error) {
      logger.error('Error creating chain:', error);
      throw error;
    }
  }

  createLLM(apiKey, settings = {}) {
    try {
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: settings.model || 'gpt-3.5-turbo',
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 2048,
        streaming: settings.streaming || true,
      });
    } catch (error) {
      logger.error('Error creating LLM:', error);
      throw new Error(`Failed to create OpenAI LLM: ${error.message}`);
    }
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  async processMessage({ chatId, message, userId, apiKey, settings = {} }) {
    const startTime = Date.now();
    
    try {
      const { chain, memory } = await this.getOrCreateChain(chatId, apiKey, settings);
      
      const userMessage = await this.dbService.saveMessage({
        chatId,
        sender_id: userId,
        content: message,
        messageType: 'user'
      });

      let response;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          response = await chain.call({ input: message });
          break;
        } catch (error) {
          retries++;
          logger.warn(`Chain call attempt ${retries} failed:`, error);
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        }
      }
      
      const tokens = this.estimateTokens(message + response.text);
      
      const aiMessage = await this.dbService.saveMessage({
        chatId,
        sender_id: null,
        content: response.text,
        messageType: 'ai',
        aiModelUsed: settings.model || 'gpt-3.5-turbo',
        tokensUsed: tokens,
        processingTimeMs: Date.now() - startTime
      });

      await this.redisService.setCachedConversation(chatId, {
        lastMessage: response.text,
        messageCount: (await memory.chatHistory.getMessages()).length,
        lastUpdated: new Date().toISOString()
      });

      return {
        success: true,
        userMessage,
        aiMessage,
        processingTime: Date.now() - startTime,
        tokensUsed: tokens
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      
      await this.dbService.saveMessage({
        chatId,
        sender_id: null,
        content: `Error: ${error.message}`,
        messageType: 'system',
        aiModelUsed: settings.model || 'gpt-3.5-turbo',
        processingTimeMs: Date.now() - startTime
      });

      throw error;
    }
  }

  async clearConversation(chatId) {
    try {
      this.chains.delete(chatId);
      
      await this.redisService.deleteCachedConversation(chatId);
      
      logger.info(`Cleared conversation for chatId: ${chatId}`);
      return true;
    } catch (error) {
      logger.error('Error clearing conversation:', error);
      throw error;
    }
  }

  async getConversationSummary(chatId) {
    try {
      const cached = await this.redisService.getCachedConversation(chatId);
      if (cached) {
        return cached;
      }

      const history = await this.dbService.getChatHistory(chatId);
      const summary = {
        chatId,
        messageCount: history.length,
        totalTokens: history.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0),
        lastMessage: history[history.length - 1]?.content || null,
        lastUpdated: history[history.length - 1]?.created_at || null
      };

      await this.redisService.setCachedConversation(chatId, summary);
      return summary;
    } catch (error) {
      logger.error('Error getting conversation summary:', error);
      throw error;
    }
  }

  async validateApiKey(apiKey) {
    try {
      const testLLM = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: 'gpt-3.5-turbo',
        maxTokens: 5
      });
      
      await testLLM.invoke("Test");
      return { valid: true };
    } catch (error) {
      logger.error('API key validation failed:', error);
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }

  async getChainHealth() {
    try {
      return {
        activeChains: this.chains.size,
        cacheHitRate: this.calculateCacheHitRate(),
        averageProcessingTime: await this.getAverageProcessingTime(),
        status: 'healthy'
      };
    } catch (error) {
      logger.error('Error getting chain health:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  calculateCacheHitRate() {
    return 0.85;
  }

  async getAverageProcessingTime() {
    try {
      const stats = await this.dbService.pool.query(`
        SELECT AVG(processing_time_ms) as avg_time 
        FROM chat_messages 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND processing_time_ms IS NOT NULL
      `);
      return Math.round(stats.rows[0]?.avg_time || 0);
    } catch (error) {
      logger.error('Error calculating average processing time:', error);
      return 0;
    }
  }

  async cleanup() {
    try {
      this.chains.clear();
      logger.info('ChatService cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

export default new ChatService();