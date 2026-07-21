// NovaMind — repairSessionRoots.js
// Fixes session activeRootId pointers so they always point to the first user prompt (root user message).

import mongoose from "mongoose";
import dotenv from "dotenv";
import Session from "../../modules/sessions/Session.model.js";
import Message from "../../modules/messages/Message.model.js";

dotenv.config();

async function repair() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/novamind";
  console.log("[Repair] Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("[Repair] Connected.");

  const sessions = await Session.find({});
  let repairedCount = 0;

  for (const session of sessions) {
    const rootUserMsg = await Message.findOne({
      sessionId: session._id,
      sender: "user",
      parentMessageId: null
    }).sort({ createdAt: 1 });

    if (rootUserMsg) {
      if (!session.activeRootId || String(session.activeRootId) !== String(rootUserMsg._id)) {
        console.log(`[Repair] Fixing session ${session._id} (${session.name}): activeRootId was ${session.activeRootId} -> now ${rootUserMsg._id}`);
        await Session.findByIdAndUpdate(session._id, { activeRootId: rootUserMsg._id });
        repairedCount++;
      }
    }
  }

  console.log(`[Repair] Completed. Fixed ${repairedCount} sessions.`);
  await mongoose.disconnect();
}

repair().catch(console.error);
