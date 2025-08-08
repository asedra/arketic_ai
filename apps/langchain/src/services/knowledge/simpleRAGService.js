import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import logger from '../../utils/logger.js';
import DatabaseService from '../databaseService.js';

export class SimpleRAGService {
  constructor() {
    this.embeddings = null;
  }

  async initialize(apiKey) {
    try {
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: apiKey,
        dimensions: 1536
      });
      logger.info('Simple RAG service initialized');
    } catch (error) {
      logger.error('Failed to initialize Simple RAG service:', error);
      throw error;
    }
  }

  async searchKnowledgeBase(userQuery, knowledgeBaseIds, documentIds, apiKey) {
    try {
      logger.info('Searching knowledge base for query:', {
        query: userQuery,
        knowledgeBaseIds,
        documentIds
      });

      // Initialize embeddings if not already done
      if (!this.embeddings) {
        await this.initialize(apiKey);
      }

      // Generate embedding for the user query
      const queryEmbedding = await this.embeddings.embedQuery(userQuery);
      
      // Build the WHERE clause for filtering
      let whereConditions = [];
      let params = [JSON.stringify(queryEmbedding), 3]; // embedding and limit
      let paramIndex = 3;

      if (knowledgeBaseIds && knowledgeBaseIds.length > 0) {
        whereConditions.push(`ke.knowledge_base_id = ANY($${paramIndex}::uuid[])`);
        params.push(knowledgeBaseIds);
        paramIndex++;
      }

      if (documentIds && documentIds.length > 0) {
        whereConditions.push(`ke.document_id = ANY($${paramIndex}::uuid[])`);
        params.push(documentIds);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `AND ${whereConditions.join(' AND ')}` 
        : '';

      // Query the knowledge_embeddings table for similar chunks
      const sqlQuery = `
        SELECT 
          ke.id,
          ke.content,
          ke.chunk_index,
          ke.document_id,
          ke.knowledge_base_id,
          kd.title as document_title,
          kb.name as knowledge_base_name,
          1 - (ke.embedding <=> $1::vector) as similarity
        FROM knowledge_embeddings ke
        LEFT JOIN knowledge_documents kd ON ke.document_id = kd.id
        LEFT JOIN knowledge_bases kb ON ke.knowledge_base_id = kb.id
        WHERE ke.embedding IS NOT NULL
        ${whereClause}
        ORDER BY ke.embedding <=> $1::vector
        LIMIT $2
      `;

      logger.info('Executing similarity search query');
      const result = await DatabaseService.query(sqlQuery, params);
      
      if (result.rows.length === 0) {
        logger.info('No relevant chunks found in knowledge base');
        return [];
      }

      logger.info(`Found ${result.rows.length} relevant chunks`);
      
      // Return the top chunks with their content and metadata
      return result.rows.map((row, index) => ({
        content: row.content,
        documentTitle: row.document_title,
        knowledgeBaseName: row.knowledge_base_name,
        similarity: row.similarity,
        chunkIndex: row.chunk_index,
        rank: index + 1
      }));
    } catch (error) {
      logger.error('Knowledge base search failed:', error);
      // Return empty array on error to fallback to normal chat
      return [];
    }
  }

  async enhancePromptWithContext(userQuery, knowledgeChunks, systemPrompt) {
    if (!knowledgeChunks || knowledgeChunks.length === 0) {
      return {
        enhancedPrompt: systemPrompt,
        context: null
      };
    }

    // Build context from retrieved chunks
    const context = knowledgeChunks
      .map((chunk, idx) => 
        `[Kaynak ${idx + 1} - ${chunk.documentTitle || 'Belge'}]:\n${chunk.content}`
      )
      .join('\n\n');

    // Create enhanced system prompt
    const enhancedSystemPrompt = `${systemPrompt || 'You are a helpful AI assistant.'}

IMPORTANT: You have access to a knowledge base. Use the following context to answer the user's question accurately. If the context contains relevant information, use it in your response. If the context doesn't fully answer the question, you can provide additional general knowledge.

Context from Knowledge Base:
${context}

Please provide a comprehensive answer based on the above context.`;

    logger.info('Enhanced prompt with knowledge base context');
    
    return {
      enhancedPrompt: enhancedSystemPrompt,
      context: context,
      sources: knowledgeChunks.map(chunk => ({
        title: chunk.documentTitle,
        similarity: chunk.similarity
      }))
    };
  }

  async processWithRAG(message, apiKey, settings = {}) {
    try {
      const { knowledgeBaseIds, documentIds, systemPrompt, model, temperature, maxTokens } = settings;
      
      // Search knowledge base for relevant chunks (top 3)
      const knowledgeChunks = await this.searchKnowledgeBase(
        message,
        knowledgeBaseIds,
        documentIds,
        apiKey
      );

      // Enhance the prompt with context
      const { enhancedPrompt, context, sources } = await this.enhancePromptWithContext(
        message,
        knowledgeChunks,
        systemPrompt
      );

      // Log what we're sending
      logger.info('RAG processing:', {
        foundChunks: knowledgeChunks.length,
        hasContext: !!context,
        model: model || 'gpt-3.5-turbo'
      });

      // Return the enhanced settings for the LLM
      return {
        systemPrompt: enhancedPrompt,
        metadata: {
          ragUsed: true,
          chunksFound: knowledgeChunks.length,
          sources: sources
        }
      };
    } catch (error) {
      logger.error('RAG processing failed:', error);
      // Return original settings on error
      return {
        systemPrompt: settings.systemPrompt,
        metadata: {
          ragUsed: false,
          error: error.message
        }
      };
    }
  }
}

export default new SimpleRAGService();