// NovaMind — backend/tests/sessions.test.js — Phase 3
// Integration tests for session management: create, rename, list, and delete.

import "dotenv/config";

// Force test environment variables before importing app
process.env.NODE_ENV = "test";

// Dynamic imports to ensure environment variables are applied first
const { default: app } = await import("../app.js");
const { default: User } = await import("../modules/auth/User.model.js");
const { default: Session } = await import("../modules/sessions/Session.model.js");
const { default: Message } = await import("../modules/messages/Message.model.js");

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";

describe("💬 Session Management Integration Tests", () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clear test collections
    await User.deleteMany({});
    await Session.deleteMany({});
    await Message.deleteMany({});

    // Create a mock verified user
    testUser = new User({
      email:        "sessiontester@example.com",
      passwordHash: "SecurePassword123",
      name:         "Session Tester",
      isEmailVerified: true
    });
    await testUser.save();

    // Generate JWT access token
    authToken = jwt.sign(
      { userId: testUser._id.toString() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await Message.deleteMany({});
  });

  describe("POST /api/sessions", () => {
    it("should create a new session with a random UUID", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sessionId");

      // Verify Session exists in DB and default name is set
      const dbSession = await Session.findById(res.body.sessionId);

      expect(dbSession).toBeDefined();
      expect(dbSession.name).toBe("New Chat");
      expect(dbSession.userId.toString()).toBe(testUser._id.toString());
    });
  });

  describe("GET /api/sessions", () => {
    it("should retrieve a list of all active sessions for the user", async () => {
      const res = await request(app)
        .get("/api/sessions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sessions");
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions.length).toBe(1);
      expect(res.body.sessions[0].name).toBe("New Chat");
    });
  });

  describe("PUT /api/sessions/:id", () => {
    it("should rename an existing session successfully", async () => {
      const activeSessions = await Session.find({ userId: testUser._id });
      const activeSessionId = activeSessions[0]._id;

      const res = await request(app)
        .put(`/api/sessions/${activeSessionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated Chat Name" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbSession = await Session.findById(activeSessionId);
      expect(dbSession.name).toBe("Updated Chat Name");
    });
  });

  describe("DELETE /api/sessions/:id", () => {
    it("should delete the session and cascade-delete its messages", async () => {
      const activeSessions = await Session.find({ userId: testUser._id });
      const activeSessionId = activeSessions[0]._id;

      // Seed a couple mock messages for this session
      await Message.create([
        {
          sessionId: activeSessionId,
          userId:    testUser._id,
          sender:    "user",
          message:   "Hello AI",
          time:      "12:00 PM"
        },
        {
          sessionId: activeSessionId,
          userId:    testUser._id,
          sender:    "robot",
          message:   "Hello user",
          time:      "12:00 PM"
        }
      ]);

      // Confirm messages exist in DB before delete
      const preCount = await Message.countDocuments({ sessionId: activeSessionId });
      expect(preCount).toBe(2);

      const res = await request(app)
        .delete(`/api/sessions/${activeSessionId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Session deleted");

      // Verify Session has been deleted from DB
      const dbSession = await Session.findById(activeSessionId);
      expect(dbSession).toBeNull();

      // Verify all Messages under that session ID are deleted (cascade)
      const postCount = await Message.countDocuments({ sessionId: activeSessionId });
      expect(postCount).toBe(0);
    });
  });
});
