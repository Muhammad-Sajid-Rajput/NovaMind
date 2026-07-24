// NovaMind — backend/modules/auth/cookieHelper.js
// Shared cookie helpers for auth tokens.
// Centralised here so any option change (e.g. partitioned, domain) is made once.

export const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path:     "/",
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    path:     "/",
  });
};
