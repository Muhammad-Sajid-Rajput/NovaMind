// NovaMind — memoryService.js — Phase 5
// Async, non-blocking memory extraction using Gemini.
// Called AFTER stream completes — never blocks HTTP response.
// Uses setImmediate so it runs in the next event-loop tick.
//
// Two parallel save paths:
//   1. Implicit extraction  — LLM decides what's worth saving (best-effort, may return [])
//   2. Explicit save        — user said "remember that…" → guaranteed save, no LLM judgment gate

import { getModelWithKey } from '../../core/utils/keyManager.js';
import Memory  from './Memory.model.js';
import { logger } from '../../core/utils/logger.js';
import { memoryExtractionsTotal } from '../../core/config/metrics.js';

// Use the smallest/fastest model for extraction to conserve quota
const MEMORY_MODEL = 'gemini-3.1-flash-lite';

// ── Implicit extraction prompt ───────────────────────────────────────────────
const buildExtractionPrompt = (userMessage, assistantReply, existingMemories) => `
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

If the user's message is contextual (e.g., confirming a fact or referring to previous info like "remember that"), use the assistant's reply for context to construct the complete fact.

Existing memories (do not duplicate):
${existingMemories.length > 0
  ? existingMemories.map(m => `- ${m.content}`).join('\n')
  : 'None'}

User message: "${userMessage}"
${assistantReply ? `Assistant's reply: "${assistantReply}"` : ""}

Return ONLY a valid JSON array. Maximum 2 facts. 
If nothing clearly personal: []
`.trim();

// ── Explicit save prompt ─────────────────────────────────────────────────────
// Used when the user explicitly asks to remember something.
// Must return a plain cleaned fact — returning nothing is not acceptable.
const buildExplicitSavePrompt = (userMessage, assistantReply) => `
The user explicitly asked to remember something. Extract the core fact
they want saved, stripping trigger phrases like "remember that", "don't forget",
"save this", "keep in mind", "note that", "for future reference", etc.

Rules:
- Return ONLY the cleaned fact as a plain string — no JSON, no brackets, no quotes
- Rephrase in a neutral, third-person-compatible style (e.g. "Prefers TypeScript over JavaScript" or "Has a CGPA of 3.57")
- Do NOT return an empty string or say "nothing to remember"
- If the user refers to something contextually (e.g., "dont forget my cgpa"), extract the actual value (e.g., "3.57") from the assistant's reply.
- If you cannot clean it or find the context, return the original message with only the trigger phrase removed.

User message: "${userMessage}"
${assistantReply ? `Assistant's reply: "${assistantReply}"` : ""}
`.trim();

// ── Reconciliation Prompt ────────────────────────────────────────────────────
const buildReconciliationPrompt = (newFact, existing) => `
You are a memory reconciliation assistant. Given the user's EXISTING memories and a NEW fact just extracted, determine the correct action.

Existing memories:
${existing.map((m, i) => `${i}: ${m.content}`).join('\n')}

New fact: "${newFact}"

