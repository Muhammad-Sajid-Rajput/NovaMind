// NovaMind — backend/modules/messages/message.controller.js

import { SessionStore } from "../sessions/sessionStore.repository.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { logger } from "../../core/utils/logger.js";

export const getMessages = asyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  const userId = req.user.id;
  const messages = await SessionStore.getMessages(sessionId, userId);
  res.json({ messages });
});

export const clearMessages = asyncHandler(async (req, res) => {
  const sessionId = req.query.sessionId || req.body.sessionId;
  const userId = req.user.id;
  await SessionStore.clearMessages(sessionId, userId);

  // Delete User Memories associated with this session
  try {
    const Memory = (await import("../memory/Memory.model.js")).default;
    await Memory.deleteMany({ extractedFrom: sessionId, userId });
  } catch (err) {
    // Non-fatal — memory deletion should never block message clearing
    logger.warn("[clearMessages] Failed to delete session memories", { error: err.message, sessionId });
  }

  res.json({ success: true, message: "Chat history cleared" });
});

export const truncateMessages = asyncHandler(async (req, res) => {
  const { sessionId, fromIndex } = req.body;
  const userId = req.user.id;

  if (!sessionId || fromIndex === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const remaining = await SessionStore.truncateMessages(sessionId, userId, fromIndex);
  res.json({ success: true, remainingMessages: remaining });
});
