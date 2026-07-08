// NovaMind — backend/routes/index.js — Phase 5
// Aggregates all modular route files under the /api prefix.

import { Router } from "express";
import authRoutes    from "../modules/auth/auth.routes.js";
import chatRoutes    from "../modules/chat/chat.routes.js";
import sessionRoutes from "../modules/sessions/session.routes.js";
import messageRoutes from "../modules/messages/message.routes.js";
import utilRoutes    from "../modules/utils/util.routes.js";
import uploadRoutes  from "../modules/upload/upload.routes.js";
import memoryRoutes  from "../modules/memory/memory.routes.js";

const router = Router();

router.use("/auth",     authRoutes);
router.use("/chat",     chatRoutes);
router.use("/sessions", sessionRoutes);
router.use("/messages", messageRoutes);
router.use("/upload",   uploadRoutes);
router.use("/memory",   memoryRoutes);   // Phase 5 — AI Memory
router.use("/",         utilRoutes);     // /api/status, /api/password

export default router;
