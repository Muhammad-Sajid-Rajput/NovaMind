import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("❌  MONGODB_URI is not set in environment variables.");
    process.exit(1);
  }

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info("✅  MongoDB connected successfully.");
      return;
    } catch (err) {
      attempt++;
      logger.warn(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      } else {
        logger.error("❌  All MongoDB connection attempts failed. Shutting down.");
        process.exit(1);
      }
    }
  }
}
