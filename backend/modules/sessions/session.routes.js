import { Router } from "express";
import {
  createSession,
  getSessions,
  renameSession,
  deleteSession,
  clearAllSessions,
} from "./session.controller.js";
import { validateSession } from "./session.validator.js";
import { requireAuth } from "../../core/middleware/auth.js";

const router = Router();

// ─── All session routes require authentication ────────────────────────────────
router.post("/", requireAuth, createSession);
router.get("/", requireAuth, getSessions);
router.put("/:id", requireAuth, validateSession, renameSession);
router.delete("/", requireAuth, clearAllSessions);
router.delete("/:id", requireAuth, deleteSession);

export default router;
