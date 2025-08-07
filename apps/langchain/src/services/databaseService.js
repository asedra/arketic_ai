import pg from 'pg';
import winston from 'winston';

const { Pool } = pg;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class DatabaseService {
  // Chat and message management methods for WebSocket streaming
  
  
  async createAIMessagePlaceholder(chatId) {
    try {
      const client = await this.pool.connect();
      const result = await client.query(
        `INSERT INTO chat_messages (chat_id, content, message_type, created_at, status) 
         VALUES ($1, '', 'AI', NOW(), 'processing') 
         RETURNING id`,
        [chatId]
      );
      client.release();
      
      const messageId = result.rows[0].id;
      logger.info(`AI message placeholder created: ${messageId}`);
      return messageId;
    } catch (error) {
      logger.error('Error creating AI message placeholder:', error);
      throw error;
    }
  }
  
  async updateAIMessage(messageId, updateData) {
    const { content, tokensUsed, processingTimeMs, timestamp } = updateData;
    
    try {
      const client = await this.pool.connect();
      await client.query(
        `UPDATE chat_messages 
         SET content = $1, tokens_used = $2, processing_time_ms = $3, 
             updated_at = $4, status = 'completed' 
         WHERE id = $5`,
        [content, tokensUsed, processingTimeMs, timestamp, messageId]
      );
      client.release();
      
      logger.info(`AI message updated: ${messageId}`);
    } catch (error) {
      logger.error('Error updating AI message:', error);
      throw error;
    }
  }
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Use individual config options instead of connectionString to avoid IPv6 issues
      this.pool = new Pool({
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'arketic',
        password: process.env.DB_PASSWORD || 'arketic_dev_password',
        database: process.env.DB_NAME || 'arketic_dev',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        allowExitOnIdle: false
      });

      this.pool.on('error', (err) => {
        logger.error('Unexpected database pool error', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        logger.info('New database client connected');
      });

      this.pool.on('acquire', () => {
        logger.debug('Client acquired from pool');
      });

      this.pool.on('remove', () => {
        logger.debug('Client removed from pool');
      });

      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      logger.info('Database connection pool established successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection pool closed');
    }
  }

  async getChatHistory(chatId) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const query = `
        SELECT * FROM chat_messages 
        WHERE chat_id = $1 AND is_deleted = false 
        ORDER BY created_at ASC 
        LIMIT 50
      `;
      const result = await this.pool.query(query, [chatId]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching chat history:', error);
      throw error;
    }
  }

  async saveMessage(messageData) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const query = `
        INSERT INTO chat_messages 
        (id, chat_id, sender_id, content, message_type, ai_model_used, tokens_used, processing_time_ms, status, is_edited, is_deleted, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'SENT', false, false, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        messageData.chatId,
        messageData.sender_id || messageData.userId,
        messageData.content,
        messageData.messageType || 'text',
        messageData.aiModelUsed,
        messageData.tokensUsed || 0,
        messageData.processingTimeMs || 0
      ];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving message:', error);
      throw error;
    }
  }

  async updateMessage(messageId, updates) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const setClause = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClause.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      values.push(messageId);

      const query = `
        UPDATE chat_messages 
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const query = `
        UPDATE chat_messages 
        SET is_deleted = true, deleted_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [messageId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  async getUserConversations(userId, limit = 20, offset = 0) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const query = `
        SELECT DISTINCT ON (chat_id) 
          chat_id, 
          MAX(created_at) as last_message_at,
          COUNT(*) as message_count
        FROM chat_messages
        WHERE sender_id = $1 AND is_deleted = false
        GROUP BY chat_id
        ORDER BY chat_id, last_message_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await this.pool.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user conversations:', error);
      throw error;
    }
  }

  async beginTransaction() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async commitTransaction(client) {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  async rollbackTransaction(client) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  async executeInTransaction(callback) {
    const client = await this.beginTransaction();
    try {
      const result = await callback(client);
      await this.commitTransaction(client);
      return result;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const result = await this.pool.query('SELECT 1');
      return {
        status: 'healthy',
        connected: this.isConnected,
        poolSize: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  async getTokenUsageStats(userId, startDate, endDate) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const query = `
        SELECT 
          ai_model_used,
          COUNT(*) as message_count,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens,
          AVG(processing_time_ms) as avg_processing_time
        FROM chat_messages
        WHERE sender_id = $1 
          AND created_at >= $2 
          AND created_at <= $3
          AND is_deleted = false
        GROUP BY ai_model_used
        ORDER BY total_tokens DESC
      `;
      const result = await this.pool.query(query, [userId, startDate, endDate]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching token usage stats:', error);
      throw error;
    }
  }
}

export default new DatabaseService();