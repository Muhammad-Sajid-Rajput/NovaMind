// NovaMind — backend/core/middleware/rateLimit.js — Phase 1
// Per-route rate limiters with tuned limits for each endpoint sensitivity level.

import rateLimit from "express-rate-limit";

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders:   false,
    skip: (req) => {
      // Bypass rate limits in non-production environments or for localhost
      if (process.env.NODE_ENV !== "production") return true;
      const ip = req.ip || req.socket?.remoteAddress || "";
      if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.includes("127.0.0.1")) {
        return true;
      }
      return false;
    },
    handler: (req, res) => {
      res.status(429).json({
        error:      message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });

// ─── Auth Routes — strict (prevent brute force on login/register) ─────────────
// 15 attempts per 15 minutes per IP
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  15,
  "Too many attempts. Please wait 15 minutes before trying again."
);

// ─── OTP Resend — very strict (prevent email flooding) ────────────────────────
// 10 resend requests per hour per IP
export const otpLimiter = createLimiter(
  60 * 60 * 1000,
  10,
  "Too many OTP requests. Please wait 1 hour before requesting a new code."
);

// ─── Chat Routes — moderate (normal usage allowance) ─────────────────────────
// 60 messages per minute per IP
export const chatLimiter = createLimiter(
  60 * 1000,
  60,
  "Too many messages. Please slow down."
);

// ─── General API — fallback catch-all ────────────────────────────────────────
// 1000 requests per 15 minutes per IP (applied globally in app.js)
export const generalLimiter = createLimiter(
  15 * 60 * 1000,
  1000,
  "Too many requests from this IP. Please try again later."
);
