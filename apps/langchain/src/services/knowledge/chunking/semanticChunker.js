import { OpenAIEmbeddings } from '@langchain/openai';
import logger from '../../../utils/logger.js';

export class SemanticChunker {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 1500;
    this.minChunkSize = options.minChunkSize || 100;
    this.similarityThreshold = options.similarityThreshold || 0.5;
    this.sentenceGroupSize = options.sentenceGroupSize || 3;
    this.embeddings = options.embeddings || new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small'
    });
  }

  async chunk(text, metadata = {}) {
    try {
      const startTime = Date.now();
      
      const sentences = this.splitIntoSentences(text);
      const sentenceGroups = this.groupSentences(sentences, this.sentenceGroupSize);
      
      const embeddings = await this.generateEmbeddings(sentenceGroups);
      
      const semanticChunks = await this.createSemanticChunks(sentenceGroups, embeddings);
      
      const processedChunks = semanticChunks.map((chunk, index) => ({
        content: chunk.text,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: semanticChunks.length,
          chunkSize: chunk.text.length,
          sentenceCount: chunk.sentences,
          strategy: 'semantic',
          similarityScore: chunk.similarityScore,
          position: {
            start: text.indexOf(chunk.text),
            end: text.indexOf(chunk.text) + chunk.text.length
          }
        }
      }));
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Semantic chunking completed: ${processedChunks.length} chunks in ${processingTime}ms`);
      
      return {
        chunks: processedChunks,
        metadata: {
          totalChunks: processedChunks.length,
          averageChunkSize: processedChunks.reduce((sum, c) => sum + c.metadata.chunkSize, 0) / processedChunks.length,
          processingTime,
          strategy: 'semantic',
          parameters: {
            maxChunkSize: this.maxChunkSize,
            minChunkSize: this.minChunkSize,
            similarityThreshold: this.similarityThreshold
          }
        }
      };
    } catch (error) {
      logger.error('Semantic chunking failed:', error);
      throw new Error(`Semantic chunking failed: ${error.message}`);
    }
  }

  splitIntoSentences(text) {
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentencePattern) || [];
    
    const processedSentences = [];
    let currentSentence = '';
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      
      if (this.isCompleteSentence(trimmed)) {
        if (currentSentence) {
          processedSentences.push(currentSentence);
          currentSentence = '';
        }
        processedSentences.push(trimmed);
      } else {
        currentSentence += ' ' + trimmed;
      }
    }
    
    if (currentSentence) {
      processedSentences.push(currentSentence.trim());
    }
    
    return processedSentences;
  }

  isCompleteSentence(sentence) {
    const minWords = 3;
    const words = sentence.split(/\s+/);
    
    if (words.length < minWords) return false;
    
    const abbreviations = /\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Inc|Ltd|Corp|Co|etc|vs|i\.e|e\.g)\./i;
    if (abbreviations.test(sentence)) {
      return sentence.length > 20;
    }
    
    return /[.!?]$/.test(sentence);
  }

  groupSentences(sentences, groupSize) {
    const groups = [];
    
    for (let i = 0; i < sentences.length; i += Math.floor(groupSize / 2)) {
      const group = sentences.slice(i, i + groupSize);
      if (group.length > 0) {
        groups.push({
          text: group.join(' '),
          sentences: group,
          startIndex: i,
          endIndex: Math.min(i + groupSize - 1, sentences.length - 1)
        });
      }
    }
    
    return groups;
  }

  async generateEmbeddings(sentenceGroups) {
    try {
      const texts = sentenceGroups.map(group => group.text);
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async createSemanticChunks(sentenceGroups, embeddings) {
    const chunks = [];
    let currentChunk = {
      text: '',
      sentences: 0,
      groups: [],
      embedding: null
    };
    
    for (let i = 0; i < sentenceGroups.length; i++) {
      const group = sentenceGroups[i];
      const embedding = embeddings[i];
      
      if (currentChunk.text === '') {
        currentChunk.text = group.text;
        currentChunk.sentences = group.sentences.length;
        currentChunk.groups.push(i);
        currentChunk.embedding = embedding;
      } else {
        const similarity = this.cosineSimilarity(currentChunk.embedding, embedding);
        
        const combinedLength = currentChunk.text.length + group.text.length;
        
        if (similarity >= this.similarityThreshold && combinedLength <= this.maxChunkSize) {
          currentChunk.text += ' ' + group.text;
          currentChunk.sentences += group.sentences.length;
          currentChunk.groups.push(i);
          currentChunk.embedding = this.averageEmbeddings([currentChunk.embedding, embedding]);
        } else {
          if (currentChunk.text.length >= this.minChunkSize) {
            chunks.push({
              ...currentChunk,
              similarityScore: similarity
            });
          }
          
          currentChunk = {
            text: group.text,
            sentences: group.sentences.length,
            groups: [i],
            embedding
          };
        }
      }
    }
    
    if (currentChunk.text.length >= this.minChunkSize) {
      chunks.push({
        ...currentChunk,
        similarityScore: 1.0
      });
    }
    
    return chunks;
  }

  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (norm1 * norm2);
  }

  averageEmbeddings(embeddings) {
    if (embeddings.length === 0) return null;
    if (embeddings.length === 1) return embeddings[0];
    
    const avgEmbedding = new Array(embeddings[0].length).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        avgEmbedding[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < avgEmbedding.length; i++) {
      avgEmbedding[i] /= embeddings.length;
    }
    
    return avgEmbedding;
  }

  async chunkWithTopics(text, metadata = {}) {
    const baseChunks = await this.chunk(text, metadata);
    
    const topics = await this.extractTopics(baseChunks.chunks);
    
    return {
      ...baseChunks,
      chunks: baseChunks.chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          topics: topics[index] || []
        }
      }))
    };
  }

  async extractTopics(chunks) {
    const topics = [];
    
    for (const chunk of chunks) {
      const keywords = this.extractKeywords(chunk.content);
      topics.push(keywords.slice(0, 5));
    }
    
    return topics;
  }

  extractKeywords(text) {
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordFreq = {};
    
    const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'what', 'when', 'where', 'which', 'while', 'about', 'after', 'before', 'during', 'through']);
    
    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }
}

export default SemanticChunker;