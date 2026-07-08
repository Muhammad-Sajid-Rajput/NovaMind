// NovaMind — upload.controller.js — Error System
import crypto from 'crypto';
import cloudinary from '../../core/config/cloudinary.js';
import { addIngestJob, ingestQueue } from './queues/ingestQueue.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { logger } from '../../core/utils/logger.js';
import { deleteMessageVectors } from '../../core/services/pineconeService.js';
import FileRegistry from './models/FileRegistry.model.js';

// GET /api/upload/signature
// Returns signed parameters for Cloudinary direct client-side upload.
export const getUploadSignature = asyncHandler(async (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder    = "novamind_uploads";

  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    signature,
    timestamp,
    folder,
    apiKey:    process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
});

// Helper to categorize document types for rate limiting
export const getDocumentType = (fileName, mimeType = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['docx', 'doc'].includes(ext) || mime.includes('word') || mime.includes('officedocument.wordprocessingml')) return 'word';
  if (['xlsx', 'xls', 'csv'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheetml') || mime.includes('csv')) return 'excel';
  if (['pptx', 'ppt'].includes(ext) || mime.includes('powerpoint') || mime.includes('presentationml')) return 'powerpoint';
  if (ext === 'txt' || mime.includes('text/plain')) return 'text';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mime.startsWith('image/')) return 'image';
  return 'other';
};

// POST /api/upload/ingest
// Called AFTER frontend uploads file to Cloudinary
export const ingestDocument = asyncHandler(async (req, res) => {
  const { fileUrl, fileName, fileType, sessionId, messageId, publicId, fileSize } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!fileUrl || !fileName || !fileType || !sessionId) {
    return res.status(400).json({
      error: 'Missing required parameters.',
    });
  }

  // Validate it's not an image (images don't go through RAG)
  if (fileType.startsWith('image/')) {
    return res.status(400).json({
      error: 'Images are not supported for document Q&A. Please upload images directly to the chat instead.',
    });
  }

  // Validate supported types
  const SUPPORTED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
  ];

  const ext = fileName.split('.').pop().toLowerCase();
  const validExts = ['pdf','docx','xlsx','xls','pptx','ppt','txt','csv'];

  if (!SUPPORTED.includes(fileType) && !validExts.includes(ext)) {
    return res.status(400).json({
      error: 'This file type is not supported. Supported: PDF, Word, Excel, PowerPoint, TXT, CSV.',
    });
  }

  // ── Limit 1: Max 2 files in one message ───────────────────────────────────────
  if (messageId) {
    const messageFilesCount = await FileRegistry.countDocuments({
      userId,
      sessionId,
      messageId,
      status: { $ne: 'Failed' }
    });
    if (messageFilesCount >= 2) {
      return res.status(400).json({
        error: 'You can only upload up to 2 files per message.'
      });
    }
  }

  // ── Limit 2: Max 2 files of each document type in 24 hours (Except text files) ───
  const docType = getDocumentType(fileName, fileType);
  if (docType !== 'text') {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const registries = await FileRegistry.find({
      userId,
      createdAt: { $gte: oneDayAgo },
      status: { $ne: 'Failed' }
    });

    let matchCount = 0;
    for (const reg of registries) {
      if (getDocumentType(reg.fileName) === docType) {
        matchCount++;
      }
    }

    if (matchCount >= 2) {
      return res.status(400).json({
        error: `Daily limit reached. You can only upload up to 2 files of type "${docType.toUpperCase()}" per day.`
      });
    }
  }

  // Create FileRegistry entry in DB
  const registry = await FileRegistry.create({
    userId,
    sessionId,
    messageId: messageId || null,
    fileName,
    fileSize: fileSize || 0,
    sha256: 'pending',
    cloudinaryUrl: fileUrl,
    publicId: publicId || 'pending',
    status: 'Queued',
  });

  // Add to queue
  const job = await addIngestJob({
    fileUrl,
    fileName,
    fileType,
    sessionId,
    userId,
    messageId: messageId || crypto.randomUUID(),
    registryId: registry._id,
  });

  // Persist the jobId so getIngestStatus can fall back to it after BullMQ cleanup
  registry.jobId = job.id;
  await registry.save();

  // Return 202 Accepted immediately
  res.status(202).json({
    success:   true,
    jobId:     job.id,
    status:    'processing',
    message:   `"${fileName}" is being processed in the background`,
    fileName,
    sessionId,
  });
});

// GET /api/upload/ingest/:jobId
// Checks progress of ingestion job
export const getIngestStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await ingestQueue.getJob(jobId);

  // Job not found in BullMQ — it may have been cleaned up after completion
  // (removeOnComplete eviction). Fall back to FileRegistry for ground truth.
  if (!job) {
    const registry = await FileRegistry.findOne({ jobId }).sort({ createdAt: -1 });

    // If FileRegistry shows a terminal state, synthesize the response
    if (registry?.status === 'Completed') {
      return res.status(200).json({
        jobId,
        status:   'completed',
        progress: 100,
        result:   { fileName: registry.fileName },
        error:    null,
      });
    }
    if (registry?.status === 'Failed') {
      return res.status(200).json({
        jobId,
        status:   'failed',
        progress: 0,
        result:   null,
        error:    registry.error || 'Ingestion failed',
      });
    }

    // Truly unknown job — return 404
    return res.status(404).json({ error: 'Ingestion job not found.' });
  }

  const state    = await job.getState();
  const progress = job.progress;

  res.status(200).json({
    jobId,
    status:   state,        // waiting, active, completed, failed
    progress: progress || 0,
    result:   state === 'completed' ? job.returnvalue : null,
    error:    state === 'failed'    ? job.failedReason : null,
  });
});

// POST /api/upload/cancel
export const cancelUpload = asyncHandler(async (req, res) => {
  const { publicId, resourceType, messageId } = req.body;
  const userId = req.user.id;

  logger.info('Cancelling upload and cleaning up assets', { publicId, messageId });

  // 1. Delete from Cloudinary if publicId exists
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'raw' });
    } catch (err) {
      logger.error('Failed to delete Cloudinary file during cancel', { publicId, error: err.message });
    }
  }

  // 2. Delete vectors from Pinecone if messageId exists
  if (messageId) {
    try {
      await deleteMessageVectors(messageId, userId.toString());
    } catch (err) {
      logger.error('Failed to delete Pinecone vectors during cancel', { messageId, error: err.message });
    }
  }

  res.json({ success: true, message: 'Upload cancelled and assets cleaned up.' });
});
