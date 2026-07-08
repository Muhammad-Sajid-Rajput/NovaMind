// NovaMind — backend/jest.config.js — Phase 3
// Jest configuration for testing ES Modules (ESM) codebase.

export default {
  testEnvironment: "node",
  transform:       {}, // No transform needed for native ESM
  testTimeout:     20000,
  verbose:         true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
