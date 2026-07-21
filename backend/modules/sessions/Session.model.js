// NovaMind — Session.model.js — Phase 4

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      default: "New Chat",
      maxlength: 50
    },
    activeRootId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, name: 'text' }); // text search

const Session = mongoose.model("Session", sessionSchema);
export default Session;
