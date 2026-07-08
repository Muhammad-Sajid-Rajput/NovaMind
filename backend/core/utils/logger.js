// NovaMind — backend/utils/logger.js — Production Build

import winston from "winston";

const { combine, timestamp, json, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction
    ? combine(timestamp(), json())              // structured JSON for cloud log aggregators
    : combine(colorize(), simple()),            // human-readable for local dev
  transports: [
    new winston.transports.Console()
  ]
});
