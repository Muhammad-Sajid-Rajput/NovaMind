// NovaMind — ingestWorker.js — File Upload Bug Fix
// BullMQ worker for parsing, chunking, and embedding document uploads.

import { Worker, UnrecoverableError } from 'bullmq';
import { workerRedis } from '../../../core/config/redis.js';
import { logger } from '../../../core/utils/logger.js';

// Import registries
import parserRegistry from '../../../core/ai/parsers/index.js';
import chunkStrategyRegistry from '../../../core/ai/chunkers/index.js';

// Import Database Models
import FileRegistry from '../models/FileRegistry.model.js';
import DocumentManifest from '../models/DocumentManifest.model.js';
import EmbeddingCache from '../models/EmbeddingCache.model.js';
import DocumentChunk from '../models/DocumentChunk.model.js';

// Import validation utilities
import { 
  calculateSha256, 
  validateFileSignature 
} from '../utils/fileValidation.js';

// Import API services
import { batchEmbedTexts } from '../../../core/services/embeddingService.js';
import { upsertVectors } from '../../../core/services/pineconeService.js';

const processIngestJob = async (job) => {
  const { 
    fileUrl, fileName, fileType, 
    sessionId, userId, messageId, registryId 
  } = job.data;

  logger.info('Processing ingest job', { 
    jobId: job.id, fileName, registryId 
  });

  // Helper to update state transitions in MongoDB
  const updateRegistryStatus = async (status, extraData = {}) => {
    if (registryId) {
      await FileRegistry.findByIdAndUpdate(registryId, { status, ...extraData });
    }
  };

  try {
    // ── Step 1: Downloading ──────────────────────────
    await job.updateProgress(10);
    await updateRegistryStatus('Downloading');
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      // 404 / 410 / 403 → the Cloudinary asset is gone (cancelled or expired).
      // Throw UnrecoverableError so BullMQ skips all retry attempts immediately.
      const DEAD_STATUS = [403, 404, 410];
      if (DEAD_STATUS.includes(response.status)) {
        throw new UnrecoverableError(
          `File no longer available (HTTP ${response.status}): ${fileName}. Job discarded without retry.`
        );
      }
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('File downloaded', { 
      fileName, 
      bytes: buffer.length 
    });

    // Calculate SHA-256 hash of downloaded file
    const sha256 = calculateSha256(buffer);
    await updateRegistryStatus('Validated', { sha256, fileSize: buffer.length });

    // Validate magic-number file signature
    const isValidSignature = validateFileSignature(buffer, fileName);
    if (!isValidSignature) {
      throw new Error('Security Error: File content signature mismatch or unsupported format.');
    }

    // ── Step 2: Parsing ──────────────────────────────
    await job.updateProgress(25);
    await updateRegistryStatus('Parsing');

    const parser = parserRegistry.getParser(fileName);
    const parsed = await parser.parse(buffer, fileName);

    logger.info('Document parsed via registry', {
      parserUsed: parser.name,
      parserVersion: parser.version,
      type: parsed.type,
      nodesCount: parsed.documentModel.length
    });

    if (!parsed.documentModel || parsed.documentModel.length === 0) {
      logger.warn('Document contained no parsable nodes', { fileName });
      await updateRegistryStatus('Completed');
      await job.updateProgress(100);
      return { success: true, fileName, chunks: 0, vectors: 0 };
    }

    // ── Step 3: Chunking ─────────────────────────────
    await job.updateProgress(50);
    await updateRegistryStatus('Chunking');

    const chunkStrategy = chunkStrategyRegistry.getStrategy(parsed.type);
    const structuredChunks = chunkStrategy.chunk(parsed.documentModel);

    logger.info('Document chunked via strategy', {
      strategyUsed: chunkStrategy.name,
      strategyVersion: chunkStrategy.version,
      chunksCount: structuredChunks.length
    });

    if (structuredChunks.length === 0) {
      logger.warn('Chunk strategy returned 0 chunks', { fileName });
      await updateRegistryStatus('Completed');
      await job.updateProgress(100);
      return { success: true, fileName, chunks: 0, vectors: 0 };
    }

    // ── Step 4: Embedding Cache & API Calls ──────────
    await job.updateProgress(75);
    await updateRegistryStatus('Embedding');

    const embeddings = [];
    const chunksToEmbed = [];
    const chunkEmbedIndices = [];

    // Check embedding cache for each chunk text
    for (let i = 0; i < structuredChunks.length; i++) {
      const chunkTextVal = structuredChunks[i].text;
      const chunkHash = calculateSha256(Buffer.from(chunkTextVal));
      
      const cached = await EmbeddingCache.findOne({ chunkHash });
      if (cached) {
        embeddings[i] = cached.values;
      } else {
        chunksToEmbed.push(chunkTextVal);
        chunkEmbedIndices.push(i);
      }
    }

    // Request vector embeddings for any cache misses
    if (chunksToEmbed.length > 0) {
      logger.info('Embedding cache misses detected. Requesting API embeddings...', {
        missesCount: chunksToEmbed.length
      });
      
      const newEmbeddings = await batchEmbedTexts(chunksToEmbed);
      
      // Save new embeddings to cache database
      for (let i = 0; i < chunksToEmbed.length; i++) {
        const chunkTextVal = chunksToEmbed[i];
        const chunkHash = calculateSha256(Buffer.from(chunkTextVal));
        const values = newEmbeddings[i];
        
        embeddings[chunkEmbedIndices[i]] = values;

        // Save asynchronously without blocking the loop
        EmbeddingCache.create({
          chunkHash,
          values,
          model: 'gemini-embedding-2'
        }).catch(err => {
          logger.warn('Failed to save embedding to cache collection', { error: err.message });
        });
      }
    }

    // ── Step 5: Indexing in Vector Store ─────────────
    await job.updateProgress(90);
    await updateRegistryStatus('Indexing');

    const vectors = structuredChunks.map((chunk, idx) => ({
      id: `${registryId}-${idx}`,
      values: embeddings[idx],
      metadata: {
        userId,
        sessionId,
        messageId,
        fileId: registryId,
        fileUrl,
        fileName,
        text: chunk.text,
        index: idx,
        sha256,
        parserVersion: parser.version,
        embeddingVersion: 'gemini-embedding-2',
        chunkStrategyVersion: chunkStrategy.version,
        retrievalVersion: '1.0.0',
        ...chunk.metadata // Expand pageNumber, sheetName, slideNumber, or headingPath
      }
    }));

    await upsertVectors(vectors);

    // Save DocumentManifest stats for local retrieval querying
    const documentId = `doc-${crypto.randomUUID()}`;
    
    // Save chunks to MongoDB local lexical store
    const dbChunks = structuredChunks.map((chunk, idx) => ({
      documentId,
      sessionId,
      userId,
      text: chunk.text,
      metadata: {
        index: idx,
        sha256,
        ...chunk.metadata
      }
    }));
    await DocumentChunk.insertMany(dbChunks);

    await DocumentManifest.create({
      documentId,
      sessionId,
      title: fileName,
      totalPages: parsed.pages || 1,
      totalChunks: structuredChunks.length,
      parserUsed: parser.name,
      embeddingModelUsed: 'gemini-embedding-2',
      parserVersion: parser.version,
      embeddingVersion: 'gemini-embedding-2',
      chunkStrategyVersion: chunkStrategy.version,
      retrievalVersion: '1.0.0',
      status: 'indexed'
    });

    await updateRegistryStatus('Completed', { documentId });
    await job.updateProgress(100);

    return {
      success: true,
      fileName,
      chunks: structuredChunks.length,
      vectors: vectors.length,
      sessionId
    };

  } catch (err) {
    logger.error('Ingest worker job failed', { 
      jobId: job.id, 
      fileName, 
      error: err.message 
    });
    
    await updateRegistryStatus('Failed', { error: err.message });
    throw err;
  }
};

// ── Create and start the worker ────────────────────
export const startIngestWorker = () => {
  const worker = new Worker(
    'file-ingest',
    processIngestJob,
    {
      connection: workerRedis,
      concurrency: 2,
      lockDuration: 180000, // 3 minutes lock duration (default is 30s)
      maxStalledCount: 2   // Allow up to 2 stalls (default is 1)
    }
  );

  worker.on('completed', (job, result) => {
    logger.info('Ingest job completed successfully', {
      jobId: job.id,
      fileName: result.fileName,
      chunks: result.chunks
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Ingest job failed permanently', {
      jobId: job?.id,
      fileName: job?.data?.fileName,
      error: err.message,
      attempts: job?.attemptsMade
    });
  });

  worker.on('progress', (job, progress) => {
    logger.info('Ingest job progress', {
      jobId: job.id,
      progress: `${progress}%`
    });
  });

  logger.info('BullMQ ingest worker started');
  return worker;
};
