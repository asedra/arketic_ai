import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { streamCompletion } from './langchain.js';

export class SocketService {
  constructor(io) {
    this.io = io;
    this.connections = new Map();
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, config.auth.jwtSecret);
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    logger.info(`New socket connection: ${socket.id}`);
    this.connections.set(socket.id, {
      userId: socket.userId,
      socket: socket
    });

    socket.on('chat:message', async (data) => {
      await this.handleChatMessage(socket, data);
    });

    socket.on('chat:stream', async (data) => {
      await this.handleStreamChat(socket, data);
    });

    socket.on('chain:execute', async (data) => {
      await this.handleChainExecution(socket, data);
    });

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  }

  async handleChatMessage(socket, data) {
    try {
      const { message, conversationId, provider = 'openai' } = data;
      
      socket.emit('chat:processing', { conversationId });
      
      const { generateCompletion } = await import('./langchain.js');
      const response = await generateCompletion(message, { provider });
      
      socket.emit('chat:response', {
        conversationId,
        message: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling chat message:', error);
      socket.emit('chat:error', {
        error: error.message,
        conversationId: data.conversationId
      });
    }
  }

  async handleStreamChat(socket, data) {
    try {
      const { message, conversationId, provider = 'openai' } = data;
      
      socket.emit('stream:start', { conversationId });
      
      let fullResponse = '';
      for await (const chunk of streamCompletion(message, { provider })) {
        fullResponse += chunk;
        socket.emit('stream:chunk', {
          conversationId,
          chunk,
          timestamp: new Date().toISOString()
        });
      }
      
      socket.emit('stream:end', {
        conversationId,
        fullResponse,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling stream chat:', error);
      socket.emit('stream:error', {
        error: error.message,
        conversationId: data.conversationId
      });
    }
  }

  async handleChainExecution(socket, data) {
    try {
      const { chainType, input, conversationId } = data;
      
      socket.emit('chain:processing', { conversationId });
      
      const { createConversationChain } = await import('./langchain.js');
      const chain = await createConversationChain();
      const response = await chain.call({ input });
      
      socket.emit('chain:response', {
        conversationId,
        response: response.response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling chain execution:', error);
      socket.emit('chain:error', {
        error: error.message,
        conversationId: data.conversationId
      });
    }
  }

  handleDisconnection(socket) {
    logger.info(`Socket disconnected: ${socket.id}`);
    this.connections.delete(socket.id);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  sendToUser(userId, event, data) {
    for (const [socketId, connection] of this.connections.entries()) {
      if (connection.userId === userId) {
        connection.socket.emit(event, data);
      }
    }
  }

  getConnectionCount() {
    return this.connections.size;
  }

  getConnectedUsers() {
    const users = new Set();
    for (const connection of this.connections.values()) {
      users.add(connection.userId);
    }
    return Array.from(users);
  }
}