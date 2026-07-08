// NovaMind — upload.routes.js — Phase 4
import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import { getUploadSignature, ingestDocument, getIngestStatus, cancelUpload } from './upload.controller.js';

const router = Router();

// Secure all routes with authentication middleware
router.get('/signature',     requireAuth, getUploadSignature);
router.post('/ingest',       requireAuth, ingestDocument);
router.get('/ingest/:jobId', requireAuth, getIngestStatus);
router.post('/cancel',       requireAuth, cancelUpload);

export default router;
