// NovaMind — backend/core/db/migrateMessageTree.js
// Migration script: converts legacy flat messages into tree-linked chains with parentMessageId, activeChildId, rootId, and activeRootId.
// Support --dry-run CLI flag: node backend/core/db/migrateMessageTree.js --dry-run

import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../../modules/sessions/Session.model.js";
import Message from "../../modules/messages/Message.model.js";

dotenv.config();

const isDryRun = process.argv.includes("--dry-run");

async function migrateTree() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/novamind";
  console.log(`[Migration] Connecting to MongoDB... (${isDryRun ? "DRY-RUN MODE" : "LIVE MODE"})`);
  
  await mongoose.connect(mongoUri);
  console.log("[Migration] Database connected.");

  try {
    const sessions = await Session.find({});
    console.log(`[Migration] Found ${sessions.length} sessions to evaluate.`);

    let totalSessionsUpdated = 0;
    let totalMessagesUpdated = 0;

    for (const session of sessions) {
      const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
      if (messages.length === 0) continue;

      let sessionModified = false;
      let prevMsg = null;
      const rootId = messages[0]._id;

      if (!session.activeRootId || String(session.activeRootId) !== String(rootId)) {
        sessionModified = true;
        if (!isDryRun) {
          await Session.findByIdAndUpdate(session._id, { activeRootId: rootId });
        }
      }

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        let msgModified = false;

        const expectedParentId = prevMsg ? prevMsg._id : null;
        const expectedRootId = rootId;

        if (String(msg.parentMessageId || "") !== String(expectedParentId || "")) {
          msg.parentMessageId = expectedParentId;
          msgModified = true;
        }

        if (String(msg.rootId || "") !== String(expectedRootId)) {
          msg.rootId = expectedRootId;
          msgModified = true;
        }

        if (prevMsg && i < messages.length) {
          if (String(prevMsg.activeChildId || "") !== String(msg._id)) {
            prevMsg.activeChildId = msg._id;
            if (!isDryRun) {
              await prevMsg.save();
            }
            totalMessagesUpdated++;
          }
        }

        if (msgModified) {
          totalMessagesUpdated++;
          if (!isDryRun) {
            await msg.save();
          }
        }

        prevMsg = msg;
      }

      if (sessionModified) {
        totalSessionsUpdated++;
      }
    }

    console.log("\n================ MIGRATION SUMMARY ================");
    console.log(`Mode: ${isDryRun ? "DRY-RUN (No DB writes performed)" : "LIVE EXECUTION"}`);
    console.log(`Total Sessions Processed/Updated: ${totalSessionsUpdated}`);
    console.log(`Total Messages Processed/Updated: ${totalMessagesUpdated}`);
    console.log("===================================================\n");

  } catch (err) {
    console.error("[Migration] Error during migration:", err);
  } finally {
    await mongoose.disconnect();
    console.log("[Migration] Disconnected from MongoDB.");
  }
}

migrateTree();
