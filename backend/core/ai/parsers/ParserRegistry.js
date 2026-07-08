// NovaMind — ParserRegistry.js — File Upload Bug Fix
import { logger } from '../../utils/logger.js';

export default class ParserRegistry {
  constructor() {
    this.parsers = new Map();
  }

  register(extensions, parserInstance) {
    extensions.forEach(ext => {
      this.parsers.set(ext.toLowerCase(), parserInstance);
    });
  }

  getParser(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const parser = this.parsers.get(ext);
    if (!parser) {
      throw new Error(`No parser registered for file extension: .${ext}`);
    }
    return parser;
  }
}
