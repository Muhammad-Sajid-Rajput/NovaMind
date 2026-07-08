// NovaMind — backend/controllers/utilController.js

import generateUniqueKey from "../../core/utils/password.js";
import { SessionStore } from "../sessions/sessionStore.repository.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { ALLOWED_MODELS } from "../chat/utils/modelFallback.js";
import { getKeyStats } from "../../core/utils/keyManager.js";

export const generatePassword = asyncHandler(async (req, res) => {
  const { length } = req.body || {};
  const password = generateUniqueKey(length);
  res.json({ password });
});

export const getStatus = asyncHandler(async (req, res) => {
  const activeSessionsCount = SessionStore.getSessionCount();
  const totalMessagesCount = SessionStore.getTotalMessagesCount();

  res.json({
    status: "healthy",
    uptime: `${Math.floor(process.uptime())}s`,
    memoryUsage: process.memoryUsage(),
    activeSessionsCount,
    totalMessagesCount,
    environment: process.env.NODE_ENV || "production",
    modelsConfigured: ALLOWED_MODELS,
    apiKeys: getKeyStats(),
    cpuUsage: process.cpuUsage()
  });
});
