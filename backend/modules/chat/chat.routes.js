// NovaMind — backend/modules/chat/chat.routes.js — Phase 5
// Chat routes registry. Removed multer buffer upload setup.
// Direct Cloudinary URLs are now received directly in request bodies.

import { Router } from "express";
import { sendMessage, sendStream, sendVision, getTelemetry } from "./chat.controller.js";
import { searchMessages } from "./search.controller.js";
import { validateChat } from "./chat.validator.js";
import { chatLimiter } from "../../core/middleware/rateLimit.js";
import { requireAuth } from "../../core/middleware/auth.js";

const router = Router();

// ─── All chat routes: auth first, then rate limit ─────────────────────────────
router.get("/telemetry", requireAuth, getTelemetry);
router.get("/search",    requireAuth, searchMessages);       // Phase 5 — full-text search
router.post("/",         requireAuth, chatLimiter, validateChat, sendMessage);
router.post("/stream",   requireAuth, chatLimiter, validateChat, sendStream);
router.post("/vision",   requireAuth, chatLimiter, validateChat, sendVision);

export default router;

