// NovaMind — backend/core/db/seed.js — Phase 3
// Seed script to populate development database with mock data.
// Run: npm run db:seed

import "dotenv/config";
import mongoose from "mongoose";
import User     from "../../modules/auth/User.model.js";
import Session  from "../../modules/sessions/Session.model.js";
import Message  from "../../modules/messages/Message.model.js";
import { logger } from "../utils/logger.js";
import crypto from "crypto";

const MOCK_PASSWORD = "Password123";

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("❌ MONGODB_URI is missing from environment. Cannot seed.");
    process.exit(1);
  }

  logger.info(`🌱 Connecting to MongoDB: ${uri.split("@").pop()}`);
  await mongoose.connect(uri);

  try {
    // 1. Wipe collections
    logger.info("🗑️ Cleaning up existing collections (Users, Sessions, Messages)...");
    await User.deleteMany({});
    await Session.deleteMany({});
    await Message.deleteMany({});

    // 2. Create users
    logger.info("👥 Seeding mock users...");
    
    // Verified user (Password123)
    const verifiedUser = new User({
      email:           "verified@novamind.com",
      passwordHash:    MOCK_PASSWORD,
      name:            "Verified NovaMind User",
      isEmailVerified: true
    });
    await verifiedUser.save();

    // Unverified user (Password123)
    const unverifiedUser = new User({
      email:           "unverified@novamind.com",
      passwordHash:    MOCK_PASSWORD,
      name:            "Unverified User",
      isEmailVerified: false
    });
    await unverifiedUser.save();

    // 3. Create mock chat sessions for the verified user
    logger.info("💬 Seeding chat sessions and message history...");

    const sessionsData = [
      {
        id: crypto.randomUUID(),
        name: "JavaScript Basics",
        messages: [
          { sender: "user", message: "Hi! Can you explain what closures are in JavaScript?", time: "10:00 AM" },
          { sender: "robot", message: "Hello! A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer function's scope even after the outer function has finished executing.", time: "10:01 AM", model: "gemini-2.5-flash" },
          { sender: "user", message: "Can you give me a simple code example?", time: "10:02 AM" },
          { sender: "robot", message: "Certainly! Here is a simple closure:\n\n```js\nfunction createCounter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\nconst counter = createCounter();\nconsole.log(counter()); // 1\nconsole.log(counter()); // 2\n```\nHere, the inner function has access to the `count` variable, which lives in the outer function's scope.", time: "10:03 AM", model: "gemini-2.5-flash" }
        ]
      },
      {
        id: crypto.randomUUID(),
        name: "Travel Planning",
        messages: [
          { sender: "user", message: "What are the best months to visit Japan for cherry blossoms?", time: "11:30 AM" },
          { sender: "robot", message: "The best months to visit Japan for cherry blossoms (sakura) are generally late March and early April. Peak bloom times vary slightly depending on the region (earlier in the south like Fukuoka, later in the north like Hokkaido), but visiting Tokyo or Kyoto between March 25 and April 5 usually guarantees beautiful cherry blossom views!", time: "11:31 AM", model: "gemini-2.5-flash" }
        ]
      }
    ];

    for (const s of sessionsData) {
      // Create session
      const sessionDoc = new Session({
        _id:    s.id,
        userId: verifiedUser._id,
        name:   s.name
      });
      await sessionDoc.save();

      // Create messages
      for (const m of s.messages) {
        const messageDoc = new Message({
          sessionId: s.id,
          userId:    verifiedUser._id,
          sender:    m.sender,
          message:   m.message,
          time:      m.time,
          model:     m.model || null
        });
        await messageDoc.save();
      }
    }

    logger.info("🎉 Database seeded successfully!");
    logger.info("--------------------------------------------------");
    logger.info(`📧 User: verified@novamind.com`);
    logger.info(`🔑 Password: ${MOCK_PASSWORD}`);
    logger.info("--------------------------------------------------");
  } catch (error) {
    logger.error("❌ Seeding failed with error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seedDatabase();
