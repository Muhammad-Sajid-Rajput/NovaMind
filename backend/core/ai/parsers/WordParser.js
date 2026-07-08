// NovaMind — WordParser.js — File Upload Bug Fix
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mammoth = require('mammoth');
const officeParser = require('officeparser');

import { logger } from '../../utils/logger.js';

export default class WordParser {
  constructor() {
    this.name = 'WordParser';
    this.version = '2.0.0';
  }

  async parse(buffer, fileName) {
    logger.info('Parsing Word document...', { fileName });
    const ext = fileName.split('.').pop().toLowerCase();
    
    let text = '';
    
    if (ext === 'docx') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
      } catch (err) {
        logger.warn('Mammoth parsing failed, falling back to officeparser', { error: err.message });
        const ast = await officeParser.parseOffice(buffer, { fileType: 'docx' });
        const textObj = await ast.to('text');
        text = textObj.value || '';
      }
    } else {
      // Legacy .doc
      const ast = await officeParser.parseOffice(buffer, { fileType: 'doc' });
      const textObj = await ast.to('text');
      text = textObj.value || '';
    }

    const cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const paragraphs = cleanedText.split('\n\n');

    const documentModel = [];
    paragraphs.forEach((p, idx) => {
      const trimmed = p.trim();
      if (!trimmed) return;

      // Identify headings based on short lines (e.g. less than 100 chars)
      const isShortLine = trimmed.length < 80;
      const startsWithNumber = /^\d+(\.\d+)*\s+/.test(trimmed);
      const isHeading = isShortLine && (startsWithNumber || idx === 0);

      documentModel.push({
        type: isHeading ? 'heading' : 'paragraph',
        level: isHeading ? 2 : undefined,
        text: trimmed,
        source: {
          paragraphIndex: idx
        }
      });
    });

    return {
      type: 'Word Document',
      pages: 1,
      documentModel
    };
  }
}
