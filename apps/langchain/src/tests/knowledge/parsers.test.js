import { describe, it, expect, beforeAll } from '@jest/globals';
import PDFParser from '../../services/knowledge/parsers/pdfParser.js';
import DOCXParser from '../../services/knowledge/parsers/docxParser.js';
import MarkdownParser from '../../services/knowledge/parsers/markdownParser.js';
import TextParser from '../../services/knowledge/parsers/textParser.js';

describe('Document Parsers', () => {
  describe('TextParser', () => {
    let parser;
    
    beforeAll(() => {
      parser = new TextParser();
    });
    
    it('should parse plain text correctly', async () => {
      const text = 'This is a test document.\nIt has multiple lines.\n\nAnd paragraphs.';
      const result = await parser.parse(text);
      
      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.paragraphs).toHaveLength(2);
    });
    
    it('should extract sentences correctly', async () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const result = await parser.parse(text);
      
      expect(result.sentences).toHaveLength(3);
      expect(result.metadata.sentenceCount).toBe(3);
    });
    
    it('should normalize whitespace', async () => {
      const text = 'Text  with   extra    spaces\n\n\n\nand lines';
      const result = await parser.parse(text);
      
      expect(result.content).not.toContain('   ');
      expect(result.content).not.toContain('\n\n\n');
    });
    
    it('should calculate statistics correctly', async () => {
      const text = 'Hello world hello test world';
      const result = await parser.parse(text);
      
      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalWords).toBe(5);
      expect(result.statistics.uniqueWords).toBe(3);
      expect(result.statistics.topWords).toBeDefined();
    });
    
    it('should detect language', async () => {
      const parser = new TextParser({ detectLanguage: true });
      const englishText = 'The quick brown fox jumps over the lazy dog';
      const result = await parser.parse(englishText);
      
      expect(result.metadata.language).toBe('english');
    });
  });
  
  describe('MarkdownParser', () => {
    let parser;
    
    beforeAll(() => {
      parser = new MarkdownParser();
    });
    
    it('should parse markdown with headers', async () => {
      const markdown = `# Title\n\n## Subtitle\n\nContent here\n\n### Section\n\nMore content`;
      const result = await parser.parse(markdown);
      
      expect(result).toBeDefined();
      expect(result.structure.headings).toHaveLength(3);
      expect(result.structure.headings[0].level).toBe(1);
      expect(result.structure.headings[0].text).toBe('Title');
    });
    
    it('should extract frontmatter', async () => {
      const markdown = `---
title: Test Document
author: Test Author
date: 2024-01-01
---

# Content

This is the content`;
      
      const result = await parser.parse(markdown);
      
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.metadata.date).toBe('2024-01-01');
    });
    
    it('should extract code blocks', async () => {
      const markdown = `# Code Example

\`\`\`javascript
const test = 'hello';
console.log(test);
\`\`\`

Some text

\`\`\`python
def hello():
    print("world")
\`\`\``;
      
      const result = await parser.parse(markdown);
      
      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.codeBlocks[1].language).toBe('python');
    });
    
    it('should extract links and images', async () => {
      const markdown = `[Link text](https://example.com)
![Image alt](image.png)
[Another link](https://test.com "Title")`;
      
      const result = await parser.parse(markdown);
      
      expect(result.structure.links).toHaveLength(2);
      expect(result.structure.images).toHaveLength(1);
      expect(result.structure.links[0].href).toBe('https://example.com');
      expect(result.structure.images[0].href).toBe('image.png');
    });
    
    it('should handle lists', async () => {
      const markdown = `# List Example

- Item 1
- Item 2
  - Nested item
- Item 3

1. Numbered item
2. Another numbered item`;
      
      const result = await parser.parse(markdown);
      
      expect(result.structure.lists).toBe(2);
      expect(result.content).toContain('Item 1');
      expect(result.content).toContain('Numbered item');
    });
  });
  
  describe('PDFParser', () => {
    let parser;
    
    beforeAll(() => {
      parser = new PDFParser();
    });
    
    it('should clean text properly', () => {
      const dirtyText = 'Text\r\nwith\r\nwindows\n\n\n\nlinebreaks   and    spaces';
      const cleaned = parser.cleanText(dirtyText);
      
      expect(cleaned).not.toContain('\r\n');
      expect(cleaned).not.toContain('\n\n\n');
      expect(cleaned).not.toContain('   ');
    });
    
    it('should extract metadata', () => {
      const pdfData = {
        info: {
          Title: 'Test Document',
          Author: 'Test Author',
          Subject: 'Testing',
          Keywords: 'test, pdf, parser',
          Creator: 'Test Creator',
          Producer: 'Test Producer',
          CreationDate: '2024-01-01',
          ModDate: '2024-01-02'
        },
        numpages: 10
      };
      
      const metadata = parser.extractMetadata(pdfData);
      
      expect(metadata.title).toBe('Test Document');
      expect(metadata.author).toBe('Test Author');
      expect(metadata.pages).toBe(10);
      expect(metadata.keywords).toBe('test, pdf, parser');
    });
    
    it('should extract pages', () => {
      const data = {
        text: 'Page 1 content\fPage 2 content\fPage 3 content'
      };
      
      const pages = parser.extractPages(data);
      
      expect(pages).toHaveLength(3);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].content).toContain('Page 1');
      expect(pages[2].pageNumber).toBe(3);
    });
  });
  
  describe('DOCXParser', () => {
    let parser;
    
    beforeAll(() => {
      parser = new DOCXParser();
    });
    
    it('should clean text properly', () => {
      const dirtyText = 'Text\r\nwith\r\nwindows\n\n\n\nlinebreaks   and    spaces';
      const cleaned = parser.cleanText(dirtyText);
      
      expect(cleaned).not.toContain('\r\n');
      expect(cleaned).not.toContain('\n\n\n');
      expect(cleaned).not.toContain('   ');
    });
    
    it('should extract sections', () => {
      const text = `Chapter 1: Introduction
This is the introduction content.

Chapter 2: Main Content
This is the main content.

## Subsection
This is a subsection.`;
      
      const sections = parser.extractSections(text);
      
      expect(sections.length).toBeGreaterThan(0);
      expect(sections[0].title).toContain('Introduction');
      expect(sections[0].content).toContain('introduction content');
    });
    
    it('should parse table content', () => {
      const tableHtml = `<tr><td>Cell 1</td><td>Cell 2</td></tr>
                         <tr><td>Cell 3</td><td>Cell 4</td></tr>`;
      
      const rows = parser.parseTableContent(tableHtml);
      
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(['Cell 1', 'Cell 2']);
      expect(rows[1]).toEqual(['Cell 3', 'Cell 4']);
    });
    
    it('should extract tables from HTML', () => {
      const html = `<p>Some text</p>
                    <table><tr><td>Data 1</td></tr></table>
                    <p>More text</p>
                    <table><tr><td>Data 2</td></tr></table>`;
      
      const tables = parser.extractTables(html);
      
      expect(tables).toHaveLength(2);
      expect(tables[0].content).toHaveLength(1);
      expect(tables[0].content[0]).toEqual(['Data 1']);
    });
  });
});