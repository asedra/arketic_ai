import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';

import PDFParser from './parsers/pdfParser.js';
import DOCXParser from './parsers/docxParser.js';
import MarkdownParser from './parsers/markdownParser.js';
import TextParser from './parsers/textParser.js';

import FixedSizeChunker from './chunking/fixedSizeChunker.js';
import SemanticChunker from './chunking/semanticChunker.js';
import RecursiveChunker from './chunking/recursiveChunker.js';

import EmbeddingService from './embeddings/embeddingService.js';

export class DocumentProcessor {
  constructor(options = {}) {
    this.parsers = {
      pdf: new PDFParser(options.pdfOptions),
      docx: new DOCXParser(options.docxOptions),
      markdown: new MarkdownParser(options.markdownOptions),
      text: new TextParser(options.textOptions)
    };
    
    this.chunkers = {
      'fixed-size': new FixedSizeChunker(options.fixedSizeOptions),
      'semantic': new SemanticChunker(options.semanticOptions),
      'recursive': new RecursiveChunker(options.recursiveOptions)
    };
    
    this.embeddingService = new EmbeddingService(options.embeddingOptions);
    
    this.defaultChunkingStrategy = options.defaultChunkingStrategy || 'recursive';
    this.generateEmbeddings = options.generateEmbeddings !== false;
    this.extractMetadata = options.extractMetadata !== false;
    
    this.processingQueue = [];
    this.isProcessing = false;
    this.maxConcurrentProcessing = options.maxConcurrentProcessing || 3;
  }

