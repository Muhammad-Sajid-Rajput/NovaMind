// NovaMind — auth.controller.js — Error System
// Dual-token auth: accessToken (15min) in response body, refreshToken (30d) in httpOnly cookie.

import jwt from "jsonwebtoken";
import User from "./User.model.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../core/services/emailService.js";
import { logger } from "../../core/utils/logger.js";

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (userId) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });

// Cookie is scoped to /api/auth/refresh so it is ONLY sent to that one endpoint.
const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path:     "/api/auth/refresh",       // scoped path — cookie not sent on other routes
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/api/auth/refresh",
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing && existing.isEmailVerified) {
    return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
  }

  // Reuse pending (unverified) account, or create new one
  let user = existing;
  if (!user) {
    user = new User({
      email:        normalizedEmail,
      passwordHash: password,
      name:         name?.trim() || "",
    });
  } else {
    user.passwordHash = password;
    user.name         = name?.trim() || user.name;
    user.markModified("passwordHash");
  }

  const otp = await user.generateOtp();
  await user.save();

  try {
    await sendVerificationEmail(normalizedEmail, user.name, otp);
  } catch (emailErr) {
    logger.error("[Register] Failed to send verification email:", { error: emailErr.message });
    return res.status(500).json({ error: "Failed to send OTP email. Please check your email address and try again." });
  }

  res.status(201).json({
    success: true,
    message: "Account created. Please check your email for a 6-digit verification code.",
    email:   normalizedEmail,
  });
});

// ─── POST /api/auth/verify-email ─────────────────────────────────────────────
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ error: "No account found with this email. Please register first." });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ error: "This account is already verified. Please log in." });
  }

  if (!user.emailOtp || !user.emailOtpExpiry) {
    return res.status(400).json({ error: "Incorrect OTP. Please check your email and try again." });
  }

  if (new Date() > user.emailOtpExpiry) {
    return res.status(400).json({ error: "This OTP has expired. Please request a new one." });
  }

  const isValid = await user.verifyOtp(code.trim());
  if (!isValid) {
    return res.status(400).json({ error: "Incorrect OTP. Please check your email and try again." });
  }

  user.isEmailVerified  = true;
  user.emailOtp         = null;
  user.emailOtpExpiry   = null;
  await user.save();

  res.status(200).json({
    success:     true,
    message:     "Email verified successfully. Please log in to your account.",
  });
});

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ error: "No account found with this email." });
  }
  if (user.isEmailVerified) {
    return res.status(400).json({ error: "This account is already verified. You can log in directly." });
  }

  const otp = await user.generateOtp();
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.name, otp);
  } catch (emailErr) {
    logger.error("[ResendOTP] Failed to send email:", { error: emailErr.message });
    return res.status(500).json({ error: "Failed to send OTP email. Please check your email address and try again." });
  }

  res.status(200).json({ success: true, message: "A new verification code has been sent to your email." });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: "No account found with this email. Please register first." });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: "Incorrect password. Please try again." });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({
      error:                "Please verify your email first. Check your inbox for the OTP we sent.",
      requiresVerification: true,
      email:                user.email,
    });
  }

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success:     true,
    accessToken,
    user:        user.toJSON(),
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    clearRefreshCookie(res);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }

  const newAccessToken = generateAccessToken(user._id);

  res.status(200).json({
    success:     true,
    accessToken: newAccessToken,
    user:        user.toJSON(),
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  clearRefreshCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully." });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "No account found with this email. Please register first." });
  }
  res.status(200).json({ success: true, user: user.toJSON() });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Please enter your email." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Always return 200 to prevent email enumeration
  if (!user) {
    return res.status(200).json({ message: "If that email exists, we have sent a 6-digit reset code." });
  }

  const otp = await user.generateResetOtp();
  await user.save();

  try {
    await sendPasswordResetEmail(normalizedEmail, user.name, otp);
  } catch (emailErr) {
    logger.error("[ForgotPassword] Failed to send password reset email:", { error: emailErr.message });
  }

  res.status(200).json({
    success: true,
    message: "If that email exists, we have sent a 6-digit reset code.",
    email:   normalizedEmail,
  });
});

// ─── POST /api/auth/verify-reset-code ────────────────────────────────────────
export const verifyResetCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ error: "No account found with this email. Please register first." });
  }

  if (!user.resetOtp || !user.resetOtpExpiry) {
    return res.status(400).json({ error: "Incorrect OTP. Please check your email and try again." });
  }

  if (new Date() > user.resetOtpExpiry) {
    return res.status(400).json({ error: "This OTP has expired. Please request a new one." });
  }

  const isValid = await user.verifyResetOtp(code.trim());
  if (!isValid) {
    return res.status(400).json({ error: "Incorrect OTP. Please check your email and try again." });
  }

  res.status(200).json({ success: true, message: "Code verified successfully." });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ error: "No account found with this email. Please register first." });
  }

  const isValid = await user.verifyResetOtp(code.trim());
  if (!isValid) {
    return res.status(400).json({ error: "Incorrect OTP. Please check your email and try again." });
  }

  user.passwordHash = newPassword;
  user.markModified("passwordHash");
  user.resetOtp       = null;
  user.resetOtpExpiry = null;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully. Please sign in with your new password." });
});
