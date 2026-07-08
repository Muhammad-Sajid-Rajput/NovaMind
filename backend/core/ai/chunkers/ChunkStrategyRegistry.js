// NovaMind — ChunkStrategyRegistry.js — File Upload Bug Fix
import { logger } from '../../utils/logger.js';

export default class ChunkStrategyRegistry {
  constructor() {
    this.strategies = new Map();
  }

  register(documentType, strategyInstance) {
    this.strategies.set(documentType.toLowerCase(), strategyInstance);
  }

  getStrategy(documentType) {
    const strategy = this.strategies.get(documentType.toLowerCase());
    if (!strategy) {
      throw new Error(`No chunking strategy registered for document type: ${documentType}`);
    }
    return strategy;
  }
}
