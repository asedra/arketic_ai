import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import config from '../config/config.js';
import { StreamingService } from '../services/streamingService.js';

export function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.app.corsOrigin || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true
  });

  const streamingService = new StreamingService();
  const activeConnections = new Map(); // Track active connections

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      if (!token) {
        logger.warn('Socket connection attempted without authentication token');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, config.auth.jwtSecret);
      socket.userId = decoded.userId || decoded.user_id;
      socket.userEmail = decoded.email;
      
      logger.info(`Socket authenticated for user ${socket.userId}`);
      next();
    } catch (err) {
      logger.error('Socket authentication error:', {
        error: err.message,
        socketId: socket.id
      });
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    logger.info(`New socket connection: ${socket.id} (User: ${socket.userId})`);
    
    // Store connection info
    activeConnections.set(socket.id, {
      userId: socket.userId,
      userEmail: socket.userEmail,
      connectedAt: new Date().toISOString(),
      rooms: new Set()
    });

    // Send connection confirmation
    socket.emit('connection-confirmed', {
      socketId: socket.id,
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });

    // Chat room management
    socket.on('join-chat', (data) => {
      const { chatId } = data;
      const roomName = `chat-${chatId}`;
      
      socket.join(roomName);
      activeConnections.get(socket.id).rooms.add(roomName);
      
      logger.info(`User ${socket.userId} joined chat room: ${chatId}`);
      
      // Notify others in the room
      socket.to(roomName).emit('user-joined', {
        userId: socket.userId,
        chatId,
        timestamp: new Date().toISOString()
      });
      
      // Confirm to the user
      socket.emit('joined-chat', { 
        chatId,
        roomName,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('leave-chat', (data) => {
      const { chatId } = data;
      const roomName = `chat-${chatId}`;
      
      socket.leave(roomName);
      activeConnections.get(socket.id).rooms.delete(roomName);
      
      logger.info(`User ${socket.userId} left chat room: ${chatId}`);
      
      // Notify others in the room
      socket.to(roomName).emit('user-left', {
        userId: socket.userId,
        chatId,
        timestamp: new Date().toISOString()
      });
    });

    // Streaming chat message handling
    socket.on('chat-message', async (data) => {
      try {
        logger.info(`Received chat message from user ${socket.userId}:`, {
          chatId: data.chatId,
          messageLength: data.message?.length || 0
        });
        
        await streamingService.handleStreamingMessage(socket, {
          ...data,
          userId: socket.userId
        });
      } catch (error) {
        logger.error('Error handling chat message:', {
          error: error.message,
          userId: socket.userId,
          chatId: data.chatId
        });
        
        socket.emit('chat-error', {
          error: 'Failed to process message',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
      const { chatId } = data;
      socket.to(`chat-${chatId}`).emit('user-typing', {
        userId: socket.userId,
        chatId,
        typing: true,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing-stop', (data) => {
      const { chatId } = data;
      socket.to(`chat-${chatId}`).emit('user-typing', {
        userId: socket.userId,
        chatId,
        typing: false,
        timestamp: new Date().toISOString()
      });
    });

    // Connection status ping/pong
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id} (User: ${socket.userId}):`, {
        error: error.message,
        stack: error.stack
      });
    });

    // Disconnection handling
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userId}) - Reason: ${reason}`);
      
      // Notify all rooms this user was in
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.rooms.forEach(roomName => {
          socket.to(roomName).emit('user-disconnected', {
            userId: socket.userId,
            timestamp: new Date().toISOString(),
            reason
          });
        });
        
        activeConnections.delete(socket.id);
      }
    });

    // Handle reconnection
    socket.on('reconnect-request', (data) => {
      const { previousRooms = [] } = data;
      
      logger.info(`Reconnection request from user ${socket.userId}`);
      
      // Rejoin previous rooms
      previousRooms.forEach(chatId => {
        const roomName = `chat-${chatId}`;
        socket.join(roomName);
        activeConnections.get(socket.id).rooms.add(roomName);
        
        socket.to(roomName).emit('user-rejoined', {
          userId: socket.userId,
          chatId,
          timestamp: new Date().toISOString()
        });
      });
      
      socket.emit('reconnect-complete', {
        rejoinedRooms: previousRooms,
        timestamp: new Date().toISOString()
      });
    });
  });

  // Periodic connection cleanup and health monitoring
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const staleConnections = [];
    
    activeConnections.forEach((connection, socketId) => {
      const connectedAt = new Date(connection.connectedAt).getTime();
      if (now - connectedAt > 24 * 60 * 60 * 1000) { // 24 hours
        staleConnections.push(socketId);
      }
    });
    
    staleConnections.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      activeConnections.delete(socketId);
    });
    
    if (staleConnections.length > 0) {
      logger.info(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }, 60 * 60 * 1000); // Run every hour

  // Graceful shutdown
  const gracefulShutdown = () => {
    logger.info('Gracefully shutting down Socket.IO server...');
    
    clearInterval(cleanupInterval);
    
    // Notify all clients of server shutdown
    io.emit('server-shutdown', {
      message: 'Server is shutting down. Please reconnect in a few moments.',
      timestamp: new Date().toISOString()
    });
    
    // Close all connections
    io.close((err) => {
      if (err) {
        logger.error('Error during Socket.IO shutdown:', err);
      } else {
        logger.info('Socket.IO server closed successfully');
      }
    });
  };

  // Export graceful shutdown function for use in main server
  io.gracefulShutdown = gracefulShutdown;

  // Statistics and monitoring
  io.getStats = () => ({
    totalConnections: activeConnections.size,
    connectedUsers: [...new Set([...activeConnections.values()].map(c => c.userId))].length,
    rooms: io.sockets.adapter.rooms.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });

  logger.info('Socket.IO server initialized successfully');
  
  return io;
}

export default setupWebSocket;