// NovaMind — Memory.model.js — Phase 5
import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    content: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 500,
    },
    extractedFrom: {
      type:    String, // sessionId that produced this memory
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast user memory lookups (newest first)
memorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Memory', memorySchema);
