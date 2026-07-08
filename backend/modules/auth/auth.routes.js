// NovaMind — backend/modules/auth/auth.routes.js — Phase 1
// Route-specific rate limiters applied to every sensitive endpoint.

import { Router } from "express";
import {
  register,
  login,
  getMe,
  verifyEmail,
  resendOtp,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  refreshToken,
  logout,
} from "./auth.controller.js";
import { changePassword, deleteAccount, updateProfile } from "./account.controller.js";
import { requireAuth } from "../../core/middleware/auth.js";
import { authLimiter, otpLimiter } from "../../core/middleware/rateLimit.js";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post("/register",          authLimiter, register);
router.post("/login",             authLimiter, login);
router.post("/verify-email",      verifyEmail);
router.post("/resend-otp",        otpLimiter,  resendOtp);
router.post("/forgot-password",   authLimiter, forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password",    resetPassword);

// ─── Refresh (reads httpOnly cookie — no auth middleware needed) ───────────────
router.post("/refresh", refreshToken);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.get("/me",                requireAuth, getMe);
router.post("/logout",           requireAuth, logout);
router.patch("/profile",         requireAuth, updateProfile);
router.patch("/change-password", requireAuth, changePassword);
router.delete("/account",        requireAuth, deleteAccount);

export default router;
