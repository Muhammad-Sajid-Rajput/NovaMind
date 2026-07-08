import { body, param, validationResult } from "express-validator";

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ [Validation Error] details:", errors.array());
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

export const validateSession = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Session ID is required"),
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Session name cannot be empty")
    .isLength({ max: 50 })
    .withMessage("Session name cannot exceed 50 characters"),
  validateResult
];
