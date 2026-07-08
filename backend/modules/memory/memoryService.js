// NovaMind — memoryService.js — Phase 5
// Async, non-blocking memory extraction using Gemini.
// Called AFTER stream completes — never blocks HTTP response.
// Uses setImmediate so it runs in the next event-loop tick.

import { getModelWithKey } from '../../core/utils/keyManager.js';
import Memory  from './Memory.model.js';
import { logger } from '../../core/utils/logger.js';
import { memoryExtractionsTotal } from '../../core/config/metrics.js';

// Use the smallest/fastest model for extraction to conserve quota
const MEMORY_MODEL = 'gemini-2.5-flash-lite';

const buildExtractionPrompt = (userMessage, existingMemories) => `
You are a memory extraction assistant.

Extract ONLY highly personal, reusable facts that would help 
personalize future responses. Be very selective.

EXTRACT:
- Name, location, profession
- Explicit preferences stated by user
- Major life facts the user shares directly

DO NOT EXTRACT:
- Topics they asked about
- Questions they have
- General interests inferred from questions
- Anything not explicitly stated as a personal fact

Existing memories (do not duplicate):
${existingMemories.length > 0
  ? existingMemories.map(m => `- ${m.content}`).join('\n')
  : 'None'}

User message: "${userMessage}"

Return ONLY a valid JSON array. Maximum 2 facts. 
If nothing clearly personal: []
`.trim();

const MEMORY_RELEVANCE_PATTERNS = [
  /\b(me|my|mine|myself)\b/i,
  /\b(i|i'm|i am|i've|i have)\b/i,
  /\b(project|workspace|stack|job|career|work|study|school|university|college|resume|portfolio|goal|preference|prefer|recommend|suggest|choose|build for me)\b/i,
  /\b(what do you know about me|tell me about me|based on my|for my next project|my next project)\b/i,
];

const shouldIncludeMemories = (userMessage) => {
  if (!userMessage || typeof userMessage !== 'string') return true;
  const normalized = userMessage.trim();
  if (!normalized) return false;
  return MEMORY_RELEVANCE_PATTERNS.some((pattern) => pattern.test(normalized));
};

// ── Extract memories from a user message (fire-and-forget) ─────────────────
export const extractAndSaveMemories = ({ userId, userMessage, sessionId }) => {
  // Run completely asynchronously — never await this in controller
  setImmediate(async () => {
    try {
      // Fetch existing memories to avoid duplicates (limit to recent 50)
      const existing = await Memory.find({ userId })
        .sort({ createdAt: -1 })
        .select('content')
        .limit(50)
        .lean();

      const { model, reportSuccess, reportFailure } = getModelWithKey(MEMORY_MODEL);
      let result;
      try {
        result = await model.generateContent(
          buildExtractionPrompt(userMessage, existing)
        );
        reportSuccess();
      } catch (err) {
        reportFailure(err);
        throw err;
      }

      const rawText = result.response.text().trim();

      // Strip markdown code fences if model adds them
      const clean = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      let facts = [];
      try {
        facts = JSON.parse(clean);
      } catch {
        // Not valid JSON — model returned something unexpected, skip silently
        return;
      }

      if (!Array.isArray(facts) || facts.length === 0) return;

      // Filter: must be a non-trivial string
      const newFacts = facts.filter(
        (f) => typeof f === 'string' && f.trim().length > 10
      );

      if (newFacts.length === 0) return;

      // Persist to MongoDB
      await Memory.insertMany(
        newFacts.map((content) => ({
          userId,
          content:       content.trim(),
          extractedFrom: sessionId ?? null,
        }))
      );

      memoryExtractionsTotal.inc(newFacts.length);

      logger.info('Memories extracted and saved', {
        userId,
        count: newFacts.length,
        facts: newFacts,
      });
    } catch (err) {
      // Never throw — memory extraction is optional and must never break chat
      logger.warn('Memory extraction failed (non-fatal)', {
        error:  err.message,
        userId,
      });
    }
  });
};

// ── Get formatted memory string for system prompt injection ─────────────────
export const getUserMemoriesForPrompt = async (userId, userMessage) => {
  try {
    const memories = await Memory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('content')
      .lean();

    if (memories.length === 0) return '';
    if (!shouldIncludeMemories(userMessage)) return '';

    const lines = memories.map((m) => `- ${m.content}`).join('\n');

    return [
      'User profile (reference ONLY when directly asked or clearly relevant. Never force these into unrelated answers):',
      lines,
    ].join('\n');
  } catch (err) {
    logger.warn('Failed to load user memories for prompt', {
      error: err.message,
    });
    return ''; // fail open — chat works without memory context
  }
};
