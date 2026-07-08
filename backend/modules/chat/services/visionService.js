// NovaMind — backend/modules/chat/services/visionService.js — Phase 3
// Bug Fix & Cloudinary URL integration. Downloads Cloudinary image URLs
// inside the backend to stream to Gemini API.

import { generateVisionReply } from "../../../core/services/geminiService.js";
import { logger } from "../../../core/utils/logger.js";

export const processVisionMessage = async ({
  message,
  imageUrl,
  model
}) => {
  if (!imageUrl) {
    throw new Error("No image URL provided");
  }

  try {
    // Fetch image from Cloudinary URL in the backend
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image from Cloudinary: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const mimeType    = response.headers.get("content-type");

    if (!mimeType || !mimeType.startsWith("image/")) {
      throw new Error(`Invalid file type: ${mimeType || "unknown"}. Only image files are supported.`);
    }

    const base64string = buffer.toString("base64");
    const reply = await generateVisionReply({
      message,
      imageBase64: base64string,
      mimeType,
      model
    });

    return { reply, base64string, mimeType };
  } catch (err) {
    logger.error("[Vision] Vision processing failed", { error: err.message });
    throw err;
  }
};
