// NovaMind — search.controller.js — Phase 5
// Enriched full-text search matching both message contents and session names using regex (for partial word support).

import Message  from '../messages/Message.model.js';
import Session  from '../sessions/Session.model.js';
import { asyncHandler } from '../../core/utils/asyncHandler.js';
import { logger } from '../../core/utils/logger.js';

export const searchMessages = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const userId = req.user.id;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: 'Search query must be at least 2 characters.',
    });
  }

  const searchTerm = q.trim();

  logger.info('Performing chat history search', { userId, query: searchTerm });

  // 1. Find sessions matching the query by name (regex case-insensitive)
  const matchingSessions = await Session.find({
    userId,
    name: { $regex: searchTerm, $options: 'i' },
  })
    .select('_id name')
    .lean();

  const matchingSessionIds = matchingSessions.map((s) => String(s._id));

  // 2. Find messages matching the query by content (regex case-insensitive)
  const messages = await Message.find({
    userId,
    message: { $regex: searchTerm, $options: 'i' },
  })
    .select('message sender sessionId createdAt')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  // Get all session IDs from the matched messages
  const messageSessionIds = new Set(messages.map((m) => String(m.sessionId)));

  // For any session that matched by name but didn't have any matching message,
  // find its latest message to represent it in the results
  const sessionsToFetch = matchingSessionIds.filter(
    (sid) => !messageSessionIds.has(sid)
  );

  if (sessionsToFetch.length > 0) {
    const extraMessages = [];
    for (const sid of sessionsToFetch) {
      const lastMsg = await Message.findOne({ userId, sessionId: sid })
        .sort({ createdAt: -1 })
        .select('message sender sessionId createdAt')
        .lean();
      
      if (lastMsg) {
        extraMessages.push(lastMsg);
      } else {
        // Fallback placeholder if no messages exist yet
        extraMessages.push({
          _id: `temp-${sid}`,
          message: 'No messages in this chat yet.',
          sender: 'system',
          sessionId: sid,
          createdAt: new Date(),
        });
      }
    }
    // Combine them, putting session name matches first
    messages.unshift(...extraMessages);
  }

  if (messages.length === 0) {
    return res.status(200).json({
      success: true,
      results: [],
      count:   0,
      query:   searchTerm,
    });
  }

  // Fetch session names for all sessions in results
  const sessionIdsToQuery = [...new Set(messages.map((m) => String(m.sessionId)))];
  const sessions = await Session.find({
    _id:    { $in: sessionIdsToQuery },
    userId,
  })
    .select('name')
    .lean();

  const sessionMap = {};
  sessions.forEach((s) => {
    sessionMap[String(s._id)] = s.name;
  });

  // Build enriched result list with context snippets
  const results = messages.map((m) => {
    const content = m.message || '';
    const lowerContent = content.toLowerCase();
    const lowerSearch  = searchTerm.toLowerCase();
    const matchIdx     = lowerContent.indexOf(lowerSearch);

    let snippet = content;
    if (content.length > 180) {
      if (matchIdx !== -1) {
        const start = Math.max(0, matchIdx - 70);
        const end   = Math.min(content.length, matchIdx + searchTerm.length + 70);
        snippet =
          (start > 0 ? '...' : '') +
          content.slice(start, end) +
          (end < content.length ? '...' : '');
      } else {
        snippet = content.slice(0, 180) + '...';
      }
    }

    return {
      messageId:   m._id,
      sessionId:   m.sessionId,
      sessionName: sessionMap[String(m.sessionId)] || 'Untitled Chat',
      sender:      m.sender,
      snippet,
      createdAt:   m.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    results,
    count:   results.length,
    query:   searchTerm,
  });
});
