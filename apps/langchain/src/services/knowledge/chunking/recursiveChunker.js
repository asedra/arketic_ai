import logger from '../../../utils/logger.js';

export class RecursiveChunker {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 1500;
    this.minChunkSize = options.minChunkSize || 100;
    this.maxDepth = options.maxDepth || 5;
    this.separators = options.separators || [
      '\n\n\n',
      '\n\n',
      '\n',
      '. ',
      ', ',
      ' '
    ];
    this.preserveStructure = options.preserveStructure !== false;
  }

  async chunk(text, metadata = {}) {
    try {
      const startTime = Date.now();
      
      const structure = this.analyzeStructure(text);
      
      const chunks = await this.recursiveSplit(text, 0, structure);
      
      const processedChunks = this.processChunks(chunks, metadata);
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Recursive chunking completed: ${processedChunks.length} chunks in ${processingTime}ms`);
      
      return {
        chunks: processedChunks,
        metadata: {
          totalChunks: processedChunks.length,
          averageChunkSize: processedChunks.reduce((sum, c) => sum + c.metadata.chunkSize, 0) / processedChunks.length,
          processingTime,
          strategy: 'recursive',
          structure,
          parameters: {
            maxChunkSize: this.maxChunkSize,
            minChunkSize: this.minChunkSize,
            maxDepth: this.maxDepth
          }
        }
      };
    } catch (error) {
      logger.error('Recursive chunking failed:', error);
      throw new Error(`Recursive chunking failed: ${error.message}`);
    }
  }

  analyzeStructure(text) {
    const structure = {
      hasMarkdownHeaders: /^#{1,6}\s/m.test(text),
      hasNumberedSections: /^\d+\.\s/m.test(text),
      hasBulletPoints: /^[\*\-\+]\s/m.test(text),
      hasCodeBlocks: /```[\s\S]*?```/.test(text),
      hasParagraphs: /\n\n/.test(text),
      estimatedSections: (text.match(/\n\n/g) || []).length + 1,
      documentType: 'unknown'
    };
    
    if (structure.hasMarkdownHeaders) {
      structure.documentType = 'markdown';
    } else if (structure.hasNumberedSections) {
      structure.documentType = 'structured';
    } else if (structure.hasParagraphs) {
      structure.documentType = 'prose';
    } else {
      structure.documentType = 'plain';
    }
    
    return structure;
  }

  async recursiveSplit(text, depth = 0, structure = null) {
    if (depth >= this.maxDepth || text.length <= this.maxChunkSize) {
      return [this.createChunk(text, depth, 'leaf')];
    }
    
    const separator = this.selectSeparator(text, depth, structure);
    const parts = this.splitBySeparator(text, separator);
    
    if (parts.length === 1) {
      if (depth < this.separators.length - 1) {
        return this.recursiveSplit(text, depth + 1, structure);
      } else {
        return this.forceSplit(text, depth);
      }
    }
    
    const chunks = [];
    let currentChunk = '';
    
    for (const part of parts) {
      const partWithSeparator = part + (separator.trim() ? separator : '');
      const combinedLength = currentChunk.length + partWithSeparator.length;
      
      if (combinedLength <= this.maxChunkSize && currentChunk) {
        currentChunk += partWithSeparator;
      } else {
        if (currentChunk.length >= this.minChunkSize) {
          chunks.push(this.createChunk(currentChunk, depth, 'combined'));
        }
        
        if (partWithSeparator.length > this.maxChunkSize) {
          const subChunks = await this.recursiveSplit(partWithSeparator, depth + 1, structure);
          chunks.push(...subChunks);
        } else {
          currentChunk = partWithSeparator;
        }
      }
    }
    
    if (currentChunk.length >= this.minChunkSize) {
      chunks.push(this.createChunk(currentChunk, depth, 'final'));
    }
    
    return chunks;
  }

  selectSeparator(text, depth, structure) {
    if (structure?.documentType === 'markdown' && depth === 0) {
      const headerMatch = text.match(/^#{1,6}\s/m);
      if (headerMatch) {
        return '\n' + headerMatch[0].substring(0, headerMatch[0].length - 1);
      }
    }
    
    if (depth < this.separators.length) {
      const separator = this.separators[depth];
      if (text.includes(separator)) {
        return separator;
      }
    }
    
    for (let i = depth; i < this.separators.length; i++) {
      if (text.includes(this.separators[i])) {
        return this.separators[i];
      }
    }
    
    return this.separators[this.separators.length - 1];
  }

  splitBySeparator(text, separator) {
    if (!separator || !text.includes(separator)) {
      return [text];
    }
    
    const parts = text.split(separator);
    
    return parts.filter(part => part.trim().length > 0);
  }

  forceSplit(text, depth) {
    const chunks = [];
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.ceil(this.maxChunkSize / 5);
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.length >= this.minChunkSize) {
        chunks.push(this.createChunk(chunkText, depth, 'forced'));
      }
    }
    
    return chunks;
  }

  createChunk(text, depth, type) {
    return {
      content: text.trim(),
      depth,
      type,
      size: text.length,
      wordCount: text.split(/\s+/).length
    };
  }

  processChunks(chunks, metadata) {
    return chunks.map((chunk, index) => {
      const processedChunk = {
        content: chunk.content,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkSize: chunk.size,
          wordCount: chunk.wordCount,
          depth: chunk.depth,
          chunkType: chunk.type,
          strategy: 'recursive'
        }
      };
      
      if (this.preserveStructure) {
        processedChunk.metadata.structure = this.extractChunkStructure(chunk.content);
      }
      
      return processedChunk;
    });
  }

  extractChunkStructure(text) {
    const structure = {
      hasHeaders: false,
      headerLevel: null,
      hasList: false,
      hasCode: false,
      paragraphs: 0
    };
    
    const headerMatch = text.match(/^(#{1,6})\s/m);
    if (headerMatch) {
      structure.hasHeaders = true;
      structure.headerLevel = headerMatch[1].length;
    }
    
    structure.hasList = /^[\*\-\+\d]+\.\s/m.test(text);
    structure.hasCode = /```|`[^`]+`/.test(text);
    structure.paragraphs = (text.match(/\n\n/g) || []).length + 1;
    
    return structure;
  }

  async chunkHierarchically(text, metadata = {}) {
    const chunks = await this.chunk(text, metadata);
    
    const hierarchy = this.buildHierarchy(chunks.chunks);
    
    return {
      ...chunks,
      hierarchy,
      chunks: chunks.chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          hierarchyPath: this.getHierarchyPath(hierarchy, index)
        }
      }))
    };
  }

  buildHierarchy(chunks) {
    const hierarchy = {
      root: {
        children: [],
        depth: 0
      }
    };
    
    let currentParent = hierarchy.root;
    const stack = [currentParent];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const depth = chunk.metadata.depth || 0;
      
      while (stack.length > depth + 1) {
        stack.pop();
      }
      
      currentParent = stack[stack.length - 1];
      
      const node = {
        index: i,
        depth,
        children: [],
        parent: currentParent
      };
      
      currentParent.children.push(node);
      
      if (i < chunks.length - 1 && chunks[i + 1].metadata.depth > depth) {
        stack.push(node);
      }
    }
    
    return hierarchy;
  }

  getHierarchyPath(hierarchy, targetIndex) {
    const path = [];
    
    const traverse = (node, currentPath) => {
      if (node.index === targetIndex) {
        path.push(...currentPath, targetIndex);
        return true;
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (traverse(child, [...currentPath, node.index || 0])) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    traverse(hierarchy.root, []);
    
    return path;
  }

  async optimizeChunking(text, sampleSize = 100) {
    const strategies = [
      { maxChunkSize: 1000, minChunkSize: 100 },
      { maxChunkSize: 1500, minChunkSize: 200 },
      { maxChunkSize: 2000, minChunkSize: 300 }
    ];
    
    const results = [];
    
    for (const strategy of strategies) {
      const chunker = new RecursiveChunker(strategy);
      const result = await chunker.chunk(text.substring(0, sampleSize * 100));
      
      results.push({
        strategy,
        chunkCount: result.chunks.length,
        avgSize: result.metadata.averageChunkSize,
        processingTime: result.metadata.processingTime
      });
    }
    
    const optimal = results.reduce((best, current) => {
      const score = current.avgSize / current.processingTime;
      const bestScore = best.avgSize / best.processingTime;
      return score > bestScore ? current : best;
    });
    
    return optimal.strategy;
  }
}

export default RecursiveChunker;