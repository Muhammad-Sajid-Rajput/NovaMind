import { body, validationResult } from "express-validator";
import { ALLOWED_MODELS } from "./utils/modelFallback.js";

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ [Validation Error] details:", errors.array());
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

export const validateChat = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 8000 })
    .withMessage("Message cannot exceed 8000 characters"),
  body("sessionId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("sessionId cannot be empty"),
  body("model")
    .optional()
    .isIn(ALLOWED_MODELS)
    .withMessage("Invalid model selection"),
  body("language")
    .optional()
    .trim(),
  body("contextLimit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Context limit must be an integer between 1 and 100"),
  body("history")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) {
            throw new Error("Parsed history is not an array");
          }
          return true;
        } catch (e) {
          throw new Error("Invalid JSON format for history");
        }
      }
      if (Array.isArray(value)) {
        return true;
      }
      throw new Error("History must be an array or JSON string representing an array");
    }),
  validateResult
];
