import logger from '../../../utils/logger.js';

export class TextParser {
  constructor(options = {}) {
    this.options = {
      encoding: options.encoding || 'utf-8',
      detectLanguage: options.detectLanguage || false,
      extractSentences: options.extractSentences !== false,
      normalizeWhitespace: options.normalizeWhitespace !== false,
      ...options
    };
  }

  async parse(content) {
    try {
      const startTime = Date.now();
      
      const text = typeof content === 'string' ? content : content.toString(this.options.encoding);
      
      const cleanedText = this.options.normalizeWhitespace ? this.normalizeWhitespace(text) : text;
      const sentences = this.options.extractSentences ? this.extractSentences(cleanedText) : [];
      const paragraphs = this.extractParagraphs(cleanedText);
      
      const metadata = {
        parseTime: Date.now() - startTime,
        encoding: this.options.encoding,
        characterCount: cleanedText.length,
        wordCount: this.countWords(cleanedText),
        lineCount: cleanedText.split('\n').length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgWordsPerSentence: sentences.length > 0 ? 
          sentences.reduce((sum, s) => sum + this.countWords(s), 0) / sentences.length : 0
      };
      
      if (this.options.detectLanguage) {
        metadata.language = this.detectLanguage(cleanedText);
      }
      
      logger.info(`Text parsed successfully in ${metadata.parseTime}ms`);
      
      return {
        content: cleanedText,
        metadata,
        sentences,
        paragraphs,
        statistics: this.generateStatistics(cleanedText)
      };
    } catch (error) {
      logger.error('Failed to parse text:', error);
      throw new Error(`Text parsing failed: ${error.message}`);
    }
  }

  normalizeWhitespace(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
  }

  extractSentences(text) {
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentencePattern) || [];
    
    return sentences
      .map(s => s.trim())
      .filter(s => s.length > 0 && this.countWords(s) > 2);
  }

  extractParagraphs(text) {
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    return paragraphs.map((paragraph, index) => ({
      index,
      content: paragraph,
      wordCount: this.countWords(paragraph),
      sentenceCount: this.extractSentences(paragraph).length
    }));
  }

  countWords(text) {
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  detectLanguage(text) {
    const patterns = {
      english: /\b(the|is|are|was|were|been|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|ought|used|to|be|and|or|but|if|because|as|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|from|up|down|in|out|on|off|over|under|again|further|then|once)\b/gi,
      spanish: /\b(el|la|los|las|un|una|de|en|y|a|que|es|por|para|con|no|se|su|al|lo|como|más|pero|sus|le|ya|o|este|sí|porque|esta|entre|cuando|muy|sin|sobre|también|me|hasta|hay|donde|quien|desde|todo|nos|durante|todos|uno|les|ni|contra|otros|ese|eso|ante|ellos|e|esto|mí|antes|algunos|qué|unos|yo|otro|otras|otra|él|tanto|esa|estos|mucho|quienes|nada|muchos|cual|poco|ella|estar|estas|algunas|algo|nosotros)\b/gi,
      french: /\b(le|de|un|être|et|à|il|avoir|ne|je|son|que|se|qui|ce|dans|elle|au|pour|pas|cela|sur|sont|avec|être|faire|plus|dire|me|on|mon|lui|nous|comme|mais|pouvoir|par|ne|premier|vouloir|deux|passer|devenir|partir|sans|aussi|celui|si|notre|falloir|où|prendre|monde|vous|voir|quel|aller|bien|où|sans|premier)\b/gi,
      german: /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|noch|wie|einem|über|einen|das|so|zum|war|haben|nur|oder|aber|vor|zur|bis|mehr|durch|man|sein|wurde|sei|schon|wenn|habe|seine|Mark|ihre|dann|unter|wir|soll|ich|eines|Jahr|zwei|diese|dieser|wieder|keine|gegen|vom|können|drei|Jahre|mit|will|zwischen|im|immer|Millionen|was|sagte)\b/gi
    };
    
    const scores = {};
    for (const [language, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      scores[language] = matches ? matches.length : 0;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'unknown';
    
    return Object.keys(scores).find(lang => scores[lang] === maxScore);
  }

  generateStatistics(text) {
    const words = text.match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    const wordFrequency = {};
    words.forEach(word => {
      const lower = word.toLowerCase();
      wordFrequency[lower] = (wordFrequency[lower] || 0) + 1;
    });
    
    const sortedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);
    
    return {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      lexicalDiversity: uniqueWords.size / words.length,
      averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      topWords: sortedWords.map(([word, count]) => ({ word, count }))
    };
  }

  async parseFile(filePath) {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, this.options.encoding);
    return this.parse(content);
  }

  splitIntoChunks(text, chunkSize = 1000, overlap = 100) {
    const chunks = [];
    const sentences = this.extractSentences(text);
    
    let currentChunk = [];
    let currentSize = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = this.countWords(sentence);
      
      if (currentSize + sentenceWords > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        
        const overlapSentences = [];
        let overlapSize = 0;
        
        for (let i = currentChunk.length - 1; i >= 0 && overlapSize < overlap; i--) {
          const words = this.countWords(currentChunk[i]);
          if (overlapSize + words <= overlap) {
            overlapSentences.unshift(currentChunk[i]);
            overlapSize += words;
          }
        }
        
        currentChunk = overlapSentences;
        currentSize = overlapSize;
      }
      
      currentChunk.push(sentence);
      currentSize += sentenceWords;
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    return chunks;
  }
}

export default TextParser;