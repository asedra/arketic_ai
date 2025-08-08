import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import logger from '../../utils/logger.js';
import config from '../../config/index.js';

export class RAGService {
  constructor(options = {}) {
    this.embeddings = null;
    this.vectorStore = null;
    this.retrievalChain = null;
    this.initialized = false;
    this.options = options;
  }

  async initialize(apiKey, knowledgeBaseIds = [], documentIds = []) {
    try {
      logger.info('Initializing RAG service with knowledge bases:', { knowledgeBaseIds, documentIds });
      
      // Initialize embeddings
      this.embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: apiKey || config.langchain.openai.apiKey,
        dimensions: 1536
      });

      // Initialize PGVector store with knowledge base filtering
      const pgConfig = {
        connectionString: config.database.connectionString || 
          `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`,
        tableName: 'knowledge_embeddings',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content',
          metadataColumnName: 'metadata'
        }
      };

      this.vectorStore = await PGVectorStore.initialize(this.embeddings, pgConfig);
      
      this.initialized = true;
      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw new Error(`RAG initialization failed: ${error.message}`);
    }
  }

  async searchSimilarDocuments(query, knowledgeBaseIds = [], documentIds = [], options = {}) {
    if (!this.initialized) {
      throw new Error('RAG service not initialized');
    }

    try {
      const k = options.k || 5; // Number of documents to retrieve
      const threshold = options.threshold || 0.7; // Similarity threshold
      
      // Build filter for knowledge bases and documents
      const filter = this.buildFilter(knowledgeBaseIds, documentIds);
      
      // Perform similarity search
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        k,
        filter
      );

      // Filter by similarity threshold
      const filteredResults = results.filter(([doc, score]) => score >= threshold);
      
      logger.info(`Found ${filteredResults.length} relevant documents for query`);
      
      return filteredResults.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: score
      }));
    } catch (error) {
      logger.error('Document search failed:', error);
      throw new Error(`Document search failed: ${error.message}`);
    }
  }

  async generateWithContext(query, apiKey, settings = {}) {
    try {
      const { knowledgeBaseIds = [], documentIds = [], systemPrompt, model, temperature, maxTokens } = settings;
      
      // Search for relevant documents
      const relevantDocs = await this.searchSimilarDocuments(
        query, 
        knowledgeBaseIds, 
        documentIds,
        { k: settings.retrievalK || 5 }
      );

      if (relevantDocs.length === 0) {
        logger.info('No relevant documents found, using standard generation');
        return null; // Fall back to standard chat without RAG
      }

      // Build context from retrieved documents
      const context = this.buildContext(relevantDocs);
      
      // Create enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(systemPrompt, context);
      
      // Initialize LLM
      const llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model || 'gpt-3.5-turbo',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2048
      });

      // Generate response with context
      const prompt = ChatPromptTemplate.fromTemplate(`
        {systemPrompt}
        
        Context information from knowledge base:
        {context}
        
        Based on the above context, please answer the following question:
        {query}
        
        If the context doesn't contain relevant information, please provide a general response.
      `);

      const chain = prompt.pipe(llm);
      
      const response = await chain.invoke({
        systemPrompt: enhancedPrompt,
        context: context,
        query: query
      });

      return {
        content: response.content,
        sources: relevantDocs.map(doc => ({
          title: doc.metadata.title || 'Unknown',
          knowledgeBaseId: doc.metadata.knowledge_base_id,
          documentId: doc.metadata.document_id,
          score: doc.score
        })),
        ragUsed: true
      };
    } catch (error) {
      logger.error('RAG generation failed:', error);
      throw new Error(`RAG generation failed: ${error.message}`);
    }
  }

  buildFilter(knowledgeBaseIds = [], documentIds = []) {
    const filter = {};
    
    if (knowledgeBaseIds.length > 0) {
      filter.knowledge_base_id = { $in: knowledgeBaseIds };
    }
    
    if (documentIds.length > 0) {
      filter.document_id = { $in: documentIds };
    }
    
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  buildContext(documents) {
    if (!documents || documents.length === 0) {
      return '';
    }

    return documents
      .map((doc, index) => `[${index + 1}] ${doc.content}`)
      .join('\n\n');
  }

  buildEnhancedPrompt(systemPrompt, hasContext) {
    const basePrompt = systemPrompt || 'You are a helpful AI assistant.';
    
    if (hasContext) {
      return `${basePrompt}\n\nYou have access to a knowledge base. Please use the provided context to answer questions accurately. If the context contains relevant information, prioritize it in your response.`;
    }
    
    return basePrompt;
  }

  async cleanup() {
    try {
      if (this.vectorStore) {
        await this.vectorStore.end();
      }
      this.initialized = false;
      logger.info('RAG service cleaned up');
    } catch (error) {
      logger.error('RAG cleanup failed:', error);
    }
  }

  getMetrics() {
    return {
      initialized: this.initialized,
      hasVectorStore: !!this.vectorStore,
      hasEmbeddings: !!this.embeddings
    };
  }
}

export default new RAGService();