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

  getActiveMessagePath: async (sessionId, userId) => {
    const session = await Session.findOne({ _id: sessionId, userId }).lean();
    const allMessages = await Message.find({ sessionId, userId }).sort({ createdAt: 1 }).lean();
    if (allMessages.length === 0) return [];

    // ── Legacy-session fast path ──────────────────────────────────────────────
    // Sessions created before the tree migration have no parentMessageId /
    // activeChildId linkage. Detect this and return the flat chronological list
    // so pre-existing conversations are not broken.
    const hasTreeStructure =
      session?.activeRootId != null ||
      allMessages.some((m) => m.parentMessageId != null || m.activeChildId != null);

    if (!hasTreeStructure) {
      return allMessages;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Build canonical ID mapping so _id and custom id references unify
    const idToCanonicalIdMap = new Map();
    for (const msg of allMessages) {
      const canonicalId = String(msg._id);
      idToCanonicalIdMap.set(canonicalId, canonicalId);
      if (msg.id) {
        idToCanonicalIdMap.set(String(msg.id), canonicalId);
      }
    }

    const getCanonicalParentId = (parentMsgId) => {
      if (!parentMsgId) return "ROOT";
      const str = String(parentMsgId);
      return idToCanonicalIdMap.get(str) || str;
    };

    const childrenMap = new Map();
    for (const msg of allMessages) {
      const parentKey = getCanonicalParentId(msg.parentMessageId);
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey).push(msg);
    }

    const roots = childrenMap.get("ROOT") || [];
    if (roots.length === 0) return [];

    let currentNode = session?.activeRootId
      ? roots.find((r) => {
          const rId = String(r._id);
          const activeRootStr = String(session.activeRootId);
          return rId === activeRootStr || (r.id && String(r.id) === activeRootStr);
        }) || roots[0]
      : roots[0];

    const path = [];

    while (currentNode) {
      const parentKey = getCanonicalParentId(currentNode.parentMessageId);
      const siblings = childrenMap.get(parentKey) || [];

      // Only user messages can have edit variants; filter siblings to user-sender only
      // so bot replies never pollute the sibling list and produce a wrong < 1/2 > count.
      const userSiblings = siblings.filter((s) => s.sender === "user");

      path.push({
        ...currentNode,
        // Serialize parentMessageId to string so the frontend can use it directly
        parentMessageId: currentNode.parentMessageId ? String(currentNode.parentMessageId) : null,
        versionInfo:
          currentNode.sender === "user" && userSiblings.length > 1
            ? {
                // Serialize all sibling IDs to strings — avoids ObjectId comparison failures
                siblingIds: userSiblings.map((s) => String(s._id)),
                currentIndex: userSiblings.findIndex(
                  (s) => String(s._id) === String(currentNode._id)
                )
              }
            : null
      });

      if (!currentNode.activeChildId) break;

      const canonicalActiveChildId = getCanonicalParentId(currentNode.activeChildId);
      const children = childrenMap.get(String(currentNode._id)) || [];
      const activeChild = children.find((c) => {
        const cId = String(c._id);
        const cCustomId = c.id ? String(c.id) : null;
        return cId === canonicalActiveChildId || cCustomId === canonicalActiveChildId || cId === String(currentNode.activeChildId);
      });
      if (!activeChild) break;

      currentNode = activeChild;
    }

    // ── Sanity guard ──────────────────────────────────────────────────────────
    // Only fall back to flat list when the tree walk yields NOTHING from a
    // non-empty collection. The old heuristic (path < half of allMessages)
    // would misfire as soon as any branch exists, since allMessages includes
    // all branch nodes — not just the active path.
    if (path.length === 0 && allMessages.length > 0) {
      logger.warn(
        `[getActiveMessagePath] Tree walk for session ${sessionId} returned 0/${allMessages.length} messages — falling back to flat list`
      );
      return allMessages;
    }

    return path;
  },

  getMessages: async (sessionId, userId) => {
    return SessionStore.getActiveMessagePath(sessionId, userId);
  },

  createEditBranch: async ({ sessionId, userId, editedMessageId, newText, file, files }) => {
    // Support both UUID strings (frontend-assigned id field) and MongoDB ObjectIds (_id)
    let editedMessage = null;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(editedMessageId) &&
      String(new mongoose.Types.ObjectId(editedMessageId)) === editedMessageId;

    if (isValidObjectId) {
      editedMessage = await Message.findOne({ _id: editedMessageId, sessionId, userId });
    }
    // Fall back to querying by the UUID id field stored in the document
    if (!editedMessage) {
      editedMessage = await Message.findOne({ id: editedMessageId, sessionId, userId });
    }
    if (!editedMessage) throw new Error("Message not found");

    const parentId = editedMessage.parentMessageId;

    // Resolve rootId — if the edited message has no rootId (legacy pre-migration
    // document) and it has a parent, walk up the ancestor chain to find the true
    // root so the new branch node carries a correct rootId pointer.
    let rootId = editedMessage.rootId;
    if (!rootId) {
      if (!parentId) {
        // This IS a root-level message; rootId will be set to newNode._id after create.
        rootId = null;
      } else {
        // Walk up to find the first ancestor with no parentMessageId (= the root).
        const findMsg = async (idVal) => {
          if (!idVal) return null;
          const idStr = String(idVal);
          const isObjId = mongoose.Types.ObjectId.isValid(idStr) &&
            String(new mongoose.Types.ObjectId(idStr)) === idStr;
          const query = isObjId
            ? { _id: idStr, sessionId, userId }
            : { id: idStr, sessionId, userId };
          return await Message.findOne(query).lean();
        };

        let ancestor = await findMsg(parentId);
        while (ancestor && ancestor.parentMessageId) {
          ancestor = await findMsg(ancestor.parentMessageId);
        }
        rootId = ancestor ? ancestor._id : parentId;
      }
    }

    // ── Idempotency guard ─────────────────────────────────────────────────────
    // If an identical sibling (same text, same parent, sender=user) was created
    // within the last 10 seconds, return it instead of creating a duplicate.
    // This is a server-side last resort — client-side guards should prevent
    // double-calls, but this ensures correctness even if they are bypassed.
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    const existingSibling = await Message.findOne({
      sessionId,
      userId,
      sender: "user",
      message: newText,
      parentMessageId: parentId ?? null,
      createdAt: { $gte: tenSecondsAgo }
    }).lean();

    if (existingSibling) {
      logger.warn(
        `[createEditBranch] Idempotency hit — returning existing sibling ${existingSibling._id} instead of creating duplicate`
      );
      // Refresh the active pointer so the existing sibling is the active branch
      if (parentId) {
        const isParentObjId = mongoose.Types.ObjectId.isValid(parentId) &&
          String(new mongoose.Types.ObjectId(parentId)) === String(parentId);
        const parentQuery = isParentObjId
          ? { _id: parentId, sessionId, userId }
          : { id: parentId, sessionId, userId };
        const parentDoc = await Message.findOne(parentQuery);
        if (parentDoc) {
          await Message.updateOne({ _id: parentDoc._id }, { activeChildId: existingSibling._id });
        }
      } else {
        await Session.findOneAndUpdate({ _id: sessionId, userId }, { activeRootId: existingSibling._id });
      }
      return existingSibling;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const formattedTime = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hourCycle: "h12" });

    const newNode = await Message.create({
      sessionId,
      userId,
      sender: "user",
      message: newText,
      time: editedMessage.time || formattedTime,
      file: file !== undefined ? file : editedMessage.file,
      files: files !== undefined ? files : editedMessage.files,
      image: editedMessage.image || undefined,
      parentMessageId: parentId,
      rootId: rootId,
      activeChildId: null,
      type: "chat"
    });

    if (!rootId && !parentId) {
      newNode.rootId = newNode._id;
      await newNode.save();
    }

    if (parentId) {
      const isParentObjectId = mongoose.Types.ObjectId.isValid(parentId) &&
        String(new mongoose.Types.ObjectId(parentId)) === String(parentId);
      const parentQuery = isParentObjectId
        ? { _id: parentId, sessionId, userId }
        : { id: parentId, sessionId, userId };
      const parentDoc = await Message.findOne(parentQuery);
      if (parentDoc) {
        await Message.updateOne({ _id: parentDoc._id }, { activeChildId: newNode._id });
      }
    } else {
      await Session.findOneAndUpdate({ _id: sessionId, userId }, { activeRootId: newNode._id });
    }

    return newNode;
  },

  switchBranch: async ({ sessionId, userId, parentMessageId, targetChildId }) => {
    if (!sessionId || !targetChildId) {
      throw new Error("Missing required fields");
    }

    const isTargetObjectId = mongoose.Types.ObjectId.isValid(targetChildId) &&
      String(new mongoose.Types.ObjectId(targetChildId)) === targetChildId;

    const childQuery = isTargetObjectId
      ? { _id: targetChildId, sessionId, userId }
      : { id: targetChildId, sessionId, userId };

    const child = await Message.findOne(childQuery);
    if (!child) throw new Error("Branch not found");

    if (parentMessageId) {
      const isParentObjectId = mongoose.Types.ObjectId.isValid(parentMessageId) &&
        String(new mongoose.Types.ObjectId(parentMessageId)) === parentMessageId;

      const parentQuery = isParentObjectId
        ? { _id: parentMessageId, sessionId, userId }
        : { id: parentMessageId, sessionId, userId };

      const parentDoc = await Message.findOne(parentQuery);
      if (parentDoc) {
        await Message.updateOne({ _id: parentDoc._id }, { activeChildId: child._id });
      }
    } else {
      await Session.findOneAndUpdate({ _id: sessionId, userId }, { activeRootId: child._id });
    }

    return SessionStore.getActiveMessagePath(sessionId, userId);
  },

  setMessages: async (sessionId, userId, messages) => {
    await Message.deleteMany({ sessionId, userId });
    if (messages.length > 0) {
      const docs = messages.map((m) => ({ ...m, sessionId, userId }));
      await Message.insertMany(docs, { ordered: false });
    }
  },

  addMessage: async (sessionId, userId, message) => {
    let parentMessageId = message.parentMessageId;
    let rootId = message.rootId;

    if (parentMessageId) {
      const isParentObjectId = mongoose.Types.ObjectId.isValid(parentMessageId) &&
        String(new mongoose.Types.ObjectId(parentMessageId)) === parentMessageId;
      if (!isParentObjectId) {
        const parentDoc = await Message.findOne({ id: parentMessageId, sessionId, userId });
        if (parentDoc) {
          parentMessageId = parentDoc._id;
          rootId = parentDoc.rootId || parentDoc._id;
        }
      }
    }

    // ── Fallback Safety Net ───────────────────────────────────────────────────
    // Primary chat flow explicitly passes parentMessageId derived from frontend state
    // to prevent client/server DB write races. This fallback is maintained for
    // backward compatibility and callers that do not supply parentMessageId.
    if (!parentMessageId) {
      const activePath = await SessionStore.getActiveMessagePath(sessionId, userId);
      if (activePath.length > 0) {
        const lastMsg = activePath[activePath.length - 1];
        parentMessageId = lastMsg._id;
        rootId = lastMsg.rootId || lastMsg._id;
      }
    }

    const doc = new Message({
      ...message,
      parentMessageId: parentMessageId || null,
      rootId: rootId || null,
      sessionId,
      userId
    });
    await doc.save();

    if (!doc.rootId && !parentMessageId) {
      doc.rootId = doc._id;
      await doc.save();
    }

    if (parentMessageId) {
      const isParentObjectId = mongoose.Types.ObjectId.isValid(parentMessageId) &&
        String(new mongoose.Types.ObjectId(parentMessageId)) === String(parentMessageId);
      const parentQuery = isParentObjectId
        ? { _id: parentMessageId, sessionId, userId }
        : { id: parentMessageId, sessionId, userId };
      const parentDoc = await Message.findOne(parentQuery);
      if (parentDoc) {
        await Message.updateOne({ _id: parentDoc._id }, { activeChildId: doc._id });
      }
    } else if (doc.sender === "user") {
      await Session.findOneAndUpdate({ _id: sessionId, userId }, { activeRootId: doc._id });
    }

    // ── Immediate Safety Disable ──────────────────────────────────────────────
    // Message-limit eviction is disabled to prevent accidental document deletion
    // during tree branching operations.
    /*
    const activePath = await SessionStore.getActiveMessagePath(sessionId, userId);
    if (activePath.length > MAX_MESSAGES_PER_SESSION) {
      const oldest = activePath[0];
      if (oldest) {
        await Message.deleteOne({ _id: oldest._id });
        logger.info(`Message limit reached for session ${sessionId}. Evicted oldest message from path.`);
      }
    }
    */
    // ─────────────────────────────────────────────────────────────────────────
    return doc;
  },

  clearMessages: async (sessionId, userId) => {
    await Message.deleteMany({ sessionId, userId });
    return true;
  },

  getLastNMessages: async (sessionId, userId, n) => {
    const limit = parseInt(n, 10) || 10;
    const historyCount = Math.max(0, limit - 1);
    const activePath = await SessionStore.getActiveMessagePath(sessionId, userId);
    return activePath.slice(-historyCount);
  },

  getTotalMessagesCount: async () => {
    return Message.countDocuments();
  }
};
