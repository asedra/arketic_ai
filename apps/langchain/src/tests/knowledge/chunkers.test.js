import { describe, it, expect, beforeAll } from '@jest/globals';
import FixedSizeChunker from '../../services/knowledge/chunking/fixedSizeChunker.js';
import SemanticChunker from '../../services/knowledge/chunking/semanticChunker.js';
import RecursiveChunker from '../../services/knowledge/chunking/recursiveChunker.js';

describe('Document Chunkers', () => {
  const sampleText = `This is a sample document for testing chunking strategies. It contains multiple paragraphs and sentences.

The second paragraph discusses different topics. We need to ensure that the chunking algorithms work correctly. They should split the text appropriately.

Here's another paragraph with more content. The chunking strategies should handle various text structures. This includes short sentences. And also longer, more complex sentences with multiple clauses that span several lines and contain various punctuation marks.

Final paragraph to test the chunking. Each strategy has its own approach. Fixed-size chunks based on character or token count. Semantic chunks based on meaning. Recursive chunks based on structure.`;

  describe('FixedSizeChunker', () => {
    let chunker;
    
    beforeAll(() => {
      chunker = new FixedSizeChunker({
        chunkSize: 200,
        chunkOverlap: 50
      });
    });
    
    it('should create fixed-size chunks', async () => {
      const result = await chunker.chunk(sampleText);
      
      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.metadata.strategy).toBe('fixed-size');
    });
    
    it('should respect chunk size limits', async () => {
      const result = await chunker.chunk(sampleText);
      
      for (const chunk of result.chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(250);
      }
    });
    
    it('should include overlap between chunks', async () => {
      const result = await chunker.chunk(sampleText);
      
      if (result.chunks.length > 1) {
        const firstChunkEnd = result.chunks[0].content.slice(-30);
        const secondChunkStart = result.chunks[1].content.slice(0, 30);
        
        expect(result.chunks[0].content.length).toBeGreaterThan(0);
        expect(result.chunks[1].content.length).toBeGreaterThan(0);
      }
    });
    
    it('should add context to chunks', async () => {
      const result = await chunker.chunkWithContext(sampleText);
      
      if (result.chunks.length > 1) {
        expect(result.chunks[1].context.previous).toBeDefined();
        expect(result.chunks[0].context.next).toBeDefined();
      }
    });
    
    it('should validate chunk sizes', () => {
      const validChunk = 'a'.repeat(200);
      const tooLarge = 'a'.repeat(300);
      const tooSmall = 'a'.repeat(50);
      
      expect(chunker.validateChunkSize(validChunk)).toBe(true);
      expect(chunker.validateChunkSize(tooLarge)).toBe(false);
      expect(chunker.validateChunkSize(tooSmall)).toBe(false);
    });
    
    it('should optimize chunk size', async () => {
      const optimization = await chunker.optimizeChunkSize(sampleText, 5);
      
      expect(optimization.recommendedChunkSize).toBeGreaterThan(0);
      expect(optimization.recommendedOverlap).toBeGreaterThan(0);
      expect(optimization.estimatedChunks).toBe(5);
    });
  });
  
  describe('SemanticChunker', () => {
    let chunker;
    
    beforeAll(() => {
      chunker = new SemanticChunker({
        maxChunkSize: 500,
        minChunkSize: 100,
        similarityThreshold: 0.5,
        embeddings: null
      });
    });
    
    it('should split text into sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence? Fourth.';
      const sentences = chunker.splitIntoSentences(text);
      
      expect(sentences).toHaveLength(4);
      expect(sentences[0]).toBe('First sentence.');
      expect(sentences[1]).toBe('Second sentence!');
    });
    
    it('should identify complete sentences', () => {
      expect(chunker.isCompleteSentence('This is a complete sentence.')).toBe(true);
      expect(chunker.isCompleteSentence('Dr.')).toBe(false);
      expect(chunker.isCompleteSentence('A B')).toBe(false);
    });
    
    it('should group sentences', () => {
      const sentences = ['Sentence 1.', 'Sentence 2.', 'Sentence 3.', 'Sentence 4.', 'Sentence 5.'];
      const groups = chunker.groupSentences(sentences, 3);
      
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].sentences).toHaveLength(3);
      expect(groups[0].startIndex).toBe(0);
      expect(groups[0].endIndex).toBe(2);
    });
    
    it('should calculate cosine similarity', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const vec3 = [0, 1, 0];
      
      expect(chunker.cosineSimilarity(vec1, vec2)).toBeCloseTo(1.0);
      expect(chunker.cosineSimilarity(vec1, vec3)).toBeCloseTo(0.0);
    });
    
    it('should average embeddings', () => {
      const embeddings = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const average = chunker.averageEmbeddings(embeddings);
      
      expect(average).toEqual([4, 5, 6]);
    });
    
    it('should extract keywords', () => {
      const text = 'The quick brown fox jumps over the lazy dog repeatedly. The fox is very quick.';
      const keywords = chunker.extractKeywords(text);
      
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
      expect(keywords).not.toContain('the');
    });
  });
  
  describe('RecursiveChunker', () => {
    let chunker;
    
    beforeAll(() => {
      chunker = new RecursiveChunker({
        maxChunkSize: 300,
        minChunkSize: 50,
        maxDepth: 5
      });
    });
    
    it('should create recursive chunks', async () => {
      const result = await chunker.chunk(sampleText);
      
      expect(result.chunks).toBeDefined();
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.metadata.strategy).toBe('recursive');
    });
    
    it('should analyze document structure', () => {
      const markdownText = `# Title\n\nParagraph\n\n## Section\n\n* List item\n\n\`\`\`code\`\`\``;
      const structure = chunker.analyzeStructure(markdownText);
      
      expect(structure.hasMarkdownHeaders).toBe(true);
      expect(structure.hasBulletPoints).toBe(true);
      expect(structure.hasCodeBlocks).toBe(true);
      expect(structure.documentType).toBe('markdown');
    });
    
    it('should select appropriate separator', () => {
      const textWithParagraphs = 'Para 1\n\nPara 2\n\nPara 3';
      const textWithLines = 'Line 1\nLine 2\nLine 3';
      
      const separator1 = chunker.selectSeparator(textWithParagraphs, 0);
      const separator2 = chunker.selectSeparator(textWithLines, 0);
      
      expect(separator1).toBe('\n\n');
      expect(separator2).toBe('\n');
    });
    
    it('should split by separator correctly', () => {
      const text = 'Part 1. Part 2. Part 3';
      const parts = chunker.splitBySeparator(text, '. ');
      
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('Part 1');
      expect(parts[1]).toBe('Part 2');
      expect(parts[2]).toBe('Part 3');
    });
    
    it('should force split when needed', () => {
      const longText = 'word '.repeat(100);
      const chunks = chunker.forceSplit(longText, 0);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.type).toBe('forced');
      });
    });
    
    it('should extract chunk structure', () => {
      const markdownChunk = `## Header\n\nParagraph text\n\n* List item\n\n\`code\``;
      const structure = chunker.extractChunkStructure(markdownChunk);
      
      expect(structure.hasHeaders).toBe(true);
      expect(structure.headerLevel).toBe(2);
      expect(structure.hasList).toBe(true);
      expect(structure.hasCode).toBe(true);
      expect(structure.paragraphs).toBeGreaterThan(0);
    });
    
    it('should build hierarchy', async () => {
      const result = await chunker.chunkHierarchically(sampleText);
      
      expect(result.hierarchy).toBeDefined();
      expect(result.hierarchy.root).toBeDefined();
      expect(result.chunks[0].metadata.hierarchyPath).toBeDefined();
    });
    
    it('should optimize chunking strategy', async () => {
      const optimal = await chunker.optimizeChunking(sampleText, 100);
      
      expect(optimal).toBeDefined();
      expect(optimal.maxChunkSize).toBeGreaterThan(0);
      expect(optimal.minChunkSize).toBeGreaterThan(0);
    });
  });
  
  describe('Integration Tests', () => {
    it('should handle empty text', async () => {
      const fixedChunker = new FixedSizeChunker();
      const semanticChunker = new SemanticChunker({ embeddings: null });
      const recursiveChunker = new RecursiveChunker();
      
      const emptyText = '';
      
      const fixedResult = await fixedChunker.chunk(emptyText);
      const recursiveResult = await recursiveChunker.chunk(emptyText);
      
      expect(fixedResult.chunks).toHaveLength(0);
      expect(recursiveResult.chunks).toHaveLength(0);
    });
    
    it('should handle very short text', async () => {
      const shortText = 'Short.';
      
      const fixedChunker = new FixedSizeChunker({ chunkSize: 100 });
      const recursiveChunker = new RecursiveChunker({ minChunkSize: 5 });
      
      const fixedResult = await fixedChunker.chunk(shortText);
      const recursiveResult = await recursiveChunker.chunk(shortText);
      
      expect(fixedResult.chunks.length).toBeGreaterThanOrEqual(1);
      expect(recursiveResult.chunks.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should handle very long text', async () => {
      const longText = 'This is a sentence. '.repeat(1000);
      
      const fixedChunker = new FixedSizeChunker({ chunkSize: 500 });
      const recursiveChunker = new RecursiveChunker({ maxChunkSize: 500 });
      
      const fixedResult = await fixedChunker.chunk(longText);
      const recursiveResult = await recursiveChunker.chunk(longText);
      
      expect(fixedResult.chunks.length).toBeGreaterThan(10);
      expect(recursiveResult.chunks.length).toBeGreaterThan(10);
      
      fixedResult.chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(600);
      });
    });
  });
});