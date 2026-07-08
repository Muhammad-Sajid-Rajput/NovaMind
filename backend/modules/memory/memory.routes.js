// NovaMind — memory.routes.js — Phase 5
import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.js';
import {
  getMemories,
  deleteMemory,
  deleteAllMemories,
} from './memory.controller.js';

const router = Router();

// All memory routes require authentication
router.use(requireAuth);

router.get('/',       getMemories);
router.delete('/',    deleteAllMemories);
router.delete('/:id', deleteMemory);

export default router;
