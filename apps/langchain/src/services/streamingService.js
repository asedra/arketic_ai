import logger from '../utils/logger.js';
import databaseService from './databaseService.js';
import { streamCompletion } from './langchain.js';

export class StreamingService {
  constructor() {
    this.dbService = databaseService;
  }

  async handleStreamingMessage(socket, data) {
    const { chatId, message, userId, apiKey, settings = {} } = data;
    const startTime = Date.now();
    
    try {
      logger.info(`Starting streaming message for chat ${chatId} from user ${userId}`);
      
      // Save user message
      const userMessage = await this.dbService.saveMessage({
        chatId,
        userId,
        content: message,
        messageType: 'USER',
        timestamp: new Date().toISOString()
      });

      // Emit user message to all participants in the chat room
      socket.to(`chat-${chatId}`).emit('new-message', {
        type: 'user',
        message: userMessage,
        timestamp: new Date().toISOString()
      });

      // Create AI message placeholder
      const aiMessageId = await this.dbService.createAIMessagePlaceholder(chatId);
      
      // Emit AI response start event
      const startEvent = {
        messageId: aiMessageId,
        chatId,
        timestamp: new Date().toISOString()
      };
      
      socket.emit('ai-response-start', startEvent);
      socket.to(`chat-${chatId}`).emit('ai-response-start', startEvent);

      // Initialize streaming response
      let fullResponse = '';
      const provider = settings.provider || 'openai';
      
      logger.info(`Starting streaming completion for message: ${message.substring(0, 100)}...`);
      
      // Stream response using LangChain
      const stream = streamCompletion(message, { 
        provider,
        apiKey: apiKey || settings.apiKey,
        ...settings 
      });
      
      for await (const chunk of stream) {
        const chunkContent = chunk.content || chunk;
        fullResponse += chunkContent;
        
        // Emit chunk to all participants in the room
        const chunkData = {
          messageId: aiMessageId,
          chunk: chunkContent,
          fullContent: fullResponse,
          timestamp: new Date().toISOString()
        };
        
        socket.emit('ai-response-chunk', chunkData);
        socket.to(`chat-${chatId}`).emit('ai-response-chunk', chunkData);
      }

      // Update AI message in database with complete response
      await this.dbService.updateAIMessage(aiMessageId, {
        content: fullResponse,
        tokensUsed: this.estimateTokens(message + fullResponse),
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      // Emit completion event
      const completionData = {
        type: 'ai-response-complete',
        messageId: aiMessageId,
        chatId,
        content: fullResponse,
        processingTime: Date.now() - startTime,
        tokensUsed: this.estimateTokens(fullResponse),
        timestamp: new Date().toISOString()
      };
      
      socket.emit('ai-response-complete', completionData);
      socket.to(`chat-${chatId}`).emit('ai-response-complete', completionData);
      
      logger.info(`Completed streaming response for chat ${chatId}. Processing time: ${Date.now() - startTime}ms`);
      
    } catch (error) {
      logger.error('Streaming error:', {
        error: error.message,
        stack: error.stack,
        chatId,
        userId
      });
      
      // Emit error to all participants in the room
      const errorData = {
        error: error.message,
        chatId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      socket.emit('ai-error', errorData);
      socket.to(`chat-${chatId}`).emit('ai-error', errorData);
    }
  }

  estimateTokens(text) {
    // Simple token estimation (approximately 4 characters per token)
    return Math.ceil(text.length / 4);
  }

  async getOrCreateChain(chatId, apiKey, settings) {
    // This method can be expanded to manage conversation chains and memory
    // For now, we'll use the basic streaming completion
    return {
      settings: {
        provider: settings.provider || 'openai',
        apiKey: apiKey || settings.apiKey,
        ...settings
      }
    };
  }
}

export default StreamingService;