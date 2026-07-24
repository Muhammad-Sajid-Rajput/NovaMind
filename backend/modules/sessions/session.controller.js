// NovaMind — backend/modules/sessions/session.controller.js

import { SessionStore }        from "./sessionStore.repository.js";
import { asyncHandler }        from "../../core/utils/asyncHandler.js";
import { deleteSessionVectors, deleteUserVectors } from "../../core/services/pineconeService.js";
import { logger }              from "../../core/utils/logger.js";
import crypto                  from "crypto";
import Message                 from "../messages/Message.model.js";
import Session                 from "./Session.model.js";
import {
  deleteSessionDocuments,
  deleteAllUserDocuments,
  deleteCloudinaryAssetsForMessages,
} from "../upload/cleanupHelper.js";

export const createSession = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId: customId, name } = req.body || {};
  const sessionId = customId || crypto.randomUUID();
  await SessionStore.createSession(sessionId, userId, name || "New Chat");
  res.json({ sessionId });
});

export const getSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const list = await SessionStore.getAllSessions(userId);
  res.json({ sessions: list });
});

export const renameSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  const session = await SessionStore.getSession(id, userId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const updated = await SessionStore.updateSessionName(id, userId, name);
  res.json({ success: true, session: updated });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const session = await SessionStore.getSession(id, userId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // 1. Fetch messages to identify any Cloudinary file/image attachments
  const messages = await SessionStore.getMessages(id, userId);
  await deleteCloudinaryAssetsForMessages(messages);

  // 2. Delete Pinecone vectors associated with this session
  try {
    await deleteSessionVectors(id, userId);
  } catch (err) {
    logger.warn('Failed to delete Pinecone vectors for session, continuing', { error: err.message, sessionId: id });
  }

  // 3. Delete all file registries, chunks, and manifests associated with this session (Fix #16)
  await deleteSessionDocuments(id, userId);

  // 4. Cascade delete session metadata & messages from MongoDB
  await SessionStore.deleteSession(id, userId);

  res.json({ success: true, message: "Session deleted" });
});

export const clearAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 1. Fetch all sessions of the user
  const sessions = await SessionStore.getAllSessions(userId);
  const sessionIds = sessions.map((s) => s.id);

  if (sessionIds.length > 0) {
    // 2. Fetch all messages in these sessions to find Cloudinary attachments
    const messages = await Message.find({ sessionId: { $in: sessionIds }, userId }).lean();
    await deleteCloudinaryAssetsForMessages(messages);

    // 3. Delete Pinecone vectors for all sessions
    try {
      await deleteUserVectors(userId.toString());
    } catch (err) {
      logger.warn('Failed to delete Pinecone vectors during clear all chats', { error: err.message, userId });
    }

    // 4. Delete all user file registries, chunks, and manifests (Fix #16)
    await deleteAllUserDocuments(userId);

    // 5. Delete all sessions and messages from MongoDB
    await Message.deleteMany({ sessionId: { $in: sessionIds }, userId });
    await Session.deleteMany({ userId });
  }

  res.json({ success: true, message: "All sessions cleared" });
});
