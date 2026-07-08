// NovaMind — memory.controller.js — Phase 5
import Memory from './Memory.model.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';

// GET /api/memory — get all memories for the authenticated user
export const getMemories = asyncHandler(async (req, res) => {
  const memories = await Memory.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .select('content createdAt extractedFrom')
    .lean();

  res.status(200).json({
    success:  true,
    memories,
    count:    memories.length,
  });
});

// DELETE /api/memory/:id — delete a specific memory (ownership enforced)
export const deleteMemory = asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({
    _id:    req.params.id,
    userId: req.user.id,
  });

  if (!memory) {
    return res.status(404).json({
      error: 'Memory not found.',
    });
  }

  await memory.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Memory deleted.',
  });
});

// DELETE /api/memory — delete ALL memories for the authenticated user
export const deleteAllMemories = asyncHandler(async (req, res) => {
  const result = await Memory.deleteMany({ userId: req.user.id });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} memories deleted.`,
    deleted: result.deletedCount,
  });
});
