// NovaMind — backend/tests/setup.js — Phase 3
// Test environment setup using a dedicated cloud database sandbox on MongoDB Atlas.

import "dotenv/config";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "@jest/globals";

// Helper to redirect Atlas connection to a safe test database sandbox
const getTestMongoUri = () => {
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }
  if (baseUri.includes("/Chatbot")) {
    return baseUri.replace("/Chatbot", "/novamind_test");
  }
  const urlParts = baseUri.split("?");
  const connectionBase = urlParts[0];
  const queryParams = urlParts[1] ? `?${urlParts[1]}` : "";
  const lastSlashIndex = connectionBase.lastIndexOf("/");
  const newBase = connectionBase.slice(0, lastSlashIndex) + "/novamind_test";
  return newBase + queryParams;
};

beforeAll(async () => {
  const testUri = getTestMongoUri();
  
  process.env.MONGODB_URI = testUri;
  process.env.JWT_ACCESS_SECRET = "test_access_secret_minimum_32_chars_xx";
  process.env.JWT_REFRESH_SECRET = "test_refresh_secret_minimum_32_chars_xx";
  process.env.NODE_ENV = "test";

  // Connect mongoose to the dedicated Atlas test database namespace
  await mongoose.connect(testUri, {
    serverSelectionTimeoutMS: 15000 // Give it ample time to connect over the WAN
  });
});

afterAll(async () => {
  // Clear all mock data from the test database and close connection
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    await mongoose.disconnect();
  }
});
