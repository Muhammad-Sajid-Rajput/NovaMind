// NovaMind — PPTParser.js — File Upload Bug Fix
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const officeParser = require('officeparser');

import { logger } from '../../utils/logger.js';

/**
 * Extracts printable ASCII/UTF-16 strings from a Compound File Binary (.ppt) buffer.
 * Serves as a pure JS fallback since officeparser does not support legacy .ppt files.
 */
function extractTextFromBinaryCompound(buffer) {
  const utf16Str = buffer.toString('utf16le');
  const utf16Matches = utf16Str.match(/[\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]{8,}/g) || [];
  
  const utf8Str = buffer.toString('utf8');
  const utf8Matches = utf8Str.match(/[\u0009\u000A\u000D\u0020-\u007E]{8,}/g) || [];
  
  const NOISE_PATTERNS = [
    /^(Times New Roman|Arial|Wingdings|Comic Sans|Calibri|Courier|Georgia|Verdana|Symbol|Tahoma|Century Gothic|Zapf Dingbats|System)$/i,
    /^(Rectangle|Freeform|Placeholder|Footer|Header|Date|Equation|Slide|Shape|Text Box|Line|Oval|Arrow)\b/i,
    /^___PPT\d+/i,
    /^Microsoft Equation/i,
    /^[0-9\s.,;:_+\-*\/\\()\[\]{}|<>="']{8,}$/
  ];
  
  const cleanMatches = [...utf16Matches, ...utf8Matches].map(s => s.trim()).filter(s => {
    if (s.length < 8) return false;
    const letterRatio = (s.match(/[a-zA-Z0-9\s]/g) || []).length / s.length;
    if (letterRatio < 0.6) return false;
    if (s.includes('PowerPoint Document') || s.includes('DocumentSummaryInformation') || s.includes('SummaryInformation')) return false;
    if (NOISE_PATTERNS.some(pattern => pattern.test(s))) return false;
    return true;
  });
  
  return [...new Set(cleanMatches)].join('\n\n');
}

export default class PPTParser {
  constructor() {
    this.name = 'PPTParser';
    this.version = '2.0.0';
  }

  async parse(buffer, fileName) {
    logger.info('Parsing PowerPoint presentation...', { fileName });
    const ext = fileName ? fileName.split('.').pop().toLowerCase() : 'pptx';
    const fileType = ext === 'ppt' ? 'ppt' : 'pptx';
    
    let text = '';
    try {
      const ast = await officeParser.parseOffice(buffer, { fileType });
      const textObj = await ast.to('text');
      text = textObj.value || '';
    } catch (err) {
      if (ext === 'ppt') {
        logger.info('officeparser PPT parsing failed, falling back to binary text extraction...', { fileName });
        text = extractTextFromBinaryCompound(buffer);
        if (!text || text.trim().length === 0) {
          throw err;
        }
      } else {
        throw err;
      }
    }
    
    // Group slide text if possible, fallback to splitting by paragraphs
    const paragraphs = text.split('\n\n');
    const documentModel = [];
    
    let currentSlide = 1;
    paragraphs.forEach((p) => {
      const trimmed = p.trim();
      if (!trimmed) return;

      documentModel.push({
        type: 'paragraph',
        text: trimmed,
        source: {
          slideNumber: currentSlide
        }
      });
      currentSlide++;
    });

    return {
      type: 'PowerPoint Presentation',
      pages: documentModel.length || 1,
      documentModel
    };
  }
}
