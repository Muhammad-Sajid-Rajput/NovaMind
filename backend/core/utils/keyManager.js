// NovaMind — backend/core/utils/keyManager.js
// Manages multiple Gemini API keys with round-robin rotation + per-key failover.
// Keys are read from GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3 in .env.
// Falls back gracefully to GEMINI_API_KEY if numbered keys are absent.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger.js";

// ─── Load keys from env ───────────────────────────────────────────────────────
const rawKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  // Fallback: if no numbered keys, use the single GEMINI_API_KEY
  process.env.GEMINI_API_KEY,
].filter(Boolean); // removes undefined/empty values

// Deduplicate in case someone sets both GEMINI_API_KEY and GEMINI_API_KEY_1 to the same value
const API_KEYS = [...new Set(rawKeys)];

if (API_KEYS.length === 0) {
  throw new Error(
    "[KeyManager] FATAL: No Gemini API keys found. " +
    "Set GEMINI_API_KEY_1 (and optionally _2, _3) in your .env file."
  );
}

logger.info(`[KeyManager] Loaded ${API_KEYS.length} Gemini API key(s)`);

// ─── Per-key state ────────────────────────────────────────────────────────────
const COOLDOWN_MS = 60 * 1000;          // 1 minute cooldown after repeated failures
const MAX_FAILS_BEFORE_COOLDOWN = 2;    // how many consecutive failures before cooldown

const keyState = API_KEYS.map((key, index) => ({
  index,
  key,
  client: new GoogleGenerativeAI(key),
  failCount: 0,
  cooldownUntil: null,   // timestamp (ms) when key becomes available again
  totalRequests: 0,
  totalErrors: 0,
}));

// Round-robin cursor — advances after every successful request
let currentKeyIndex = 0;

// ─── Internal: find next available key ───────────────────────────────────────
function getAvailableKey() {
  const now = Date.now();

  // Walk from currentKeyIndex, wrapping around, to find an available key
  for (let i = 0; i < keyState.length; i++) {
    const idx = (currentKeyIndex + i) % keyState.length;
    const state = keyState[idx];

    if (state.cooldownUntil && now < state.cooldownUntil) {
      continue; // still cooling down
    }

    // Cooldown expired — reset it
    if (state.cooldownUntil && now >= state.cooldownUntil) {
      logger.info(`[KeyManager] Key ${idx + 1} cooldown expired, back in rotation`);
      state.cooldownUntil = null;
      state.failCount = 0;
    }

    return state;
  }

  // All keys are in cooldown — use the one whose cooldown expires soonest
  const leastCooled = keyState.reduce((a, b) =>
    (a.cooldownUntil || 0) < (b.cooldownUntil || 0) ? a : b
  );
  logger.warn("[KeyManager] All API keys are in cooldown — using soonest-expiring key");
  return leastCooled;
}

// ─── Internal: record a key failure ──────────────────────────────────────────
function reportKeyFailure(keyIndex, error) {
  const state = keyState[keyIndex];
  state.failCount++;
  state.totalErrors++;

  const status = error?.status || error?.httpErrorCode?.status;
  const is429 = status === 429;
  const is503 = status === 503;

  if (is429 || is503 || state.failCount >= MAX_FAILS_BEFORE_COOLDOWN) {
    // 429 = rate limit hit → shorter cooldown so we recover faster
    const cooldown = is429 ? 30 * 1000 : COOLDOWN_MS;
    state.cooldownUntil = Date.now() + cooldown;
    const reason = is429 ? "429 rate limit" : is503 ? "503 overload" : "repeated failures";
    logger.warn(
      `[KeyManager] Key ${keyIndex + 1} entering cooldown for ${cooldown / 1000}s (reason: ${reason})`
    );
  }

  // Advance to the next key immediately after any failure
  currentKeyIndex = (keyIndex + 1) % keyState.length;
}

// ─── Internal: record a key success ──────────────────────────────────────────
function reportKeySuccess(keyIndex) {
  const state = keyState[keyIndex];
  state.failCount = 0;
  state.totalRequests++;
  // Advance round-robin so load is distributed evenly
  currentKeyIndex = (keyIndex + 1) % keyState.length;
}

// ─── Public: get a model instance backed by the next available key ────────────
// Returns the model + two callbacks the caller must invoke after success/failure.
export function getModelWithKey(modelName, systemInstruction) {
  const keyInfo = getAvailableKey();
  const config = { model: modelName };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  const model = keyInfo.client.getGenerativeModel(config);

  return {
    model,
    keyIndex: keyInfo.index,
    reportSuccess: () => reportKeySuccess(keyInfo.index),
    reportFailure: (err) => reportKeyFailure(keyInfo.index, err),
  };
}

// ─── Public: statistics for /api/status ──────────────────────────────────────
export function getKeyStats() {
  const now = Date.now();
  return keyState.map((s, i) => {
    const inCooldown = !!(s.cooldownUntil && now < s.cooldownUntil);
    return {
      key: `Key ${i + 1}`,
      status: inCooldown ? "cooldown" : "active",
      cooldownEndsIn: inCooldown
        ? `${Math.round((s.cooldownUntil - now) / 1000)}s`
        : null,
      totalRequests: s.totalRequests,
      totalErrors: s.totalErrors,
      failCount: s.failCount,
    };
  });
}
