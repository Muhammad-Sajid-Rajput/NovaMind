// NovaMind — TextParser.js — File Upload Bug Fix
import { logger } from '../../utils/logger.js';

export default class TextParser {
  constructor() {
    this.name = 'TextParser';
    this.version = '2.0.0';
  }

  async parse(buffer) {
    logger.info('Parsing plain text file...');
    const text = buffer.toString('utf-8');
    const paragraphs = text.split('\n\n');
    const documentModel = [];

    paragraphs.forEach((p, idx) => {
      const trimmed = p.trim();
      if (!trimmed) return;

      documentModel.push({
        type: 'paragraph',
        text: trimmed,
        source: {
          paragraphIndex: idx
        }
      });
    });

    return {
      type: 'Text File',
      pages: 1,
      documentModel
    };
  }
}
