// NovaMind — validateEnv.js — Phase 5
// Validates all required environment variables at server startup.
// Import this as the FIRST thing in server.js — crashes immediately if anything is wrong.

import { z } from "zod";

const envSchema = z.object({
  // ─── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT:     z.string().default("5000"),

  // ─── Database ──────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(10, "MONGODB_URI is required"),

  // ─── JWT (dual-token) ──────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:  z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),

  // ─── Gemini AI ────────────────────────────────────────────────────────────
  // At least one key required; _2 and _3 are optional
  GEMINI_API_KEY_1: z.string().min(1, "GEMINI_API_KEY_1 is required"),
  GEMINI_API_KEY_2: z.string().min(1).optional(),
  GEMINI_API_KEY_3: z.string().min(1).optional(),
  // Legacy fallback key — used by keyManager if numbered keys are absent
  GEMINI_API_KEY:   z.string().min(1).optional(),

  // ─── Resend Email ─────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM:    z.string().min(1, "RESEND_FROM is required"),

  // ─── CORS ─────────────────────────────────────────────────────────────────
  ALLOWED_ORIGIN: z.string().url("ALLOWED_ORIGIN must be a valid URL").optional(),

  // ─── Cloudinary (Phase 3) ──────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY:    z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // ─── Redis (Phase 4) ────────────────────────────────────────────────────────
  REDIS_HOST:            z.string().default("127.0.0.1"),
  REDIS_PORT:            z.string().default("6379"),
  REDIS_URL:             z.string().min(1, "REDIS_URL must be a valid connection string").optional(),

  // ─── Pinecone Vector DB (Phase 4) ──────────────────────────────────────────
  PINECONE_API_KEY:      z.string().min(1, "PINECONE_API_KEY is required"),
  PINECONE_INDEX:        z.string().min(1, "PINECONE_INDEX is required"),

  // ─── Tavily Web Search (Phase 4) ───────────────────────────────────────────
  TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),

  // ─── Observability (Phase 5) ───────────────────────────────────────────────
  // Optional — if not provided, /metrics returns 403 for all requests.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  METRICS_SECRET: z.string().min(8).optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n❌  Invalid environment variables — server cannot start:\n");
    result.error.issues.forEach((issue) => {
      console.error(`    ${issue.path.join(".")} — ${issue.message}`);
    });
    console.error(
      "\n💡  Copy backend/.env.example to backend/.env and fill in the required values.\n"
    );
    process.exit(1);
  }

  return result.data;
}
