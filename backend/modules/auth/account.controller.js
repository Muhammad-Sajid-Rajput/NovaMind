// NovaMind — account.controller.js — Error System
// Account management: change password, delete account (cascade).

import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { logger } from "../../core/utils/logger.js";
import User from "./User.model.js";
import Session from "../sessions/Session.model.js";
import Message from "../messages/Message.model.js";
import cloudinary from "../../core/config/cloudinary.js";
import { deleteUserVectors } from "../../core/services/pineconeService.js";
import Memory from "../memory/Memory.model.js";

// ─── PATCH /api/auth/change-password ─────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Please provide both current and new password." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different from your current password." });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ error: "Your current password is incorrect." });
  }

  // Assign plain password — pre-save hook hashes it
  user.passwordHash = newPassword;
  user.markModified("passwordHash");
  await user.save();

  // Clear the refresh cookie — user must log in again on all devices
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/api/auth/refresh",
  });

  logger.info("[ChangePassword] Password updated for user:", { userId: req.user.id });

  res.status(200).json({
    success: true,
    message: "Password updated successfully. Please sign in again.",
  });
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────
// Requires password confirmation. Cascade deletes all user data.
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const userId       = req.user.id;

  if (!password) {
    return res.status(400).json({
      error: "Please enter your password to confirm account deletion.",
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ error: "Incorrect password. Account deletion requires your current password." });
  }

  // ── Cascade delete ─────────────────────────────────────────────────────────
  // 1. Find all sessions owned by this user
  const sessions   = await Session.find({ userId }).select("_id").lean();
  const sessionIds = sessions.map((s) => s._id);

  // 2. Find and delete all Cloudinary image/file attachments for this user
  try {
    const messagesWithAttachments = await Message.find({
      sessionId: { $in: sessionIds },
      $or: [
        { "image.publicId": { $exists: true, $ne: null } },
        { "file.publicId": { $exists: true, $ne: null } }
      ]
    }).select("image.publicId file.publicId file.resourceType").lean();

    const imageIds = [];
    const rawIds = [];

    for (const m of messagesWithAttachments) {
      if (m.image?.publicId) {
        imageIds.push(m.image.publicId);
      }
      if (m.file?.publicId) {
        if (m.file.resourceType === 'raw') {
          rawIds.push(m.file.publicId);
        } else {
          imageIds.push(m.file.publicId);
        }
      }
    }

    if (imageIds.length > 0) {
      logger.info(`[DeleteAccount] Deleting ${imageIds.length} Cloudinary image assets for user: ${userId}`);
      await cloudinary.api.delete_resources(imageIds, { resource_type: 'image' });
    }
    if (rawIds.length > 0) {
      logger.info(`[DeleteAccount] Deleting ${rawIds.length} Cloudinary raw assets for user: ${userId}`);
      await cloudinary.api.delete_resources(rawIds, { resource_type: 'raw' });
    }
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete Cloudinary assets for user:", {
      userId,
      error: err.message
    });
  }

  // 3. Delete all messages from those sessions
  if (sessionIds.length > 0) {
    await Message.deleteMany({ sessionId: { $in: sessionIds } });
  }

  // 4. Delete all sessions
  await Session.deleteMany({ userId });

  // 4b. Delete all User Memories from MongoDB
  try {
    await Memory.deleteMany({ userId });
    logger.info(`[DeleteAccount] Deleted all user memories for user: ${userId}`);
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete memories for user:", {
      userId,
      error: err.message
    });
  }

  // 5. Delete all vectors from Pinecone
  try {
    await deleteUserVectors(userId.toString());
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete Pinecone vectors for user:", {
      userId,
      error: err.message
    });
  }

  // 6. Delete the user document itself
  await User.findByIdAndDelete(userId);

  // 5. Clear auth cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    path:     "/api/auth/refresh",
  });

  logger.info("[DeleteAccount] Account and all data deleted for user:", { userId });

  res.status(200).json({
    success: true,
    message: "Your account and all associated data have been permanently deleted.",
  });
});

// PATCH /api/auth/profile
// Updates the user's name
export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Name is required." });
  }
  if (name.length > 80) {
    return res.status(400).json({ error: "Name must be at most 80 characters." });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.name = name.trim();
  await user.save();

  logger.info("[UpdateProfile] Profile updated for user:", { userId: req.user.id, name: user.name });

  res.status(200).json({
    success: true,
    user,
  });
});
