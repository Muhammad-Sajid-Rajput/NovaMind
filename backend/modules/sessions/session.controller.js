// NovaMind — backend/modules/sessions/session.controller.js

import { SessionStore } from "./sessionStore.repository.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import cloudinary from "../../core/config/cloudinary.js";
import { deleteSessionVectors, deleteUserVectors } from "../../core/services/pineconeService.js";
import { logger } from "../../core/utils/logger.js";
import crypto from "crypto";
import Message from "../messages/Message.model.js";
import Session from "./Session.model.js";
import FileRegistry from "../upload/models/FileRegistry.model.js";
import DocumentChunk from "../upload/models/DocumentChunk.model.js";
import DocumentManifest from "../upload/models/DocumentManifest.model.js";

const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\s?#]+)$/);
  if (!match) return null;
  const cleanPath = match[1];
  const lastDotIdx = cleanPath.lastIndexOf('.');
  return lastDotIdx === -1 ? cleanPath : cleanPath.substring(0, lastDotIdx);
};

const deleteCloudinaryFile = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info(`Deleted file from Cloudinary`, { publicId, result });
    return result;
  } catch (err) {
    logger.error('Failed to delete Cloudinary file', { publicId, error: err.message });
  }
};

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

  // 1. Fetch all messages to identify any Cloudinary file/image attachments
  const messages = await SessionStore.getMessages(id, userId);

  // 2. Delete each attachment from Cloudinary
  for (const msg of messages) {
    if (msg.image && msg.image.publicId) {
      await deleteCloudinaryFile(msg.image.publicId, msg.image.resourceType || 'image');
    } else if (msg.image && typeof msg.image === 'string') {
      const publicId = extractPublicId(msg.image);
      if (publicId) {
        await deleteCloudinaryFile(publicId, 'image');
      }
    }
    if (msg.file && msg.file.publicId) {
      await deleteCloudinaryFile(msg.file.publicId, msg.file.resourceType || 'raw');
    }
  }

  // 3. Delete Pinecone vectors associated with this session
  try {
    await deleteSessionVectors(id, userId);
  } catch (err) {
    logger.warn('Failed to delete Pinecone vectors for session, continuing', { error: err.message, sessionId: id });
  }

  // 3a. Delete all file registries, chunks, and manifests associated with this session
  // Note: Daily upload quota is NOT refunded on session/file deletion.
  try {
    const registries = await FileRegistry.find({ sessionId: id, userId });
    for (const reg of registries) {
      if (reg.publicId) {
        await deleteCloudinaryFile(reg.publicId, 'raw');
      }
      if (reg.documentId) {
        await DocumentChunk.deleteMany({ documentId: reg.documentId });
        await DocumentManifest.deleteOne({ documentId: reg.documentId });
      } else if (reg.sha256 && reg.sha256 !== 'pending') {
        const sampleChunk = await DocumentChunk.findOne({
          sessionId: id,
          userId,
          'metadata.sha256': reg.sha256
        });
        if (sampleChunk && sampleChunk.documentId) {
          await DocumentChunk.deleteMany({ documentId: sampleChunk.documentId });
          await DocumentManifest.deleteOne({ documentId: sampleChunk.documentId });
        } else {
          await DocumentChunk.deleteMany({ sessionId: id, userId, 'metadata.sha256': reg.sha256 });
          await DocumentManifest.deleteOne({ sessionId: id, title: reg.fileName });
        }
      }
    }
    await FileRegistry.deleteMany({ sessionId: id, userId });
    logger.info(`Deleted file registries, chunks, and manifests associated with session ${id}`);
  } catch (err) {
    logger.warn('Failed to delete file registries / chunks for session, continuing', { error: err.message, sessionId: id });
  }

  // 3b. Delete User Memories associated with this session
  try {
    const Memory = (await import("../memory/Memory.model.js")).default;
    await Memory.deleteMany({ extractedFrom: id, userId });
    logger.info(`Deleted memories associated with session ${id}`);
  } catch (err) {
    logger.warn('Failed to delete memories for session, continuing', { error: err.message, sessionId: id });
  }

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

    // 3. Delete attachments from Cloudinary
    for (const msg of messages) {
      if (msg.image && msg.image.publicId) {
        await deleteCloudinaryFile(msg.image.publicId, msg.image.resourceType || 'image');
      } else if (msg.image && typeof msg.image === 'string') {
        const publicId = extractPublicId(msg.image);
        if (publicId) {
          await deleteCloudinaryFile(publicId, 'image');
        }
      }
      if (msg.file && msg.file.publicId) {
        await deleteCloudinaryFile(msg.file.publicId, msg.file.resourceType || 'raw');
      }
    }

    // 4. Delete Pinecone vectors for all sessions
    try {
      await deleteUserVectors(userId.toString());
    } catch (err) {
      logger.warn('Failed to delete Pinecone vectors during clear all chats', { error: err.message, userId });
    }

    // 4b. Delete all user file registries, chunks, and manifests
    try {
      const registries = await FileRegistry.find({ userId });
      for (const reg of registries) {
        if (reg.publicId) {
          await deleteCloudinaryFile(reg.publicId, 'raw');
        }
        if (reg.documentId) {
          await DocumentChunk.deleteMany({ documentId: reg.documentId });
          await DocumentManifest.deleteOne({ documentId: reg.documentId });
        } else if (reg.sha256 && reg.sha256 !== 'pending') {
          const sampleChunk = await DocumentChunk.findOne({
            userId,
            'metadata.sha256': reg.sha256
          });
          if (sampleChunk && sampleChunk.documentId) {
            await DocumentChunk.deleteMany({ documentId: sampleChunk.documentId });
            await DocumentManifest.deleteOne({ documentId: sampleChunk.documentId });
          } else {
            await DocumentChunk.deleteMany({ userId, 'metadata.sha256': reg.sha256 });
            await DocumentManifest.deleteMany({ sessionId: reg.sessionId, title: reg.fileName });
          }
        }
      }
      await FileRegistry.deleteMany({ userId });
      logger.info(`Deleted all file registries, chunks, and manifests for user ${userId}`);
    } catch (err) {
      logger.warn('Failed to delete file registries / chunks for user, continuing', { error: err.message, userId });
    }

    // 5. Delete all User Memories
    try {
      const Memory = (await import("../memory/Memory.model.js")).default;
      await Memory.deleteMany({ userId });
      logger.info(`Deleted all memories for user ${userId}`);
    } catch (err) {
      logger.warn('Failed to delete memories during clear all chats', { error: err.message, userId });
    }

    // 6. Delete all sessions and messages from MongoDB
    await Message.deleteMany({ sessionId: { $in: sessionIds }, userId });
    await Session.deleteMany({ userId });
  }

  res.json({ success: true, message: "All sessions cleared" });
});
