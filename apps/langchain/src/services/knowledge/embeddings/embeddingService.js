import { OpenAIEmbeddings } from '@langchain/openai';
import logger from '../../../utils/logger.js';
import config from '../../../config/index.js';

export class EmbeddingService {
  constructor(options = {}) {
    this.model = options.model || 'text-embedding-3-small';
    this.batchSize = options.batchSize || 100;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.dimensions = options.dimensions || 1536;
    
    this.embeddings = new OpenAIEmbeddings({
      modelName: this.model,
      openAIApiKey: options.apiKey || config.langchain.openai.apiKey,
      maxConcurrency: options.maxConcurrency || 5,
      maxRetries: this.maxRetries,
      timeout: options.timeout || 30000
    });
    
    this.cache = new Map();
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheMaxSize = options.cacheMaxSize || 1000;
    
    this.metrics = {
      totalEmbeddings: 0,
      cachedHits: 0,
      apiCalls: 0,
      errors: 0,
      totalTokens: 0,
      processingTime: []
    };
  }

  async generateEmbeddings(texts, options = {}) {
    try {
      const startTime = Date.now();
      
      if (!Array.isArray(texts)) {
        texts = [texts];
      }
      
      const results = [];
      const uncachedTexts = [];
      const uncachedIndices = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = this.getCacheKey(text);
        
        if (this.cacheEnabled && this.cache.has(cacheKey)) {
          results[i] = this.cache.get(cacheKey);
          this.metrics.cachedHits++;
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(i);
        }
      }
      
      if (uncachedTexts.length > 0) {
        const embeddings = await this.batchGenerate(uncachedTexts, options);
        
        for (let i = 0; i < embeddings.length; i++) {
          const originalIndex = uncachedIndices[i];
          const text = uncachedTexts[i];
          const embedding = embeddings[i];
          
          results[originalIndex] = embedding;
          
          if (this.cacheEnabled) {
            this.addToCache(text, embedding);
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      this.metrics.processingTime.push(processingTime);
      this.metrics.totalEmbeddings += texts.length;
      
      logger.info(`Generated ${texts.length} embeddings (${uncachedTexts.length} new, ${texts.length - uncachedTexts.length} cached) in ${processingTime}ms`);
      
      return results;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to generate embeddings:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  async batchGenerate(texts, options = {}) {
    const batches = this.createBatches(texts, this.batchSize);
    const allEmbeddings = [];
    
    for (const batch of batches) {
      let retries = 0;
      let embeddings = null;
      
      while (retries < this.maxRetries && !embeddings) {
        try {
          embeddings = await this.embeddings.embedDocuments(batch);
          this.metrics.apiCalls++;
        } catch (error) {
          retries++;
          
          if (retries >= this.maxRetries) {
            throw error;
          }
          
          logger.warn(`Embedding generation failed, retrying (${retries}/${this.maxRetries}):`, error.message);
          
          await this.delay(this.retryDelay * retries);
        }
      }
      
      allEmbeddings.push(...embeddings);
    }
    
    return allEmbeddings;
  }

  createBatches(items, batchSize) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  async generateSingleEmbedding(text, options = {}) {
    const embeddings = await this.generateEmbeddings([text], options);
    return embeddings[0];
  }

  async generateForDocuments(documents, options = {}) {
    const texts = documents.map(doc => doc.pageContent || doc.content || doc.text);
    const embeddings = await this.generateEmbeddings(texts, options);
    
    return documents.map((doc, index) => ({
      ...doc,
      embedding: embeddings[index],
      embeddingMetadata: {
        model: this.model,
        dimensions: this.dimensions,
        timestamp: new Date().toISOString()
      }
    }));
  }

  async generateForChunks(chunks, options = {}) {
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(texts, options);
    
    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
      metadata: {
        ...chunk.metadata,
        embeddingModel: this.model,
        embeddingDimensions: this.dimensions,
        embeddingTimestamp: new Date().toISOString()
      }
    }));
  }

  getCacheKey(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text + this.model).digest('hex');
  }

  addToCache(text, embedding) {
    const key = this.getCacheKey(text);
    
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, embedding);
  }

  clearCache() {
    this.cache.clear();
    logger.info('Embedding cache cleared');
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testConnection() {
    try {
      const testText = 'Test embedding generation';
      const embedding = await this.generateSingleEmbedding(testText);
      
      if (!embedding || embedding.length !== this.dimensions) {
        throw new Error(`Invalid embedding dimensions: expected ${this.dimensions}, got ${embedding?.length}`);
      }
      
      logger.info('Embedding service connection test successful');
      return true;
    } catch (error) {
      logger.error('Embedding service connection test failed:', error);
      return false;
    }
  }

  getMetrics() {
    const avgProcessingTime = this.metrics.processingTime.length > 0
      ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length
      : 0;
    
    return {
      ...this.metrics,
      avgProcessingTime,
      cacheHitRate: this.metrics.totalEmbeddings > 0
        ? (this.metrics.cachedHits / this.metrics.totalEmbeddings) * 100
        : 0,
      errorRate: this.metrics.apiCalls > 0
        ? (this.metrics.errors / this.metrics.apiCalls) * 100
        : 0
    };
  }

  async calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      throw new Error('Invalid embeddings for similarity calculation');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (norm1 * norm2);
  }

  async findSimilar(queryEmbedding, embeddings, topK = 5, threshold = 0.7) {
    const similarities = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      const similarity = await this.calculateSimilarity(queryEmbedding, embeddings[i]);
      
      if (similarity >= threshold) {
        similarities.push({
          index: i,
          similarity
        });
      }
    }
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK);
  }

  async enrichWithMetadata(embeddings, metadata = {}) {
    return embeddings.map((embedding, index) => ({
      embedding,
      metadata: {
        ...metadata,
        index,
        model: this.model,
        dimensions: this.dimensions,
        timestamp: new Date().toISOString()
      }
    }));
  }
}

export default EmbeddingService;