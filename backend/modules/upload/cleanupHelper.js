// NovaMind — backend/modules/upload/cleanupHelper.js
// Shared helpers for deleting Cloudinary assets and MongoDB document records.
// Extracted from account.controller.js, session.controller.js, and upload.controller.js
// to eliminate the three near-identical cleanup implementations (fixes #15 and #16).

import cloudinary from '../../core/config/cloudinary.js';
import { logger }  from '../../core/utils/logger.js';
import FileRegistry     from './models/FileRegistry.model.js';
import DocumentChunk    from './models/DocumentChunk.model.js';
import DocumentManifest from './models/DocumentManifest.model.js';

// ── Cloudinary ────────────────────────────────────────────────────────────────

/**
 * Delete a single Cloudinary asset by publicId.
 * Swallows errors so callers can use Promise.allSettled.
 */
export const deleteCloudinaryAsset = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    logger.info('Deleted Cloudinary asset', { publicId, resourceType });
  } catch (err) {
    logger.error('Failed to delete Cloudinary asset', { publicId, error: err.message });
  }
};

/**
 * Delete Cloudinary assets attached to an array of message documents.
 * Handles both image and file attachments (image + raw resource types).
 */
export const deleteCloudinaryAssetsForMessages = async (messages) => {
  const promises = [];
  for (const msg of messages) {
    if (msg.image?.publicId) {
      promises.push(deleteCloudinaryAsset(msg.image.publicId, msg.image.resourceType || 'image'));
    }
    if (msg.file?.publicId) {
      promises.push(deleteCloudinaryAsset(msg.file.publicId, msg.file.resourceType || 'raw'));
    }
  }
  await Promise.allSettled(promises);
};

/**
 * Delete Cloudinary assets + MongoDB chunks/manifests/registries for a set of
 * FileRegistry documents. Pass an array already fetched by the caller.
 */
export const deleteDocumentAssets = async (registries) => {
  const promises = [];

  for (const reg of registries) {
    // Delete Cloudinary raw file
    if (reg.publicId) {
      promises.push(deleteCloudinaryAsset(reg.publicId, 'raw'));
    }

    if (reg.documentId) {
      // Fast path — documentId known
      promises.push(DocumentChunk.deleteMany({ documentId: reg.documentId }));
      promises.push(DocumentManifest.deleteOne({ documentId: reg.documentId }));
    } else if (reg.sha256 && reg.sha256 !== 'pending') {
      // Fallback: look up via sha256
      promises.push(
        (async () => {
          const sample = await DocumentChunk.findOne({
            sessionId: reg.sessionId,
            userId:    reg.userId,
            'metadata.sha256': reg.sha256,
          });
          if (sample?.documentId) {
            await DocumentChunk.deleteMany({ documentId: sample.documentId });
            await DocumentManifest.deleteOne({ documentId: sample.documentId });
          } else {
            await DocumentChunk.deleteMany({ sessionId: reg.sessionId, userId: reg.userId, 'metadata.sha256': reg.sha256 });
            await DocumentManifest.deleteOne({ sessionId: reg.sessionId, title: reg.fileName });
          }
        })()
      );
    }
  }

  await Promise.allSettled(promises);
};

/**
 * Full cleanup for a specific session's uploaded documents.
 * Deletes Cloudinary assets, chunks, manifests, and registry records.
 */
export const deleteSessionDocuments = async (sessionId, userId) => {
  try {
    const registries = await FileRegistry.find({ sessionId, userId }).lean();
    if (registries.length > 0) {
      await deleteDocumentAssets(registries);
      await FileRegistry.deleteMany({ sessionId, userId });
    }
  } catch (err) {
    logger.warn('Failed to delete session document assets', { sessionId, userId, error: err.message });
  }
};

/**
 * Full cleanup for ALL of a user's uploaded documents.
 * Deletes Cloudinary assets, chunks, manifests, and registry records.
 */
export const deleteAllUserDocuments = async (userId) => {
  try {
    const registries = await FileRegistry.find({ userId }).lean();
    if (registries.length > 0) {
      await deleteDocumentAssets(registries);
      await FileRegistry.deleteMany({ userId });
    }
  } catch (err) {
    logger.warn('Failed to delete all user document assets', { userId, error: err.message });
  }
};
