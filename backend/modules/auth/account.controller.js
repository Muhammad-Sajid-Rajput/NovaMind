// NovaMind — account.controller.js
// Account management: change password, delete account (cascade).

import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { logger }       from "../../core/utils/logger.js";
import User             from "./User.model.js";
import Session          from "../sessions/Session.model.js";
import Message          from "../messages/Message.model.js";
import Memory           from "../memory/Memory.model.js";
import { deleteUserVectors }                            from "../../core/services/pineconeService.js";
import { clearRefreshCookie }                           from "./cookieHelper.js";
import { deleteAllUserDocuments, deleteCloudinaryAssetsForMessages } from "../upload/cleanupHelper.js";

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
  clearRefreshCookie(res);

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

  // ── 1. Find all sessions owned by this user ─────────────────────────────────
  const sessions   = await Session.find({ userId }).select("_id").lean();
  const sessionIds = sessions.map((s) => s._id);

  // ── 2. Delete Cloudinary image/file attachments from messages ───────────────
  try {
    const messagesWithAttachments = await Message.find({
      sessionId: { $in: sessionIds },
      $or: [
        { "image.publicId": { $exists: true, $ne: null } },
        { "file.publicId":  { $exists: true, $ne: null } },
      ],
    }).select("image.publicId file.publicId file.resourceType").lean();

    await deleteCloudinaryAssetsForMessages(messagesWithAttachments);
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete Cloudinary message assets:", { userId, error: err.message });
  }

  // ── 3. Delete all messages from those sessions ──────────────────────────────
  if (sessionIds.length > 0) {
    await Message.deleteMany({ sessionId: { $in: sessionIds } });
  }

  // ── 4. Delete all sessions ──────────────────────────────────────────────────
  await Session.deleteMany({ userId });

  // ── 5. Delete all user memories from MongoDB ────────────────────────────────
  try {
    await Memory.deleteMany({ userId });
    logger.info(`[DeleteAccount] Deleted all user memories for user: ${userId}`);
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete memories:", { userId, error: err.message });
  }

  // ── 6. Delete all uploaded documents (Cloudinary + chunks + manifests + registry) ─
  await deleteAllUserDocuments(userId);

  // ── 7. Delete all Pinecone vectors ──────────────────────────────────────────
  try {
    await deleteUserVectors(userId.toString());
  } catch (err) {
    logger.error("[DeleteAccount] Failed to delete Pinecone vectors:", { userId, error: err.message });
  }

  // ── 8. Delete the user document itself ──────────────────────────────────────
  await User.findByIdAndDelete(userId);

  clearRefreshCookie(res);

  logger.info("[DeleteAccount] Account and all data deleted for user:", { userId });

  res.status(200).json({
    success: true,
    message: "Your account and all associated data have been permanently deleted.",
  });
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
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

  logger.info("[UpdateProfile] Profile updated:", { userId: req.user.id, name: user.name });

  res.status(200).json({ success: true, user });
});
