// NovaMind — ingestQueue.js — Phase 5
import { Queue } from 'bullmq';
import { queueRedis } from '../../../core/config/redis.js';
import { logger }     from '../../../core/utils/logger.js';

export const ingestQueue = new Queue('file-ingest', {
  connection: queueRedis,
  defaultJobOptions: {
    attempts:    3,
    backoff: {
      type:  'exponential',
      delay: 2000,
    },
    removeOnComplete: 50,  // keep last 50 completed jobs
    removeOnFail:     100, // keep last 100 failed jobs
  },
});

// Helper to add a file ingestion job
export const addIngestJob = async ({
  fileUrl,
  fileName,
  fileType,
  sessionId,
  userId,
  messageId,
  registryId,
}) => {
  const job = await ingestQueue.add(
    'ingest-document',
    { fileUrl, fileName, fileType, sessionId, userId, messageId, registryId },
    { jobId: `${sessionId}-${Date.now()}` }
  );

  logger.info('File ingest job queued', {
    jobId:     job.id,
    fileName,
    sessionId,
    userId,
  });

  return job;
};
