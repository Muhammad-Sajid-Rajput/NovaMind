// NovaMind — errorHandler.js — Error System

import { logger } from "../utils/logger.js";

export const globalErrorHandler = (err, req, res, next) => {
  logger.error("[Server Error]", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: `Validation Error: ${messages.join(', ')}` });
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    return res.status(409).json({ 
      error: field.includes('email') 
        ? "An account with this email already exists. Please log in instead."
        : `Duplicate value entered for ${field} field.`
    });
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: "Your session has expired. Please log in again." });
  }

  // JWT Invalid Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }

  // Rate Limiting Error
  if (err.status === 429) {
    return res.status(429).json({ 
      error: "Too many messages. Please wait.",
      retryAfter: err.retryAfter || 60
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "An unexpected error occurred. Please try again.",
    details: process.env.NODE_ENV === "development" ? err.message : undefined
  });
};
