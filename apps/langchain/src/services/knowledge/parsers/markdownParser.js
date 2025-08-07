import { marked } from 'marked';
import logger from '../../../utils/logger.js';

export class MarkdownParser {
  constructor(options = {}) {
    this.options = {
      extractMetadata: options.extractMetadata !== false,
      preserveFormatting: options.preserveFormatting || false,
      extractCodeBlocks: options.extractCodeBlocks !== false,
      ...options
    };
  }

  async parse(content) {
    try {
      const startTime = Date.now();
      
      const { metadata, body } = this.extractFrontmatter(content);
      
      const tokens = marked.lexer(body);
      const text = this.preserveFormatting ? body : this.extractText(tokens);
      
      const structure = this.extractStructure(tokens);
      const codeBlocks = this.options.extractCodeBlocks ? this.extractCodeBlocks(tokens) : [];
      
      const result = {
        content: this.cleanText(text),
        metadata: {
          ...metadata,
          parseTime: Date.now() - startTime,
          headings: structure.headings.length,
          paragraphs: structure.paragraphs,
          lists: structure.lists,
          codeBlocks: codeBlocks.length,
          links: structure.links.length,
          images: structure.images.length,
          wordCount: text.split(/\s+/).length
        },
        structure,
        codeBlocks,
        html: marked.parse(body)
      };
      
      logger.info(`Markdown parsed successfully in ${result.metadata.parseTime}ms`);
      
      return result;
    } catch (error) {
      logger.error('Failed to parse Markdown:', error);
      throw new Error(`Markdown parsing failed: ${error.message}`);
    }
  }

  extractFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { metadata: {}, body: content };
    }
    
    const frontmatter = match[1];
    const body = content.slice(match[0].length);
    
    const metadata = {};
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        metadata[key] = this.parseYamlValue(value);
      }
    }
    
    return { metadata, body };
  }

  parseYamlValue(value) {
    value = value.replace(/^["']|["']$/g, '');
    
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '') return null;
    
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(v => v.trim());
    }
    
    return value;
  }

  extractText(tokens) {
    let text = '';
    
    const processToken = (token) => {
      switch (token.type) {
        case 'paragraph':
        case 'text':
          text += (token.text || token.raw) + '\n\n';
          break;
        case 'heading':
          text += token.text + '\n\n';
          break;
        case 'list':
          if (token.items) {
            token.items.forEach(item => {
              text += '• ' + (item.text || '') + '\n';
            });
            text += '\n';
          }
          break;
        case 'blockquote':
          text += '> ' + (token.text || token.raw) + '\n\n';
          break;
        case 'code':
          if (!this.options.extractCodeBlocks) {
            text += token.text + '\n\n';
          }
          break;
        case 'table':
          if (token.rows) {
            token.header.forEach(cell => {
              text += cell.text + '\t';
            });
            text += '\n';
            token.rows.forEach(row => {
              row.forEach(cell => {
                text += cell.text + '\t';
              });
              text += '\n';
            });
            text += '\n';
          }
          break;
      }
      
      if (token.tokens) {
        token.tokens.forEach(processToken);
      }
    };
    
    tokens.forEach(processToken);
    
    return text;
  }

  extractStructure(tokens) {
    const structure = {
      headings: [],
      paragraphs: 0,
      lists: 0,
      codeBlocks: [],
      links: [],
      images: []
    };
    
    const processToken = (token, depth = 0) => {
      switch (token.type) {
        case 'heading':
          structure.headings.push({
            level: token.depth,
            text: token.text,
            raw: token.raw
          });
          break;
        case 'paragraph':
          structure.paragraphs++;
          break;
        case 'list':
          structure.lists++;
          break;
        case 'code':
          structure.codeBlocks.push({
            lang: token.lang || 'plaintext',
            text: token.text
          });
          break;
        case 'link':
          structure.links.push({
            href: token.href,
            text: token.text,
            title: token.title
          });
          break;
        case 'image':
          structure.images.push({
            href: token.href,
            text: token.text,
            title: token.title
          });
          break;
      }
      
      if (token.tokens) {
        token.tokens.forEach(t => processToken(t, depth + 1));
      }
    };
    
    tokens.forEach(processToken);
    
    return structure;
  }

  extractCodeBlocks(tokens) {
    const codeBlocks = [];
    
    const processToken = (token) => {
      if (token.type === 'code') {
        codeBlocks.push({
          language: token.lang || 'plaintext',
          code: token.text,
          raw: token.raw
        });
      }
      
      if (token.tokens) {
        token.tokens.forEach(processToken);
      }
    };
    
    tokens.forEach(processToken);
    
    return codeBlocks;
  }

  cleanText(text) {
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  }

  async parseFile(filePath) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parse(content);
  }

  extractSections(tokens) {
    const sections = [];
    let currentSection = null;
    
    tokens.forEach(token => {
      if (token.type === 'heading') {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: token.text,
          level: token.depth,
          content: []
        };
      } else if (currentSection) {
        currentSection.content.push(token);
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }
}

export default MarkdownParser;