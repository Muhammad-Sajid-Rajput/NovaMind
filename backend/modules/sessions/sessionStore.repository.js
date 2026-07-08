// NovaMind — backend/repositories/sessionStore.js
// Data access layer for Sessions and Messages.
// Moved from models/ (which should only contain Mongoose schemas).

import mongoose from "mongoose";
import Session from "./Session.model.js";
import Message from "../messages/Message.model.js";
import { logger } from "../../core/utils/logger.js";

const MAX_MESSAGES_PER_SESSION = 200;

export const SessionStore = {

  // ─── Sessions ──────────────────────────────────────────────────────────────

  createSession: async (id, userId, name = "New Chat") => {
    const session = await Session.findByIdAndUpdate(
      id,
      { userId, name },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    return session;
  },

  getSession: async (id, userId) => {
    return Session.findOne({ _id: id, userId });
  },

  getAllSessions: async (userId) => {
    const sessions = await Session.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "sessionId",
          as: "messages"
        }
      },
      {
        $addFields: { messageCount: { $size: "$messages" } }
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          createdAt: 1,
          messageCount: 1,
          _id: 0
        }
      }
    ]);
    return sessions;
  },

  updateSessionName: async (id, userId, name) => {
    const updated = await Session.findOneAndUpdate(
      { _id: id, userId },
      { name },
      { returnDocument: "after" }
    );
    return updated;
  },

  deleteSession: async (id, userId) => {
    const deleted = await Session.findOneAndDelete({ _id: id, userId });
    if (deleted) {
      await Message.deleteMany({ sessionId: id, userId });
      return true;
    }
    return false;
  },

  sessionExists: async (id, userId) => {
    const count = await Session.countDocuments({ _id: id, userId });
    return count > 0;
  },

  getSessionCount: async (userId) => {
    return Session.countDocuments({ userId });
  },

  // ─── Messages ──────────────────────────────────────────────────────────────

  getMessages: async (sessionId, userId) => {
    return Message.find({ sessionId, userId }).sort({ createdAt: 1 }).lean();
  },

  setMessages: async (sessionId, userId, messages) => {
    await Message.deleteMany({ sessionId, userId });
    if (messages.length > 0) {
      const docs = messages.map((m) => ({ ...m, sessionId, userId }));
      await Message.insertMany(docs, { ordered: false });
    }
  },

  addMessage: async (sessionId, userId, message) => {
    const doc = new Message({ ...message, sessionId, userId });
    await doc.save();

    // Enforce message limit — remove oldest if over limit
    const count = await Message.countDocuments({ sessionId, userId });
    if (count > MAX_MESSAGES_PER_SESSION) {
      const oldest = await Message.findOne({ sessionId, userId }).sort({ createdAt: 1 });
      if (oldest) {
        await oldest.deleteOne();
        logger.info(`Message limit reached for session ${sessionId}. Evicted oldest message.`);
      }
    }
    return doc;
  },

  clearMessages: async (sessionId, userId) => {
    await Message.deleteMany({ sessionId, userId });
    return true;
  },

  getLastNMessages: async (sessionId, userId, n) => {
    const limit = parseInt(n, 10) || 10;
    const historyCount = Math.max(0, limit - 1);
    const messages = await Message.find({ sessionId, userId })
      .sort({ createdAt: -1 })
      .limit(historyCount)
      .lean();
    return messages.reverse();
  },

  getTotalMessagesCount: async () => {
    return Message.countDocuments();
  },

  truncateMessages: async (sessionId, userId, fromIndex) => {
    const messages = await Message.find({ sessionId, userId })
      .sort({ createdAt: 1 })
      .lean();
    const toDelete = messages.slice(fromIndex);
    const ids = toDelete.map((m) => m._id);
    if (ids.length > 0) {
      await Message.deleteMany({ _id: { $in: ids } });
    }
    return messages.slice(0, fromIndex).length;
  }
};
