// NovaMind — backend/server.js — Phase 1
// Entry point: validates env vars, connects to MongoDB, starts HTTP listener.
// Express app configuration lives in app.js.

import "dotenv/config";
import { validateEnv }  from "./core/utils/validateEnv.js";
import app              from "./app.js";
import { connectDB }    from "./core/db/connect.js";
import { logger }       from "./core/utils/logger.js";
import { startIngestWorker } from "./modules/upload/queues/ingestWorker.js";

// ─── Validate ALL environment variables FIRST ─────────────────────────────────
// Crashes immediately with clear error messages if anything is missing or wrong.
validateEnv();

const PORT = process.env.PORT || 5000;

// ─── Start Server ─────────────────────────────────────────────────────────────
async function startServer() {
  await connectDB();
  
  // Start background queue processing worker
  startIngestWorker();
  logger.info("Background worker started");

  const server = app.listen(PORT, () => {
    logger.info("🚀 NovaMind API started");
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Listening on port: ${PORT}`);
    logger.info("API Base Path: /api");
    logger.info("Health Endpoint: /health");
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
    // Force exit after 5s if connections don't drain
    setTimeout(() => {
      logger.error("Could not close connections in time — forcefully shutting down.");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", { reason: String(reason) });
  });
}

startServer();
