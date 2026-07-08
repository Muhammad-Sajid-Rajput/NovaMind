// NovaMind — embeddingService.js — Phase 4
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger }             from '../utils/logger.js';

// Use first API key for embeddings
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY_1
);

const embeddingModel = genAI.getGenerativeModel({
  model: 'gemini-embedding-2',
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Rate-limit config ─────────────────────────────────────────────────────────
//
// Free tier: 100 RPM (requests per minute) for gemini-embedding-2.
// Each call to embedContent or each item inside batchEmbedContents counts as
// one request towards that quota.
//
// Safe strategy:
//   • Batch API  : send up to BATCH_SIZE items at a time, then wait
//                  INTER_BATCH_DELAY_MS between batches so we stay well under
//                  100 RPM even for very large documents.
//   • Sequential : wait SEQUENTIAL_DELAY_MS between individual requests
//                  (≈ 650ms → ~92 RPM, safely under the 100 RPM cap).
//
const BATCH_SIZE           = Number(process.env.EMBEDDING_BATCH_SIZE) || 10;
const INTER_BATCH_DELAY_MS = Number(process.env.EMBEDDING_INTER_BATCH_DELAY_MS) || 8000; // 10 items / 8 s ≈ 75 RPM
const SEQUENTIAL_DELAY_MS  = Number(process.env.EMBEDDING_SEQUENTIAL_DELAY_MS) || 700;   // 1 item  / 0.7s ≈ 85 RPM

// ── Embed a single text with retry and exponential back-off ───────────────────
export const embedText = async (text, retries = 5, backoff = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await embeddingModel.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 786
      });
      return result.embedding.values; // float32 array
    } catch (err) {
      const isRateLimit =
        err.message.includes('429') ||
        err.message.includes('Quota exceeded') ||
        err.message.includes('Too Many Requests');

      if (isRateLimit && attempt < retries) {
        // Parse the "retryDelay" hint from the error body when available
        const retryAfterMatch = err.message.match(/retry.*?(\d+)s/i);
        const hintMs = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : 0;
        const sleepTime = Math.max(hintMs, backoff * attempt) + Math.random() * 1000;
        logger.warn(
          `Rate limit hit during embedding. Retrying in ${Math.round(sleepTime / 1000)}s… (attempt ${attempt}/${retries})`
        );
        await delay(sleepTime);
      } else {
        logger.error(`Embedding attempt ${attempt} failed: ${err.message}`);
        if (attempt === retries) throw err;
      }
    }
  }
};

// ── Embed a small batch (≤ BATCH_SIZE) with retry ────────────────────────────
const embedBatchChunk = async (chunk) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await embeddingModel.batchEmbedContents({
        requests: chunk.map(t => ({
          model: 'models/gemini-embedding-2',
          content: { parts: [{ text: t }] },
          outputDimensionality: 786
        }))
      });

      if (!result.embeddings) throw new Error('No embeddings returned from batch API');
      return result.embeddings.map(e => e.values);
    } catch (err) {
      const isRateLimit =
        err.message.includes('429') ||
        err.message.includes('Quota exceeded') ||
        err.message.includes('Too Many Requests');

      if (isRateLimit && attempt < 3) {
        const retryAfterMatch = err.message.match(/retry.*?(\d+)s/i);
        const hintMs = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : 0;
        const sleepTime = Math.max(hintMs, 3000 * attempt) + Math.random() * 1000;
        logger.warn(
          `Rate limit hit during batch embedding (attempt ${attempt}/3). Retrying in ${Math.round(sleepTime / 1000)}s…`
        );
        await delay(sleepTime);
      } else {
        // Propagate; caller will fall back to sequential
        throw err;
      }
    }
  }
};

// ── Sequential fallback for one chunk-group ───────────────────────────────────
const embedSequential = async (texts) => {
  const vectors = [];
  logger.info(`Starting sequential fallback for ${texts.length} items (${SEQUENTIAL_DELAY_MS}ms gap each)…`);

  for (const t of texts) {
    try {
      const vector = await embedText(t);
      vectors.push(vector);
    } catch (seqErr) {
      logger.error('Sequential fallback embedding permanently failed', { error: seqErr.message });
      vectors.push(new Array(786).fill(0)); // fail-safe zero vector
    }
    // Pace sequential requests to stay safely under 100 RPM
    await delay(SEQUENTIAL_DELAY_MS);
  }
  return vectors;
};

// ── Public: embed an arbitrary number of texts ────────────────────────────────
//
// Splits texts into micro-batches of BATCH_SIZE, sends each via the batch API
// (with retry), then waits INTER_BATCH_DELAY_MS before the next batch.
// If the batch API fails for a micro-batch, falls back to sequential for that
// group only (with SEQUENTIAL_DELAY_MS pacing).
//
export const batchEmbedTexts = async (texts) => {
  const embeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);

    logger.info(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${chunk.length} items)…`);

    let batchVectors;
    try {
      batchVectors = await embedBatchChunk(chunk);
    } catch (batchErr) {
      logger.warn(`Batch API failed for items [${i}–${i + chunk.length - 1}], switching to sequential: ${batchErr.message}`);
      batchVectors = await embedSequential(chunk);
    }

    embeddings.push(...batchVectors);

    // Wait between batches to respect the RPM quota
    if (i + BATCH_SIZE < texts.length) {
      logger.info(`Inter-batch pause: ${INTER_BATCH_DELAY_MS / 1000}s…`);
      await delay(INTER_BATCH_DELAY_MS);
    }
  }

  return embeddings;
};

// Keep old wrapper for backward compatibility
export const embedBatch = batchEmbedTexts;
