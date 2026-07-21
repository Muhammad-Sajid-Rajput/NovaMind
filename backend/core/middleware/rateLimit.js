// NovaMind — backend/core/middleware/rateLimit.js — Phase 1
// Per-route rate limiters with tuned limits for each endpoint sensitivity level.

import rateLimit from "express-rate-limit";

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
    legacyHeaders:   false,
    skip:            () => process.env.NODE_ENV !== "production", // Bypass rate limits in development and test environments
    handler: (req, res) => {
      res.status(429).json({
        error:      message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });

// ─── Auth Routes — strict (prevent brute force on login/register) ─────────────
// 5 attempts per 15 minutes per IP
export const authLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  "Too many attempts. Please wait 15 minutes before trying again."
);

// ─── OTP Resend — very strict (prevent email flooding) ────────────────────────
// 3 resend requests per hour per IP
export const otpLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  "Too many OTP requests. Please wait 1 hour before requesting a new code."
);

// ─── Chat Routes — moderate (normal usage allowance) ─────────────────────────
// 30 messages per minute per IP
export const chatLimiter = createLimiter(
  60 * 1000,
  30,
  "Too many messages. Please slow down."
);

// ─── General API — fallback catch-all ────────────────────────────────────────
// 100 requests per 15 minutes per IP (applied globally in app.js)
export const generalLimiter = createLimiter(
  15 * 60 * 1000,
  100,
  "Too many requests from this IP. Please try again later."
);
