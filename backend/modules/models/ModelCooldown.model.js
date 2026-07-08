// NovaMind — ModelCooldown.model.js — Phase 5
// MongoDB TTL collection replacing in-memory cooldown Map.
// MongoDB automatically removes documents once expiresAt is reached
// (via the TTL index), so cooldowns survive server restarts and
// are shared across multiple backend instances.

import mongoose from 'mongoose';

const modelCooldownSchema = new mongoose.Schema({
  modelName: {
    type:     String,
    required: true,
    unique:   true,
    index:    true,
  },
  reason: {
    type:    String, // '429', '503', 'too_many_fails', 'unknown'
    default: 'unknown',
  },
  failCount: {
    type:    Number,
    default: 1,
  },
  expiresAt: {
    type:     Date,
    required: true,
    // MongoDB TTL index — document is deleted automatically when this date passes
    index:    { expireAfterSeconds: 0 },
  },
});

export default mongoose.model('ModelCooldown', modelCooldownSchema);
