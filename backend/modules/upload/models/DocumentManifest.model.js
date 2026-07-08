// NovaMind — DocumentManifest.model.js
import mongoose from 'mongoose';

const documentManifestSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    totalPages: {
      type: Number,
      default: 1
    },
    totalChunks: {
      type: Number,
      required: true
    },
    language: {
      type: String,
      default: 'en'
    },
    parserUsed: {
      type: String,
      required: true
    },
    embeddingModelUsed: {
      type: String,
      required: true
    },
    parserVersion: {
      type: String,
      required: true
    },
    embeddingVersion: {
      type: String,
      required: true
    },
    chunkStrategyVersion: {
      type: String,
      required: true
    },
    retrievalVersion: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['indexed', 'failed', 'outdated'],
      default: 'indexed',
      required: true
    }
  },
  { timestamps: true }
);

const DocumentManifest = mongoose.model('DocumentManifest', documentManifestSchema);
export default DocumentManifest;
