// NovaMind — backend/modules/messages/message.routes.js

import { Router } from "express";
import {
  getMessages,
  clearMessages,
  truncateMessages,
} from "./message.controller.js";
import { validateGetMessages } from "./message.validator.js";
import { requireAuth } from "../../core/middleware/auth.js";

const router = Router();

// ─── All message routes require authentication ────────────────────────────────
router.get("/", requireAuth, validateGetMessages, getMessages);
router.delete("/", requireAuth, validateGetMessages, clearMessages);
router.delete("/truncate", requireAuth, truncateMessages);

export default router;
