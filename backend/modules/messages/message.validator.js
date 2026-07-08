import { query, validationResult } from "express-validator";

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ [Validation Error] details:", errors.array());
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

export const validateGetMessages = [
  query("sessionId")
    .trim()
    .notEmpty()
    .withMessage("Session ID query parameter is required"),
  validateResult
];