  async processDocument(input, options = {}) {
    const startTime = Date.now();
    const documentId = options.documentId || uuidv4();
    
    try {
      logger.info(`Starting document processing: ${documentId}`);
      
      const fileType = this.detectFileType(input, options);
      const parsedContent = await this.parseDocument(input, fileType, options);
      
      const chunkingStrategy = options.chunkingStrategy || this.defaultChunkingStrategy;
      const chunks = await this.chunkDocument(parsedContent, chunkingStrategy, options);
      
      let processedChunks = chunks.chunks;
      
      if (this.generateEmbeddings) {
        processedChunks = await this.embeddingService.generateForChunks(chunks.chunks);
      }
      
      const metadata = this.extractMetadata ? this.extractDocumentMetadata(parsedContent, chunks) : {};
      
      const result = {
        documentId,
        fileType,
        metadata: {
          ...metadata,
          ...parsedContent.metadata,
          ...chunks.metadata,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        },
        chunks: processedChunks,
        statistics: this.generateStatistics(processedChunks)
      };
      
      logger.info(`Document processed successfully: ${documentId} in ${result.metadata.processingTime}ms`);
      
      return result;
    } catch (error) {
      logger.error(`Document processing failed for ${documentId}:`, error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  detectFileType(input, options) {
    if (options.fileType) {
      return options.fileType;
    }
    
    if (options.filename) {
      const extension = options.filename.split('.').pop().toLowerCase();
      const typeMap = {
        'pdf': 'pdf',
        'docx': 'docx',
        'doc': 'docx',
        'md': 'markdown',
        'markdown': 'markdown',
        'txt': 'text',
        'text': 'text'
      };
      
      if (typeMap[extension]) {
        return typeMap[extension];
      }
    }
    
    if (typeof input === 'string') {
      if (input.includes('# ') || input.includes('## ')) {
        return 'markdown';
      }
      return 'text';
    }
    
    if (Buffer.isBuffer(input)) {
      const header = input.slice(0, 4).toString('hex');
      
      if (header === '25504446') {
        return 'pdf';
      }
      
      if (header === '504b0304') {
        return 'docx';
      }
    }
    
    return 'text';
  }

  async parseDocument(input, fileType, options = {}) {
    const parser = this.parsers[fileType];
    
    if (!parser) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    if (fileType === 'text' || fileType === 'markdown') {
      const content = typeof input === 'string' ? input : input.toString('utf-8');
      return await parser.parse(content);
    }
    
    return await parser.parse(input);
  }

  async chunkDocument(parsedContent, strategy, options = {}) {
    const chunker = this.chunkers[strategy];
    
    if (!chunker) {
      throw new Error(`Unknown chunking strategy: ${strategy}`);
    }
    
    const content = parsedContent.content || parsedContent.text || parsedContent.pageContent;
    
    return await chunker.chunk(content, {
      ...parsedContent.metadata,
      ...options.chunkMetadata
    });
  }

  extractDocumentMetadata(parsedContent, chunks) {
    const metadata = {
      title: parsedContent.metadata?.title || 'Untitled',
      author: parsedContent.metadata?.author || 'Unknown',
      creationDate: parsedContent.metadata?.creationDate || null,
      modificationDate: parsedContent.metadata?.modificationDate || null,
      pages: parsedContent.metadata?.pages || null,
      wordCount: parsedContent.metadata?.wordCount || 0,
      chunkCount: chunks.chunks.length,
      chunkingStrategy: chunks.metadata.strategy,
      averageChunkSize: chunks.metadata.averageChunkSize
    };
    
    return Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value !== null && value !== undefined)
    );
  }

  generateStatistics(chunks) {
    const stats = {
      totalChunks: chunks.length,
      totalTokens: 0,
      totalCharacters: 0,
      averageChunkSize: 0,
      minChunkSize: Infinity,
      maxChunkSize: 0
    };
    
    for (const chunk of chunks) {
      const size = chunk.content.length;
      stats.totalCharacters += size;
      stats.minChunkSize = Math.min(stats.minChunkSize, size);
      stats.maxChunkSize = Math.max(stats.maxChunkSize, size);
      
      if (chunk.metadata?.chunkSize) {
        stats.totalTokens += chunk.metadata.chunkSize;
      }
    }
    
    stats.averageChunkSize = stats.totalCharacters / chunks.length;
    
    return stats;
  }

  async processMultipleDocuments(documents, options = {}) {
    const results = [];
    const errors = [];
    
    const batchSize = options.batchSize || this.maxConcurrentProcessing;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (doc, index) => {
        try {
          const result = await this.processDocument(
            doc.content || doc.buffer,
            {
              ...options,
              documentId: doc.id || uuidv4(),
              filename: doc.filename,
              fileType: doc.fileType,
              ...doc.options
            }
          );
          
          return { success: true, result, index: i + index };
        } catch (error) {
          logger.error(`Failed to process document ${i + index}:`, error);
          return { success: false, error: error.message, index: i + index };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const item of batchResults) {
        if (item.success) {
          results.push(item.result);
        } else {
          errors.push({
            index: item.index,
            error: item.error
          });
        }
      }
    }
    
    return {
      successful: results,
      failed: errors,
      summary: {
        total: documents.length,
        succeeded: results.length,
        failed: errors.length
      }
    };
  }

  async processWithProgress(input, options = {}, progressCallback) {
    const stages = [
      { name: 'parsing', weight: 0.2 },
      { name: 'chunking', weight: 0.3 },
      { name: 'embedding', weight: 0.4 },
      { name: 'finalizing', weight: 0.1 }
    ];
    
    let currentProgress = 0;
    
    const updateProgress = (stage, completion = 1) => {
      const stageWeight = stages.find(s => s.name === stage)?.weight || 0;
      const progress = currentProgress + (stageWeight * completion);
      
      if (progressCallback) {
        progressCallback({
          stage,
          progress: Math.min(progress * 100, 100),
          message: `Processing: ${stage}`
        });
      }
    };
    
    try {
      updateProgress('parsing', 0);
      const fileType = this.detectFileType(input, options);
      const parsedContent = await this.parseDocument(input, fileType, options);
      currentProgress += stages[0].weight;
      updateProgress('parsing', 1);
      
      updateProgress('chunking', 0);
      const chunkingStrategy = options.chunkingStrategy || this.defaultChunkingStrategy;
      const chunks = await this.chunkDocument(parsedContent, chunkingStrategy, options);
      currentProgress += stages[1].weight;
      updateProgress('chunking', 1);
      
      let processedChunks = chunks.chunks;
      
      if (this.generateEmbeddings) {
        updateProgress('embedding', 0);
        
        const totalChunks = chunks.chunks.length;
        const batchSize = 10;
        
        for (let i = 0; i < totalChunks; i += batchSize) {
          const batch = chunks.chunks.slice(i, i + batchSize);
          const embeddedBatch = await this.embeddingService.generateForChunks(batch);
          
          for (let j = 0; j < embeddedBatch.length; j++) {
            processedChunks[i + j] = embeddedBatch[j];
          }
          
          updateProgress('embedding', (i + batchSize) / totalChunks);
        }
        
        currentProgress += stages[2].weight;
      }
      
      updateProgress('finalizing', 0);
      
      const metadata = this.extractMetadata ? this.extractDocumentMetadata(parsedContent, chunks) : {};
      
      const result = {
        documentId: options.documentId || uuidv4(),
        fileType,
        metadata,
        chunks: processedChunks,
        statistics: this.generateStatistics(processedChunks)
      };
      
      updateProgress('finalizing', 1);
      
      return result;
    } catch (error) {
      if (progressCallback) {
        progressCallback({
          stage: 'error',
          progress: 0,
          message: `Error: ${error.message}`
        });
      }
      throw error;
    }
  }

  async validateDocument(input, options = {}) {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      const fileType = this.detectFileType(input, options);
      
      if (!this.parsers[fileType]) {
        validationResult.isValid = false;
        validationResult.errors.push(`Unsupported file type: ${fileType}`);
        return validationResult;
      }
      
      const parsedContent = await this.parseDocument(input, fileType, options);
      
      if (!parsedContent.content || parsedContent.content.trim().length === 0) {
        validationResult.isValid = false;
        validationResult.errors.push('Document contains no extractable text');
      }
      
      if (parsedContent.content && parsedContent.content.length < 100) {
        validationResult.warnings.push('Document contains very little text (< 100 characters)');
      }
      
      if (parsedContent.content && parsedContent.content.length > 1000000) {
        validationResult.warnings.push('Document is very large (> 1M characters), processing may be slow');
      }
      
    } catch (error) {
      validationResult.isValid = false;
      validationResult.errors.push(`Validation failed: ${error.message}`);
    }
    
    return validationResult;
  }

  getMetrics() {
    return {
      embedding: this.embeddingService.getMetrics(),
      processingQueue: this.processingQueue.length,
      isProcessing: this.isProcessing
    };
  }
}

export default DocumentProcessor;