import mammoth from 'mammoth';
import logger from '../../../utils/logger.js';

export class DOCXParser {
  constructor(options = {}) {
    this.options = {
      convertImage: options.convertImage || this.defaultImageConverter,
      includeDefaultStyleMap: options.includeDefaultStyleMap !== false,
      ...options
    };
  }

  async parse(buffer) {
    try {
      const startTime = Date.now();
      
      const result = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer }, this.options);
      
      const metadata = {
        parseTime: Date.now() - startTime,
        messages: htmlResult.messages,
        hasImages: htmlResult.value.includes('<img'),
        wordCount: result.value.split(/\s+/).length
      };

      const text = this.cleanText(result.value);
      
      logger.info(`DOCX parsed successfully in ${metadata.parseTime}ms`);
      
      return {
        content: text,
        html: htmlResult.value,
        metadata,
        rawText: result.value,
        sections: this.extractSections(text)
      };
    } catch (error) {
      logger.error('Failed to parse DOCX:', error);
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  cleanText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  }

  extractSections(text) {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = { title: 'Introduction', content: [] };
    
    const headingPattern = /^(#{1,6}|\d+\.|\*\s|Chapter|Section|Part)\s/i;
    
    for (const line of lines) {
      if (headingPattern.test(line)) {
        if (currentSection.content.length > 0) {
          currentSection.content = currentSection.content.join('\n').trim();
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace(headingPattern, '').trim(),
          content: []
        };
      } else if (line.trim()) {
        currentSection.content.push(line);
      }
    }
    
    if (currentSection.content.length > 0) {
      currentSection.content = currentSection.content.join('\n').trim();
      sections.push(currentSection);
    }
    
    return sections;
  }

  defaultImageConverter(image) {
    return image.read('base64').then((imageBuffer) => ({
      src: `data:${image.contentType};base64,${imageBuffer}`
    }));
  }

  async parseFile(filePath) {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return this.parse(buffer);
  }

  async convertToMarkdown(buffer) {
    try {
      const result = await mammoth.convertToMarkdown({ buffer });
      return {
        markdown: result.value,
        messages: result.messages
      };
    } catch (error) {
      logger.error('Failed to convert DOCX to Markdown:', error);
      const fallbackResult = await this.parse(buffer);
      return {
        markdown: fallbackResult.content,
        messages: [`Fallback to plain text: ${error.message}`]
      };
    }
  }

  extractTables(htmlContent) {
    const tablePattern = /<table[^>]*>(.*?)<\/table>/gs;
    const tables = [];
    let match;
    
    while ((match = tablePattern.exec(htmlContent)) !== null) {
      tables.push({
        html: match[0],
        position: match.index,
        content: this.parseTableContent(match[1])
      });
    }
    
    return tables;
  }

  parseTableContent(tableHtml) {
    const rows = [];
    const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gs;
    let rowMatch;
    
    while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
      const cells = [];
      const cellPattern = /<t[dh][^>]*>(.*?)<\/t[dh]>/gs;
      let cellMatch;
      
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    
    return rows;
  }
}

export default DOCXParser;