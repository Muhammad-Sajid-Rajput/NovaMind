// NovaMind — modelFallback.js — Phase 5
// Model fallback chain with MongoDB-backed TTL cooldowns.
// Cooldowns now survive server restarts and are shared across instances.
// All existing exports are preserved for backward compatibility.

import { logger }        from "../../../core/utils/logger.js";
import ModelCooldown     from "../../models/ModelCooldown.model.js";

export const ALLOWED_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3-flash",
  "gemini-2.5-flash",
];

// Telemetry tracker (in-memory — for the current process lifetime only)
const telemetry = {};
for (const m of ALLOWED_MODELS) {
  telemetry[m] = {
    attempts:               0,
    successes:              0,
    failures:               0,
    fallbacksTriggeredFrom: 0,
  };
}

let totalRequests   = 0;
let fallbackRequests = 0;

export const getCooldownStatus = async () => {
  try {
    const records = await ModelCooldown.find({
      expiresAt: { $gt: new Date() },
    }).lean();
    const status = {};
    records.forEach((r) => {
      status[r.modelName] = r.expiresAt.getTime();
    });
    return status;
  } catch {
    return {};
  }
};

export const getTelemetryStatus = () => ({
  telemetry,
  totalRequests,
  fallbackRequests,
});

// ── Cooldown helpers (MongoDB-backed) ──────────────────────────────────────────
const isModelCooled = async (modelName) => {
  try {
    const record = await ModelCooldown.findOne({ modelName }).lean();
    if (!record) return false;
    return record.expiresAt > new Date();
  } catch {
    return false; // fail open — prefer availability over strict cooldown
  }
};

const setCooldown = async (modelName, errorStatus) => {
  try {
    const cooldownMs = errorStatus === 429 ? 30_000 : 60_000;
    const expiresAt  = new Date(Date.now() + cooldownMs);

    await ModelCooldown.findOneAndUpdate(
      { modelName },
      {
        $set: { expiresAt, reason: String(errorStatus ?? "unknown") },
        $inc: { failCount: 1 },
      },
      { upsert: true, returnDocument: "after" }
    );

    logger.warn("Model cooldown set (MongoDB)", {
      modelName,
      cooldownMs,
      reason: errorStatus,
    });
  } catch (err) {
    logger.error("Failed to write model cooldown to MongoDB", {
      error: err.message,
    });
  }
};

// ── withRetry — unchanged from Phase 4 ────────────────────────────────────────
export const withRetry = async (fn, retries = 2, delayMs = 200) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status      = err.status || (err.response && err.response.status);
      const code        = err.code;
      const isRetryable = [500, 502, 503, 504, 429].includes(status) ||
                          ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code);
      const isLast      = attempt === retries - 1;

      if (isRetryable && !isLast) {
        const wait = status === 429 ? Math.max(100, delayMs / 2) : delayMs;
        logger.warn(
          `[Retry] Attempt ${attempt + 1}/${retries} failed (${status || code}). Retrying in ${wait}ms...`
        );
        await new Promise((r) => setTimeout(r, wait));
        delayMs *= 1.5;
        continue;
      }
      throw err;
    }
  }
};

// ── withFallback — MongoDB cooldown checks ─────────────────────────────────────
export const withFallback = async (fn, preferredModel) => {
  const modelToUse = preferredModel || ALLOWED_MODELS[0];
  const chain = [
    modelToUse,
    ...ALLOWED_MODELS.filter((m) => m !== modelToUse),
  ];

  // Check which models are NOT in cooldown
  const cooledChecks = await Promise.all(
    chain.map((name) => isModelCooled(name))
  );
  const activeModels = chain.filter((_, i) => !cooledChecks[i]);
  const ignoreCooldown = activeModels.length === 0;

  totalRequests++;

  for (let i = 0; i < chain.length; i++) {
    const name = chain[i];

    if (!ignoreCooldown && cooledChecks[i]) {
      logger.warn(`Model ${name} is in cooldown (MongoDB), skipping`);
      continue;
    }

    if (!telemetry[name]) {
      telemetry[name] = {
        attempts: 0, successes: 0, failures: 0, fallbacksTriggeredFrom: 0,
      };
    }

    telemetry[name].attempts++;

    try {
      const result = await withRetry(() => fn(name), 2, 200);
      telemetry[name].successes++;

      if (name !== modelToUse) fallbackRequests++;

      return { result, modelUsed: name };
    } catch (err) {
      telemetry[name].failures++;

      const status = err.status || (err.response && err.response.status);
      const isRequest400 = status >= 400 && status < 500 && status !== 429;

      if (!isRequest400) {
        await setCooldown(name, status);
      }

      const isLastModel = i === chain.length - 1;
      if (!isLastModel) {
        telemetry[name].fallbacksTriggeredFrom++;
        const next = chain[i + 1];
        logger.warn({
          event:       "MODEL_FALLBACK_TRIGGERED",
          message:     `Model ${name} failed. Attempting failover to ${next}.`,
          failedModel: name,
          nextModel:   next,
          error:       err.message,
          status:      status || "unknown",
        });
        continue;
      }
      throw err;
    }
  }
  throw new Error("All models currently unavailable.");
};
