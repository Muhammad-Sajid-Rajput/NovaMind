// NovaMind — backend/tests/auth.test.js — Phase 3
// Integration tests for user registration, verification, login, refresh, and logout.

import "dotenv/config";

// Force test environment variables before importing app
process.env.NODE_ENV = "test";
process.env.RESEND_API_KEY = "your_resend_api_key";

// Dynamic imports to ensure environment variables are applied first
const { default: app } = await import("../app.js");
const { default: User } = await import("../modules/auth/User.model.js");
const { logger } = await import("../core/utils/logger.js");

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";

describe("🔒 Authentication Integration Tests", () => {
  let verificationCode = "";

  // Spy on the logger to intercept the developer fallback OTP output
  const loggerSpy = jest.spyOn(logger, "info").mockImplementation((msg) => {
    if (typeof msg === "string" && msg.includes("[DEV FALLBACK] Verification OTP")) {
      const match = msg.match(/: (\d{6})/);
      if (match) {
        verificationCode = match[1];
      }
    }
  });

  beforeAll(async () => {
    // Clean database before starting
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean database
    await User.deleteMany({});
  });

  describe("POST /api/auth/register", () => {
    it("should register a new unverified user and log OTP", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email:    "testuser@example.com",
          password: "SecurePassword123",
          name:     "Test User",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("message");
      expect(res.body.email).toBe("testuser@example.com");

      // Verify the user exists in database but is unverified
      const dbUser = await User.findOne({ email: "testuser@example.com" });
      expect(dbUser).toBeDefined();
      expect(dbUser.isEmailVerified).toBe(false);

      // Verify OTP was logged and intercepted
      expect(verificationCode).toMatch(/^\d{6}$/);
    });

    it("should reject duplicate email registration for verified accounts", async () => {
      // Manually verify user for the sake of this test
      await User.updateOne({ email: "testuser@example.com" }, { isEmailVerified: true });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email:    "testuser@example.com",
          password: "DifferentPassword123",
          name:     "Test User",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("already exists");
    });
  });

  describe("POST /api/auth/verify-email", () => {
    beforeEach(async () => {
      // Reset unverified state for clean check
      await User.deleteMany({});
      verificationCode = "";
      
      // Register again to generate a new OTP
      await request(app)
        .post("/api/auth/register")
        .send({
          email:    "verify@example.com",
          password: "SecurePassword123",
          name:     "Verify User",
        });
    });

    it("should verify the user and return a JWT access token", async () => {
      expect(verificationCode).not.toBe("");

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({
          email: "verify@example.com",
          code:  verificationCode,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body.user.email).toBe("verify@example.com");

      // Verify cookie is set with refreshToken
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("refreshToken");

      // Check database status
      const dbUser = await User.findOne({ email: "verify@example.com" });
      expect(dbUser.isEmailVerified).toBe(true);
    });

    it("should reject incorrect verification code", async () => {
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({
          email: "verify@example.com",
          code:  "999999", // wrong OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid or expired");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeAll(async () => {
      await User.deleteMany({});
      // Register & verify a user
      await request(app)
        .post("/api/auth/register")
        .send({
          email:    "login@example.com",
          password: "LoginPassword123",
          name:     "Login User",
        });
      await User.updateOne({ email: "login@example.com" }, { isEmailVerified: true });
    });

    it("should log in successfully with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email:    "login@example.com",
          password: "LoginPassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.headers["set-cookie"][0]).toContain("refreshToken");
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email:    "login@example.com",
          password: "WrongPassword123",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Invalid email or password");
    });
  });
});
