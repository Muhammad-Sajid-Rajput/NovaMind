// NovaMind AI — backend/utils/password.js — Production Build

import crypto from "crypto";

/**
 * Generates a secure random password/key.
 * Guarantees at least one uppercase, one lowercase,
 * one digit, and one special character.
 *
 * @param {number} length - Total length of the key (default: 8, min: 8, max: 64)
 * @returns {string} The generated key
 */
function generateUniqueKey(length = 8) {
  const safeLength = Math.min(64, Math.max(8, parseInt(length, 10) || 8));

  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = upper + lower + numbers + special;

  const getRandomChar = (str) => {
    const index = crypto.randomInt(0, str.length);
    return str[index];
  };

  // Guarantee one character from each required character class
  const mandatoryChars = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(numbers),
    getRandomChar(special),
  ];

  // Fill the remaining slots with random characters from all classes
  for (let i = mandatoryChars.length; i < safeLength; i++) {
    mandatoryChars.push(getRandomChar(allChars));
  }

  // Fisher-Yates shuffle to randomize character positions using cryptographically secure indices
  for (let i = mandatoryChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [mandatoryChars[i], mandatoryChars[j]] = [mandatoryChars[j], mandatoryChars[i]];
  }

  return mandatoryChars.join("");
}

/**
 * Validates password strength:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param {string} password
 * @returns {string|null} Error message or null if valid
 */
export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

export default generateUniqueKey;