Rules:
- If the new fact contradicts, updates, replaces, or negates an existing memory (e.g. changed preference, corrected info, 'no longer X', 'actually it's Y now'), return {"action": "replace", "replaceIndex": <index>, "newContent": "<cleaned positive-phrased fact>"}
- If the new fact is entirely new and unrelated to any existing memory, return {"action": "add", "newContent": "<cleaned fact>"}
- If the new fact is a pure negation with no replacement stated (e.g. 'I don't like Rust anymore' with no mention of what they prefer instead), return {"action": "delete", "replaceIndex": <index>}
- If the new fact is already effectively covered by an existing memory, return {"action": "skip"}

Return ONLY valid JSON, no markdown, no explanation.
`.trim();

// ── Explicit save trigger patterns ───────────────────────────────────────────
// Narrow and safe — false positives just mean an extra clean-and-save (cheap).
// False negatives fall back to the implicit extraction path — low risk either way.
// Unicode-tolerant: matches straight apostrophe ('), curly apostrophe (\u2019/\u2018),
// and missing apostrophe entirely — all common in real chat input and mobile keyboards.
const APOSTROPHE = `[\u2019\u2018']?`; // straight, curly-right, curly-left, or absent

const EXPLICIT_SAVE_PATTERNS = [
  /\bremember (that |this )?/i,
  /\bsave (this|that)\b/i,
  new RegExp(`\\bdon${APOSTROPHE}t forget (that |this )?`, 'i'),
  /\bkeep in mind (that |this )?/i,
  /\bnote (that |this )?/i,
  /\bfor future reference,?\s*/i,
  /\balways remember\b/i,
  /\bplease remember\b/i,
  new RegExp(`\\bwon${APOSTROPHE}t forget\b`, 'i'),
  new RegExp(`\\bcan${APOSTROPHE}t forget\b`, 'i'),
];

// Exported so chat.controller.js can route before calling either save path
export const isExplicitSaveRequest = async (message) => {
  if (typeof message !== 'string') return false;

  // Stage 1: Regex Fast-path
  const regexMatched = EXPLICIT_SAVE_PATTERNS.some((p) => p.test(message));
  if (regexMatched) {
    logger.info('[Memory] isExplicitSaveRequest matched via Regex fast-path', { messagePreview: message.slice(0, 80) });
    return true;
  }

  // Stage 2: LLM Classifier Fallback
  try {
    const { model, reportSuccess, reportFailure } = getModelWithKey(MEMORY_MODEL);
    const prompt = `
    Analyze the user message below. Does this message explicitly ask the AI to remember, save, keep in mind, or store a fact for future reference?
    Reply with either "YES" or "NO" only. Do not add punctuation, explanation, or extra words.

    User message: "${message}"
    `.trim();

    let result;
    try {
      result = await model.generateContent(prompt);
      reportSuccess();
    } catch (err) {
      reportFailure(err);
      throw err;
    }

    const responseText = result.response.text().trim().toUpperCase();
    const llmMatched = responseText.includes("YES");

    logger.info('[Memory] isExplicitSaveRequest matched via LLM fallback', {
      llmMatched,
      rawResponse: responseText,
      messagePreview: message.slice(0, 80)
    });

    return llmMatched;
  } catch (err) {
    logger.error('[Memory] isExplicitSaveRequest LLM fallback failed', {
      error: err.message,
      stack: err.stack
    });
    return false; // Fall back to false on error to avoid blocking critical path
  }
};

// Strip the trigger phrase from raw text (used as LLM fallback)
const stripTriggerPhrase = (message) =>
  EXPLICIT_SAVE_PATTERNS.reduce((m, p) => m.replace(p, ''), message).trim();

// ── Implicit: should we even attempt extraction? ─────────────────────────────
const shouldIncludeMemories = (userMessage) => {
  if (!userMessage || typeof userMessage !== 'string') return false;
  const normalized = userMessage.trim();
  if (!normalized) return false;

  // Fast-path skip: too short to contain a fact, or pure conversational chit-chat
  if (normalized.length < 8) return false;
  const conversational = /^(hi|hey|hello|yo|thanks|thank you|ok|okay|lol|cool|nice|got it|sounds good|bye|goodbye)\b/i;
  if (conversational.test(normalized)) return false;

  // Fast-path skip: pure question with no first-person or factual-statement shape
  const pureQuestionNoSelfRef = /^(what|why|how|when|where|which|is|are|can|does|do)\b.*\?$/i;
  if (pureQuestionNoSelfRef.test(normalized) && !/\b(i|my|me|mine|myself)\b/i.test(normalized)) return false;

  return true;
};

// Helper to reconcile a new memory fact against existing memories and perform the correct DB operation
export const reconcileAndSaveMemory = async ({ userId, newFact, existing, sessionId }) => {
  if (!newFact || typeof newFact !== 'string' || newFact.trim().length <= 5) {
    return { success: true, saved: false, reason: 'invalid_fact' };
  }

  const cleanedNewFact = newFact.trim();

  // If user has no existing memories, add immediately and bypass LLM reconciliation
  if (!existing || existing.length === 0) {
    const created = await Memory.create({
      userId,
      content:       cleanedNewFact,
      extractedFrom: sessionId ?? null,
    });
    // Add to our local array so future loop iterations can see it
    existing.push({ _id: created._id, content: cleanedNewFact });
    memoryExtractionsTotal.inc(1);
    logger.info('[Memory] save (direct add, no existing memories)', { userId, memoryId: created._id, content: cleanedNewFact });
    return { success: true, saved: true, content: cleanedNewFact };
  }

  // Otherwise, run LLM reconciliation call
  try {
    const { model, reportSuccess, reportFailure } = getModelWithKey(MEMORY_MODEL);
    let result;
    try {
      result = await model.generateContent(buildReconciliationPrompt(cleanedNewFact, existing));
      reportSuccess();
    } catch (err) {
      reportFailure(err);
      throw err;
    }

    const rawText = result.response.text().trim();
    // Strip code fences if model adds them
    const cleanJson = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let decision;
    try {
      decision = JSON.parse(cleanJson);
    } catch (parseErr) {
      logger.warn('[Memory] Reconciliation JSON parse failed, falling back to direct add', {
        rawResponse: rawText,
        parseError: parseErr.message
      });
      // Fallback: direct insert
      const created = await Memory.create({
        userId,
        content:       cleanedNewFact,
        extractedFrom: sessionId ?? null,
      });
      existing.push({ _id: created._id, content: cleanedNewFact });
      memoryExtractionsTotal.inc(1);
      return { success: true, saved: true, content: cleanedNewFact, fallback: true };
    }

    const { action, replaceIndex, newContent } = decision;

    if (action === 'replace') {
      const idx = parseInt(replaceIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= existing.length) {
        throw new Error(`Invalid replaceIndex resolved: ${replaceIndex}`);
      }
      const targetMemory = existing[idx];
      const updatedContent = (newContent || cleanedNewFact).trim();

      await Memory.findByIdAndUpdate(targetMemory._id, { content: updatedContent });
      logger.info('[Memory] Reconciled: replaced memory', {
        userId,
        oldContent: targetMemory.content,
        newContent: updatedContent,
        memoryId: targetMemory._id
      });
      // Update local array for future iterations
      existing[idx].content = updatedContent;
      return { success: true, saved: true, action: 'replace', content: updatedContent };
    } 
    
    if (action === 'delete') {
      const idx = parseInt(replaceIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= existing.length) {
        throw new Error(`Invalid replaceIndex resolved: ${replaceIndex}`);
      }
      const targetMemory = existing[idx];
      await Memory.findByIdAndDelete(targetMemory._id);
      logger.info('[Memory] Reconciled: deleted memory', {
        userId,
        deletedContent: targetMemory.content,
        memoryId: targetMemory._id
      });
      // Remove from local array
      existing.splice(idx, 1);
      return { success: true, saved: false, action: 'delete' };
    } 
    
    if (action === 'skip') {
      logger.info('[Memory] Reconciled: skipped duplicate/covered memory', { userId, content: cleanedNewFact });
      return { success: true, saved: false, action: 'skip', reason: 'duplicate' };
    } 
    
    // Default to 'add'
    const finalContent = (newContent || cleanedNewFact).trim();
    const created = await Memory.create({
      userId,
      content:       finalContent,
      extractedFrom: sessionId ?? null,
    });
    existing.push({ _id: created._id, content: finalContent });
    memoryExtractionsTotal.inc(1);
    logger.info('[Memory] Reconciled: added new memory', { userId, memoryId: created._id, content: finalContent });
    return { success: true, saved: true, action: 'add', content: finalContent };

  } catch (err) {
    logger.error('[Memory] Reconciliation failed, falling back to direct add', {
      error: err.message,
      stack: err.stack,
      userId
    });
    // Fallback: direct insert
    const created = await Memory.create({
      userId,
      content:       cleanedNewFact,
      extractedFrom: sessionId ?? null,
    });
    existing.push({ _id: created._id, content: cleanedNewFact });
    memoryExtractionsTotal.inc(1);
    return { success: true, saved: true, content: cleanedNewFact, fallback: true };
  }
};

// ── Path 1: Implicit extraction (fire-and-forget) ────────────────────────────
export const extractAndSaveMemories = ({ userId, userMessage, assistantReply, sessionId }) => {
  // Run completely asynchronously — never await this in controller
  setImmediate(async () => {
    try {
      if (!shouldIncludeMemories(userMessage)) return;

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
          buildExtractionPrompt(userMessage, assistantReply, existing)
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

      // Reconcile and save facts sequentially (so subsequent facts can see updates of prior ones)
      for (const fact of newFacts) {
        await reconcileAndSaveMemory({
          userId,
          newFact: fact,
          existing,
          sessionId
        });
      }

      logger.info('Memories extracted, reconciled, and saved', {
        userId,
        count: newFacts.length,
        facts: newFacts,
      });
    } catch (err) {
      // Never throw — memory extraction is optional and must never break chat
      logger.error('Memory extraction failed (non-fatal)', {
        error:  err.message,
        stack:  err.stack,
        userId,
      });
    }
  });
};

// ── Path 2: Explicit save (critical-path, awaited) ───────────────────────────
// Triggered when the user says "remember that…", "don't forget…", etc.
// Guaranteed save — LLM only cleans phrasing, not judges relevance.
// Falls back to stripped raw text if LLM fails — fact is never silently lost.
// No 2-fact cap — all facts from an explicit request are saved.
export const saveExplicitMemory = async ({ userId, userMessage, assistantReply, sessionId }) => {
  try {
    logger.info('[Memory] saveExplicitMemory started', { userId, messagePreview: userMessage.slice(0, 80) });

    // Fetch existing memories for dedup check
    const existing = await Memory.find({ userId })
      .sort({ createdAt: -1 })
      .select('content')
      .limit(50)
      .lean();

    let cleanedFact = null;

    // Attempt LLM cleanup pass
    try {
      const { model, reportSuccess, reportFailure } = getModelWithKey(MEMORY_MODEL);
      let result;
      try {
        result = await model.generateContent(buildExplicitSavePrompt(userMessage, assistantReply));
        reportSuccess();
      } catch (err) {
        reportFailure(err);
        throw err;
      }

      const raw = result.response.text().trim();
      if (raw && raw.length > 5) {
        cleanedFact = raw;
      }
    } catch (llmErr) {
      // LLM failed — log error with stack
      logger.error('Explicit memory LLM cleanup failed', {
        error: llmErr.message,
        stack: llmErr.stack,
        userId,
      });
    }

    // Fallback: strip the trigger phrase and use the remaining text
    if (!cleanedFact) {
      const stripped = stripTriggerPhrase(userMessage);
      cleanedFact = stripped.length > 5 ? stripped : userMessage;
    }

    // Call reconcileAndSaveMemory to handle replacement/delete/add/skip
    const saveResult = await reconcileAndSaveMemory({
      userId,
      newFact: cleanedFact,
      existing,
      sessionId
    });

    return saveResult;
  } catch (err) {
    logger.error('Explicit memory save failed', {
      error:  err.message,
      stack:  err.stack,
      userId,
    });
    return { success: false, saved: false, error: err.message };
  }
};

// ── Get formatted memory string for system prompt injection ─────────────────
export const getUserMemoriesForPrompt = async (userId) => {
  try {
    const memories = await Memory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('content')
      .lean();

    if (memories.length === 0) return '';

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
