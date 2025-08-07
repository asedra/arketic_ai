import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import pkg from 'tiktoken';
const { encode } = pkg;
import logger from '../../../utils/logger.js';

export class FixedSizeChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
    this.lengthFunction = options.lengthFunction || this.tokenLength;
    this.separators = options.separators || ['\n\n', '\n', '. ', ' ', ''];
    this.keepSeparator = options.keepSeparator !== false;
  }

  tokenLength(text) {
    try {
      const tokens = encode(text);
      return tokens.length;
    } catch (error) {
      return text.length / 4;
    }
  }

  async chunk(text, metadata = {}) {
    try {
      const startTime = Date.now();
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
        lengthFunction: this.lengthFunction,
        separators: this.separators,
        keepSeparator: this.keepSeparator
      });
      
      const chunks = await splitter.splitText(text);
      
      const processedChunks = chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkSize: this.lengthFunction(chunk),
          strategy: 'fixed-size',
          overlap: this.chunkOverlap,
          position: {
            start: this.calculatePosition(text, chunk, index),
            end: this.calculatePosition(text, chunk, index) + chunk.length
          }
        }
      }));
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Fixed-size chunking completed: ${processedChunks.length} chunks in ${processingTime}ms`);
      
      return {
        chunks: processedChunks,
        metadata: {
          totalChunks: processedChunks.length,
          averageChunkSize: processedChunks.reduce((sum, c) => sum + c.metadata.chunkSize, 0) / processedChunks.length,
          processingTime,
          strategy: 'fixed-size',
          parameters: {
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap
          }
        }
      };
    } catch (error) {
      logger.error('Fixed-size chunking failed:', error);
      throw new Error(`Fixed-size chunking failed: ${error.message}`);
    }
  }

  calculatePosition(fullText, chunk, index) {
    if (index === 0) return 0;
    
    const position = fullText.indexOf(chunk);
    return position !== -1 ? position : 0;
  }

  async chunkWithContext(text, metadata = {}) {
    const baseChunks = await this.chunk(text, metadata);
    
    return {
      ...baseChunks,
      chunks: baseChunks.chunks.map((chunk, index) => ({
        ...chunk,
        context: {
          previous: index > 0 ? this.extractContext(baseChunks.chunks[index - 1].content, 100) : null,
          next: index < baseChunks.chunks.length - 1 ? this.extractContext(baseChunks.chunks[index + 1].content, 100) : null
        }
      }))
    };
  }

  extractContext(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    
    const sentenceEnd = text.indexOf('. ', 0);
    if (sentenceEnd !== -1 && sentenceEnd < maxLength) {
      return text.substring(0, sentenceEnd + 1);
    }
    
    return text.substring(0, maxLength) + '...';
  }

  async chunkDocuments(documents) {
    const allChunks = [];
    const metadata = {
      totalDocuments: documents.length,
      totalChunks: 0,
      processingTime: 0
    };
    
    const startTime = Date.now();
    
    for (const doc of documents) {
      const result = await this.chunk(doc.content || doc.pageContent, doc.metadata);
      allChunks.push(...result.chunks);
    }
    
    metadata.totalChunks = allChunks.length;
    metadata.processingTime = Date.now() - startTime;
    
    return {
      chunks: allChunks,
      metadata
    };
  }

  validateChunkSize(chunk) {
    const size = this.lengthFunction(chunk);
    
    if (size > this.chunkSize * 1.2) {
      logger.warn(`Chunk exceeds target size by more than 20%: ${size} > ${this.chunkSize * 1.2}`);
      return false;
    }
    
    if (size < this.chunkSize * 0.3 && chunk.length > 0) {
      logger.warn(`Chunk is less than 30% of target size: ${size} < ${this.chunkSize * 0.3}`);
      return false;
    }
    
    return true;
  }

  async optimizeChunkSize(text, targetChunks = 10) {
    const textLength = this.lengthFunction(text);
    const optimalChunkSize = Math.floor(textLength / targetChunks);
    const optimalOverlap = Math.floor(optimalChunkSize * 0.2);
    
    return {
      recommendedChunkSize: optimalChunkSize,
      recommendedOverlap: optimalOverlap,
      estimatedChunks: targetChunks,
      textLength
    };
  }
}

export default FixedSizeChunker;