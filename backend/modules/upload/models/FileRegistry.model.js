// NovaMind — FileRegistry.model.js
import mongoose from 'mongoose';

const fileRegistrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    sha256: {
      type: String,
      required: true,
      index: true
    },
    cloudinaryUrl: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: [
        'Uploaded',
        'Queued',
        'Downloading',
        'Validated',
        'Parsing',
        'Normalizing',
        'Chunking',
        'Embedding',
        'Indexing',
        'Indexed',
        'Completed',
        'Failed'
      ],
      default: 'Uploaded',
      required: true
    },
    error: {
      type: String,
      default: null
    },
    jobId: {
      type: String,
      default: null,
      index: true
    },
    messageId: {
      type: String,
      default: null,
      index: true
    },
    documentId: {
      type: String,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

// Compound index to quickly find file status for a user/session by file hash
fileRegistrySchema.index({ userId: 1, sessionId: 1, sha256: 1 });

const FileRegistry = mongoose.model('FileRegistry', fileRegistrySchema);
export default FileRegistry;
