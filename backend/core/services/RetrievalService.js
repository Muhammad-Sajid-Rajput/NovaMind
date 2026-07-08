// NovaMind — RetrievalService.js
import { searchVectors } from './pineconeService.js';
import { embedText } from './embeddingService.js';
import DocumentChunk from '../../modules/upload/models/DocumentChunk.model.js';
import { logger } from '../utils/logger.js';

/**
 * Rewrites a conversation-dependent question into a standalone descriptive query.
 */
const rewriteQuery = async (userMessage, chatHistory) => {
  if (!chatHistory || chatHistory.length === 0) {
    return userMessage;
  }

  try {
    const { getModelWithKey } = await import('../utils/keyManager.js');
    const { model, reportSuccess, reportFailure } = getModelWithKey('gemini-3.1-flash-lite');

    // Build history transcript
    const historyText = chatHistory
      .slice(-4) // Last 4 messages for context
      .map(m => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.message}`)
      .join('\n');

    const prompt = `Given the following conversation history and the latest user follow-up question, rewrite it into a single, standalone search query that contains all necessary context (nouns, subjects, terms) to search inside documents. Do NOT answer the question, just rewrite the query.

Conversation History:
${historyText}

User Question: ${userMessage}

Standalone Query:`;

    const result = await model.generateContent(prompt);
    reportSuccess();
    const rewritten = result.response.text().trim();
    logger.info('Query rewritten successfully', { original: userMessage, rewritten });
    return rewritten || userMessage;
  } catch (err) {
    logger.warn('Query rewrite failed, falling back to original message', { error: err.message });
    return userMessage;
  }
};

/**
 * Merges semantic and lexical matches using Reciprocal Rank Fusion (RRF).
 */
const rrfMerge = (semanticMatches, lexicalMatches, k = 60) => {
  const scoreMap = new Map();
  const chunkMap = new Map();

  // Helper to map and update score
  const updateScore = (chunk, rank) => {
    const key = chunk.text;
    const score = 1 / (k + rank);
    
    scoreMap.set(key, (scoreMap.get(key) || 0) + score);
    if (!chunkMap.has(key)) {
      chunkMap.set(key, chunk);
    }
  };

  semanticMatches.forEach((match, index) => {
    updateScore({
      text: match.text,
      fileName: match.fileName,
      metadata: {
        pageNumber: match.pageNumber,
        sheetName: match.sheetName,
        slideNumber: match.slideNumber,
        headingPath: match.headingPath,
        lineRange: match.lineRange,
        characterOffset: match.characterOffset
      }
    }, index + 1);
  });

  lexicalMatches.forEach((match, index) => {
    updateScore({
      text: match.text,
      fileName: match.metadata?.fileName || 'Document',
      metadata: {
        pageNumber: match.metadata?.pageNumber,
        sheetName: match.metadata?.sheetName,
        slideNumber: match.metadata?.slideNumber,
        headingPath: match.metadata?.headingPath,
        lineRange: match.metadata?.lineRange,
        characterOffset: match.metadata?.characterOffset
      }
    }, index + 1);
  });

  // Sort by merged RRF score descending
  const sortedKeys = [...scoreMap.keys()].sort((a, b) => scoreMap.get(b) - scoreMap.get(a));
  
  return sortedKeys.map(key => ({
    ...chunkMap.get(key),
    rrfScore: scoreMap.get(key)
  }));
};

/**
 * Retrieval Service: Query Rewriting, Hybrid Search, RRF, and Context Compression
 */
export const retrieveContext = async ({
  message,
  sessionId,
  userId,
  chatHistory = [],
  topK = 5
}) => {
  logger.info('Retrieving context via RetrievalService', { sessionId, userId });

  // 1. Rewrite user query
  const rewrittenQuery = await rewriteQuery(message, chatHistory);

  // 2. Run Semantic Vector Search (Pinecone)
  let semanticMatches = [];
  try {
    const queryEmbedding = await embedText(rewrittenQuery);
    semanticMatches = await searchVectors({
      queryEmbedding,
      userId,
      sessionId,
      topK: topK * 2 // Fetch more candidates for RRF merging
    });
  } catch (err) {
    logger.error('Semantic retrieval search failed', { error: err.message });
  }

  // 3. Run Lexical Keyword Search (MongoDB DocumentChunk text index)
  let lexicalMatches = [];
  try {
    lexicalMatches = await DocumentChunk.find(
      {
        sessionId,
        userId,
        $text: { $search: rewrittenQuery }
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(topK * 2)
      .lean();
  } catch (err) {
    logger.error('Lexical retrieval search failed', { error: err.message });
  }

  // 4. Merge results using Reciprocal Rank Fusion (RRF)
  const mergedResults = rrfMerge(semanticMatches, lexicalMatches);

  // 5. Context Compression (Selecting top unique context chunks and metadata coordinates)
  const compressed = mergedResults.slice(0, topK);

  logger.info('Hybrid RAG retrieval complete', {
    semanticCount: semanticMatches.length,
    lexicalCount: lexicalMatches.length,
    mergedCount: mergedResults.length,
    returnedCount: compressed.length
  });

  return compressed;
};
