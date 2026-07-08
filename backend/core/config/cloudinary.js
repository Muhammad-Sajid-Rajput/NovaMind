// NovaMind — backend/core/config/cloudinary.js — Phase 3
// Configuration file for Cloudinary API interaction.

import { v2 as cloudinary } from "cloudinary";
import { logger } from "../utils/logger.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey    = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.error("❌ Cloudinary configuration variables are missing! Make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in your .env file.");
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
    secure:     true, // Ensure secure HTTPS links are returned
  });
  logger.info("☁️  Cloudinary SDK configured successfully.");
}

export default cloudinary;
