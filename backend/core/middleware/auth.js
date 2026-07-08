// NovaMind — backend/core/middleware/auth.js — Phase 1
// Reads and verifies the short-lived accessToken from the Authorization header.
// The refreshToken (httpOnly cookie) is handled separately in auth.controller.js.

import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify against JWT_ACCESS_SECRET (short-lived token)
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      // Frontend should silently call /api/auth/refresh when it receives this
      return res.status(401).json({
        error: "Access token expired.",
        code:  "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({ error: "Invalid token. Please log in again." });
  }
};
