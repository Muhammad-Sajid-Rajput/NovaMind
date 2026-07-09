// NovaMind — backend/app.js — Phase 5
// Express app configuration: middleware, CORS, routes, error handling.
// Kept separate from server.js so tests can import app without starting the server.

import express      from "express";
import cors         from "cors";
import morgan       from "morgan";
import helmet       from "helmet";
import compression  from "compression";
import cookieParser from "cookie-parser";

import apiRouter              from "./routes/index.js";
import { globalErrorHandler } from "./core/middleware/errorHandler.js";
import { generalLimiter }     from "./core/middleware/rateLimit.js";
import { logger }             from "./core/utils/logger.js";
import { metricsMiddleware }  from "./core/middleware/metricsMiddleware.js";
import { register }           from "./core/config/metrics.js";

const app = express();

// ─── Trust Proxy (required for rate-limiter to read real client IP) ───────────
app.set("trust proxy", 1);

// ─── Security Headers (helmet with production-grade CSP) ──────────────────────
const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],   // unsafe-inline needed for Vite HMR in dev
        styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc:     ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        imgSrc:      ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc:  [
          "'self'",
          "https://generativelanguage.googleapis.com",
          "https://api.resend.com",
          ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
        ],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: isDev ? null : [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some Gemini inline responses
  })
);

// ─── Gzip Compression (skip for SSE streams) ─────────────────────────────────
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers.accept === "text/event-stream") return false;
      return compression.filter(req, res);
    },
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || "http://localhost:5173",
  "http://localhost:4173", // Vite preview
];

app.use(
  cors({
    origin:      (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl) in dev
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods:     ["GET", "POST", "DELETE", "PUT", "PATCH"],
    credentials: true, // Required for httpOnly cookies
  })
);

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Request Logging & Body Parsing ──────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "2mb" }));

// ─── Prometheus Metrics Middleware (Phase 5) ──────────────────────────────────
// Records every HTTP request's method, route, status code, and duration.
app.use(metricsMiddleware);

// ─── Secure /metrics Endpoint (Phase 5) ──────────────────────────────────────
// Protected by X-Metrics-Secret header — never expose publicly without this auth.
app.get("/metrics", async (req, res) => {
  const secret = req.headers["x-metrics-secret"];

  if (!secret || secret !== process.env.METRICS_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error("Failed to scrape Prometheus metrics", { error: err.message });
    res.status(500).end(err.message);
  }
});

// ─── General Rate Limit (catch-all safety net) ────────────────────────────────
app.use("/api", generalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
