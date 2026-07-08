// NovaMind — PDFParser.js — File Upload Bug Fix
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

import { logger } from '../../utils/logger.js';

const clean = (text) =>
  text.replace(/\s+/g, ' ').trim().slice(0, 100000);

export default class PDFParser {
  constructor() {
    this.name = 'PDFParser';
    this.version = '2.0.0';
  }

  async parse(buffer) {
    logger.info('Parsing PDF using PDFParse...');
    const parser = new PDFParse({ data: buffer });
    
    try {
      const result = await parser.getText();
      let text = clean(result.text || '');
      let pageCount = result.pages ? result.pages.length : 1;
      
      const textLength = text.trim().length;
      const fileBytes = buffer.length;
      const textDensity = textLength / fileBytes;

      logger.info('PDF parsed metrics', { textLength, fileBytes, textDensity });

      // Fallback triggers: empty text OR extremely low text density (e.g. scanned/image PDF)
      if (textLength < 50 || textDensity < 0.0005) {
        logger.info('Low text density detected. Falling back to multimodal Gemini OCR...');
        
        // Render first 5 pages of the PDF as PNG screenshots
        const screenshotRes = await parser.getScreenshot({ first: 5, scale: 1.2 });
        if (screenshotRes.pages && screenshotRes.pages.length > 0) {
          const { getModelWithKey } = await import('../../utils/keyManager.js');
          const { model, reportSuccess, reportFailure } = getModelWithKey('gemini-3.1-flash-lite');
          
          const transcriptParts = [];
          for (const page of screenshotRes.pages) {
            const base64Data = Buffer.from(page.data).toString('base64');
            try {
              const ocrResult = await model.generateContent([
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: 'image/png'
                  }
                },
                'Extract all text from this scanned PDF page image. Write it down verbatim.'
              ]);
              reportSuccess();
              const pageText = ocrResult.response.text().trim();
              if (pageText) {
                transcriptParts.push(`--- PDF Page ${page.pageNumber} --- \n${pageText}`);
              }
            } catch (err) {
              reportFailure(err);
              logger.warn(`Gemini OCR failed for PDF page ${page.pageNumber}`, { error: err.message });
            }
          }
          if (transcriptParts.length > 0) {
            text = clean(transcriptParts.join('\n\n'));
            logger.info('Gemini OCR transcription completed successfully!', { textLength: text.length });
          }
        }
      }

      // Convert extracted text into the Normalized JSON Document Model format
      const documentModel = [];
      const sections = text.split(/--- PDF Page \d+ ---/g);
      
      let currentPage = 1;
      sections.forEach((sectionContent) => {
        const trimmed = sectionContent.trim();
        if (trimmed) {
          documentModel.push({
            type: 'paragraph',
            text: trimmed,
            source: {
              page: currentPage
            }
          });
          currentPage++;
        }
      });

      if (documentModel.length === 0 && text.trim()) {
        documentModel.push({
          type: 'paragraph',
          text: text.trim(),
          source: { page: 1 }
        });
      }

      return {
        type: 'PDF',
        pages: pageCount,
        documentModel
      };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
}
