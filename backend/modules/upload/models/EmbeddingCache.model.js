// NovaMind — EmbeddingCache.model.js
import mongoose from 'mongoose';

const embeddingCacheSchema = new mongoose.Schema(
  {
    chunkHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    values: {
      type: [Number],
      required: true
    },
    model: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

const EmbeddingCache = mongoose.model('EmbeddingCache', embeddingCacheSchema);
export default EmbeddingCache;
