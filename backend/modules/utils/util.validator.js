import { body, validationResult } from "express-validator";

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error("❌ [Validation Error] details:", errors.array());
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

export const validatePassword = [
  body("length")
    .optional()
    .isInt({ min: 8, max: 64 })
    .withMessage("Password length must be between 8 and 64"),
  validateResult
];
