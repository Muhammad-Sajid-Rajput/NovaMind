// NovaMind — Message.model.js — Phase 4

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sender: {
      type: String,
      enum: ["user", "robot", "bot"],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    time: {
      type: String
    },
    image: {
      url:          { type: String },  // Cloudinary URL
      publicId:     { type: String },  // For deletion
      resourceType: { type: String },
      mimeType:     { type: String },
      originalName: { type: String },
      bytes:        { type: Number }
    },
    file: {
      url:          { type: String },  // Cloudinary URL
      publicId:     { type: String },  // For deletion
      resourceType: { type: String },
      mimeType:     { type: String },
      originalName: { type: String },
      bytes:        { type: Number }
    },
    files: [
      {
        url:          { type: String },  // Cloudinary URL
        publicId:     { type: String },  // For deletion
        resourceType: { type: String },
        mimeType:     { type: String },
        originalName: { type: String },
        bytes:        { type: Number }
      }
    ],
    model: {
      type: String,
      default: null
    },
    type: {
      type: String,
      enum: ["chat", "system"],
      default: "chat"
    },
    isError: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

messageSchema.index({ sessionId: 1, createdAt: 1 });
messageSchema.index({ sessionId: 1, userId: 1, createdAt: 1 });
// Full-text search (Phase 5.6)
messageSchema.index({ message: "text" });

const Message = mongoose.model("Message", messageSchema);
export default Message;
