// NovaMind — pineconeService.js — Phase 4
import { Pinecone } from '@pinecone-database/pinecone';
import { logger }   from '../utils/logger.js';

let pineconeClient = null;
let pineconeIndex  = null;

const getPinecone = () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
};

const getIndex = () => {
  if (!pineconeIndex) {
    const pc      = getPinecone();
    pineconeIndex = pc.index(process.env.PINECONE_INDEX);
  }
  return pineconeIndex;
};

let cachedDimension = null;

export const getPineconeDimension = async () => {
  if (cachedDimension) return cachedDimension;
  try {
    const index = getIndex();
    const stats = await index.describeIndexStats();
    if (stats && stats.dimension) {
      cachedDimension = stats.dimension;
      logger.info(`Detected Pinecone index dimension: ${cachedDimension}`);
      return cachedDimension;
    }
  } catch (err) {
    logger.warn('Could not fetch Pinecone index stats, falling back to 786', { error: err.message });
  }
  return Number(process.env.VECTOR_DIMENSION) || 786;
};

const normalizeVectorDimension = (vector, targetDim) => {
  if (!Array.isArray(vector)) return vector;
  if (vector.length === targetDim) return vector;
  if (vector.length < targetDim) {
    return [...vector, ...new Array(targetDim - vector.length).fill(0)];
  }
  return vector.slice(0, targetDim);
};

// ── Upsert vectors ─────────────────────────────────
export const upsertVectors = async (vectors) => {
  const index = getIndex();
  const targetDim = await getPineconeDimension();

  const normalizedRecords = vectors.map(record => ({
    ...record,
    values: normalizeVectorDimension(record.values, targetDim),
  }));

  // Pinecone upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < normalizedRecords.length; i += BATCH_SIZE) {
    const batch = normalizedRecords.slice(i, i + BATCH_SIZE);
    await index.upsert({ records: batch });
    logger.info(`Upserted batch ${Math.floor(i/BATCH_SIZE)+1}`, {
      count: batch.length,
    });
  }
};

// ── Similarity search ──────────────────────────────
export const searchVectors = async ({
  queryEmbedding,
  userId,
  sessionId,
  topK = 5,
}) => {
  const index = getIndex();
  const targetDim = await getPineconeDimension();
  const normalizedQuery = normalizeVectorDimension(queryEmbedding, targetDim);

  const result = await index.query({
    vector:          normalizedQuery,
    topK,
    includeMetadata: true,
    filter: {
      userId,
      ...(sessionId ? { sessionId } : {}),
    },
  });

  const matches = result.matches || [];
  logger.info(`Pinecone query completed`, {
    matchesCount: matches.length,
    topScores: matches.slice(0, 3).map(m => m.score),
  });

  return matches
    .filter(m => m.score > 0.3) // relevance threshold
    .map(m => ({
      text:            m.metadata.text,
      fileName:        m.metadata.fileName,
      score:           m.score,
      chunkIdx:        m.metadata.chunkIdx,
      pageNumber:      m.metadata.pageNumber,
      sheetName:       m.metadata.sheetName,
      slideNumber:     m.metadata.slideNumber,
      headingPath:     m.metadata.headingPath,
      lineRange:       m.metadata.lineRange,
      characterOffset: m.metadata.characterOffset,
    }));
};

// ── Helper: Delete by filter directly (supported natively by Pinecone Serverless) ──
const deleteByFilter = async (filter) => {
  const index = getIndex();
  await index.deleteMany({ filter });
};

// ── Delete vectors for a session ───────────────────
export const deleteSessionVectors = async (sessionId, userId) => {
  await deleteByFilter({ sessionId, userId });
  logger.info('Deleted session vectors', { sessionId, userId });
};

// ── Delete vectors for a file ──────────────────────
export const deleteFileVectors = async (fileId, userId) => {
  await deleteByFilter({ fileId, userId });
  logger.info('Deleted file vectors', { fileId, userId });
};

// ── Delete vectors for a file by hash ──────────────
export const deleteFileVectorsByHash = async (sha256, userId) => {
  await deleteByFilter({ sha256, userId });
  logger.info('Deleted file vectors by hash', { sha256, userId });
};

// ── Delete vectors for a message/attachment ────────
export const deleteMessageVectors = async (messageId, userId) => {
  await deleteByFilter({ messageId, userId });
  logger.info('Deleted message vectors', { messageId, userId });
};

// ── Delete all vectors for a user ──────────────────
export const deleteUserVectors = async (userId) => {
  try {
    await deleteByFilter({ userId });
    logger.info('Deleted all vectors for user', { userId });
  } catch (err) {
    logger.warn('Failed to delete Pinecone vectors for user, continuing', {
      userId,
      error: err.message
    });
  }
};
