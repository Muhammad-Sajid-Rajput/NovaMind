// NovaMind — chat.controller.js — File Upload Bug Fix

import crypto from "crypto";
import { SessionStore } from "../sessions/sessionStore.repository.js";
import Message from "../messages/Message.model.js";
import * as geminiService from "../../core/services/geminiService.js";
import { handleSSEStream } from "./services/streamService.js";
import { processVisionMessage } from "./services/visionService.js";
import { withFallback, getTelemetryStatus, getCooldownStatus } from "./utils/modelFallback.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { getModel } from "../../core/config/gemini.js";
import { logger } from "../../core/utils/logger.js";
import { retrieveContext } from "../../core/services/RetrievalService.js";
import { searchWeb, formatSearchResults } from "../../core/services/tavilyService.js";
import {
  extractAndSaveMemories,
  getUserMemoriesForPrompt,
} from "../memory/memoryService.js";
import {
  activeStreams,
  messagesSentTotal,
  modelUsageTotal,
} from "../../core/config/metrics.js";
import { getDocumentType } from "../upload/upload.controller.js";

const generateSessionName = async (userMessage, botReply) => {
  try {
    const { model: modelInstance, reportSuccess, reportFailure } = getModel("gemini-2.5-flash-lite");
    
    const prompt = `Generate a short 4-6 word title for a chat conversation.
       Do NOT use the raw user query or any filename directly.
       Return ONLY the title. No punctuation. No quotes. No explanation.
       Title case only.
 
       User message: ${userMessage.slice(0, 200)}
       Assistant reply: ${botReply.slice(0, 200)}`;

    const result = await modelInstance.generateContent(prompt);
    reportSuccess();

    let name = result.response.text().trim();
    // Remove any quotes Gemini adds
    name = name.replace(/^["'`]|["'`]$/g, "").trim();
    // Remove trailing punctuation
    name = name.replace(/[.!?,;]$/, "").trim();
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);
    // Truncate if too long
    if (name.length > 50) name = name.substring(0, 47) + "...";
    // Validate — if garbage returned, throw to use fallback
    if (name.length < 3) throw new Error("Name too short");

    return name;
  } catch (err) {
    // Clean fallback — not the whole raw message
    const fallback = userMessage
      .trim()
      .replace(/\n/g, " ")
      .slice(0, 35);
    return fallback.length < userMessage.length
      ? fallback + "..."
      : fallback;
  }
};

const DEFAULT_MODEL = "gemini-3.5-flash";

function sanitizeText(text) {
  if (typeof text !== "string") return "";
  let sanitized = text.replace(/<[^>]*>/g, "");
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  return sanitized.trim();
}

function getTimeString() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12"
  });
}

// ── Detect if query needs web search ───────────────
const needsWebSearch = (message) => {
  const triggers = [
    'latest', 'current', 'today', 'yesterday', 'recent',
    'news', 'now', 'happening', 'live', 'score', 'price',
    'weather', 'who won', 'what happened', '2024', '2025',
  ];
  const lower = message.toLowerCase();
  return triggers.some(t => lower.includes(t));
};

// ── Build context from RAG + web search ─────────────────
const buildContext = async ({
  message, sessionId, userId, isRagSession, history
}) => {
  const contextParts = [];

  // RAG: query Pinecone/MongoDB if session has uploaded docs
  let finalIsRagSession = isRagSession;
  if (!finalIsRagSession) {
    try {
      const hasFiles = await Message.exists({ sessionId, userId, "file.url": { $exists: true, $ne: null } });
      if (hasFiles) {
        finalIsRagSession = true;
      }
    } catch (err) {
      logger.warn('Failed to check for RAG session documents', { error: err.message });
    }
  }

  if (finalIsRagSession) {
    try {
      const ragResults = await retrieveContext({
        message,
        sessionId,
        userId,
        chatHistory: history || [],
        topK: 5
      });

      if (ragResults.length > 0) {
        contextParts.push('=== Relevant Document Context ===');
        ragResults.forEach((r, i) => {
          let sourceDesc = `Source ${i + 1}: ${r.fileName}`;
          const m = r.metadata || {};
          if (m.pageNumber) sourceDesc += `, Page ${m.pageNumber}`;
          if (m.sheetName) sourceDesc += `, Sheet ${m.sheetName}`;
          if (m.slideNumber) sourceDesc += `, Slide ${m.slideNumber}`;
          if (m.headingPath && m.headingPath.length > 0) {
            sourceDesc += `, Section: ${m.headingPath.join(' > ')}`;
          }
          if (m.rowRange) sourceDesc += `, Rows ${m.rowRange}`;
          if (m.lineRange && m.lineRange.length > 0) {
            sourceDesc += `, Lines ${m.lineRange[0]}-${m.lineRange[1]}`;
          }

          contextParts.push(
            `[${sourceDesc}]\n${r.text}`
          );
        });
        contextParts.push('=== End of Document Context ===');
      } else {
        contextParts.push('=== Relevant Document Context ===\n(No matching context found in the uploaded documents for this query)\n=== End of Document Context ===');
      }

      contextParts.push(
        'INSTRUCTIONS FOR RESPONSE STYLE:\n' +
        '- Synthesize a single, cohesive, and professional response using the document context when relevant.\n' +
        '- Cite the relevant source name and page/sheet/slide number inline when reference data is used (e.g. "as shown in document.pdf page 4").\n' +
        '- Do NOT cite or output raw snippets using labels like "From Source X" or "According to Source X" in your reply.\n' +
        '- If the answer to the user\'s question is NOT found or cannot be fully answered using the provided Document Context, you MUST still answer the question fully based on your general knowledge. However, you MUST begin your response with a clear, noticeable H4 markdown heading stating: "#### ⚠️ Note: This information is not present in the uploaded document." or a similar notice, followed by your general knowledge answer.\n' +
        '- Format the response professionally using standard markdown headings, subheadings, lists, and bold text for readability.'
      );
    } catch (err) {
      logger.warn('RAG search failed, continuing without context', {
        error: err.message
      });
    }
  }

  // Web search for current events
  if (needsWebSearch(message)) {
    try {
      const searchData = await searchWeb(message, {
        maxResults:  5,
        searchDepth: 'basic',
      });
      if (searchData.results && searchData.results.length > 0) {
        contextParts.push(formatSearchResults(searchData));
      }
    } catch (err) {
      logger.warn('Web search failed, continuing without results', {
        error: err.message
      });
    }
  }

  return contextParts.join('\n\n');
};

// ─── Shared helper: session creation + history parsing ────────────────────────
async function prepareMessageContext({ message, sessionId, model, language, contextLimit, incomingHistory, userId }) {
  const cleanMessage = sanitizeText(message);
  if (!cleanMessage) {
    const err = new Error("Message content cannot be empty.");
    err.statusCode = 400;
    throw err;
  }
  if (cleanMessage.length > 8000) {
    const err = new Error("Message exceeds the 8000 character limit.");
    err.statusCode = 400;
    throw err;
  }

  const sid = sessionId;
  const sessionExists = await SessionStore.sessionExists(sid, userId);
  if (!sessionExists) {
    await SessionStore.createSession(sid, userId, "New Chat");
  }

  if (incomingHistory !== undefined) {
    let parsedHistory = [];
    try {
      parsedHistory = typeof incomingHistory === "string" ? JSON.parse(incomingHistory) : incomingHistory;
    } catch { /* ignore */ }
    if (Array.isArray(parsedHistory)) {
      await SessionStore.setMessages(sid, userId, parsedHistory);
    }
  }

  const history = await SessionStore.getLastNMessages(sid, userId, contextLimit || 10);
  const isFirstMessage = history.length === 0;
  const preferredModelName = model || DEFAULT_MODEL;

  return { cleanMessage, sid, history, isFirstMessage, preferredModelName };
}

export const sendMessage = asyncHandler(async (req, res) => {
  const { message, sessionId, model, language, contextLimit, history: incomingHistory, isRagSession, file, files } = req.body;
  const userId = req.user.id;

  // ── Limit 1: User can upload only 2 files in one message ────────────────────
  const filesArray = files && Array.isArray(files) ? files : (file ? [file] : []);
  if (filesArray.length > 2) {
    return res.status(400).json({
      error: 'You can only upload up to 2 files per message.'
    });
  }

  // ── Limit 2: Daily limit of 2 files of each document type ────────────────────
  const incomingImages = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) === 'image');
  if (incomingImages.length > 0) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userMessages = await Message.find({
      userId,
      createdAt: { $gte: oneDayAgo }
    });

    let dailyImageCount = 0;
    for (const msg of userMessages) {
      if (msg.files && msg.files.length > 0) {
        for (const f of msg.files) {
          if (getDocumentType(f.originalName, f.mimeType) === 'image') {
            dailyImageCount++;
          }
        }
      } else if (msg.image && msg.image.url) {
        dailyImageCount++;
      }
    }

    if ((dailyImageCount + incomingImages.length) > 2) {
      return res.status(400).json({
        error: `Daily limit reached. You can only upload up to 2 images per day. (You have already uploaded ${dailyImageCount} today)`
      });
    }
  }

  let ctx;
  try {
    ctx = await prepareMessageContext({ message, sessionId, model, language, contextLimit, incomingHistory, userId });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    throw err;
  }

  const { cleanMessage, sid, history, isFirstMessage, preferredModelName } = ctx;

  // ── Phase 5: Inject user memories into system context ──────────────────────
  const memoryContext = await getUserMemoriesForPrompt(userId.toString(), cleanMessage);

  // Build RAG + web search context
  const extraContext = await buildContext({
    message: cleanMessage,
    sessionId,
    userId: userId.toString(),
    isRagSession: isRagSession !== false,
    history,
  });

  // Prepend memory + RAG context to message
  const contextParts = [memoryContext, extraContext].filter(Boolean);
  const enrichedMessage = contextParts.length > 0
    ? `${contextParts.join('\n\n')}\n\nUser Question: ${cleanMessage}`
    : cleanMessage;

  messagesSentTotal.inc();

  // Convert uploaded images to base64 parts for the Gemini API
  const images = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) === 'image');
  const imageParts = [];
  if (images.length > 0) {
    for (const img of images) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) {
          logger.error('Failed to download image for Gemini prompt', { url: img.url });
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = response.headers.get("content-type") || img.mimeType || "image/png";
        imageParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType
          }
        });
      } catch (err) {
        logger.error('Error fetching image for Gemini prompt', { url: img.url, error: err.message });
      }
    }
  }

  const { result: reply, modelUsed } = await withFallback(
    (m) => {
      const activeHistory = m !== preferredModelName ? history.slice(-6) : history;
      return geminiService.generateReply({
        message: enrichedMessage,
        history: activeHistory,
        model: m,
        language,
        imageParts
      });
    },
    preferredModelName
  );

  modelUsageTotal.inc({ model: modelUsed });

  let generatedName = null;
  const currentSession = await SessionStore.getSession(sid, userId);
  if (isFirstMessage && currentSession && (currentSession.name === "New Chat" || currentSession.name === "New chat")) {
    generatedName = await generateSessionName(cleanMessage, reply);
    await SessionStore.updateSessionName(sid, userId, generatedName);
  }

  const time = getTimeString();

  const nonImages = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) !== 'image');

  await SessionStore.addMessage(sid, userId, {
    id: crypto.randomUUID(),
    sender: "user",
    message: cleanMessage,
    image: images[0] || undefined,
    file: nonImages[0] || undefined,
    files: filesArray,
    time
  });

  await SessionStore.addMessage(sid, userId, {
    id: crypto.randomUUID(),
    sender: "robot",
    message: reply,
    time,
    model: modelUsed
  });

  // ── Phase 5: Fire-and-forget memory extraction ──────────────────────────────
  if (cleanMessage.length > 20) {
    extractAndSaveMemories({
      userId:      userId.toString(),
      userMessage: cleanMessage,
      sessionId,
    });
  }

  res.json({ reply, model: modelUsed, sessionName: generatedName });
});

export const sendStream = asyncHandler(async (req, res) => {
  const { message, sessionId, model, language, contextLimit, history: incomingHistory, isRagSession, file, files } = req.body;
  const userId = req.user.id;

  // ── Limit 1: User can upload only 2 files in one message ────────────────────
  const filesArray = files && Array.isArray(files) ? files : (file ? [file] : []);
  if (filesArray.length > 2) {
    return res.status(400).json({
      error: 'You can only upload up to 2 files per message.'
    });
  }

  // ── Limit 2: Daily limit of 2 files of each document type ────────────────────
  const incomingImages = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) === 'image');
  if (incomingImages.length > 0) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userMessages = await Message.find({
      userId,
      createdAt: { $gte: oneDayAgo }
    });

    let dailyImageCount = 0;
    for (const msg of userMessages) {
      if (msg.files && msg.files.length > 0) {
        for (const f of msg.files) {
          if (getDocumentType(f.originalName, f.mimeType) === 'image') {
            dailyImageCount++;
          }
        }
      } else if (msg.image && msg.image.url) {
        dailyImageCount++;
      }
    }

    if ((dailyImageCount + incomingImages.length) > 2) {
      return res.status(400).json({
        error: `Daily limit reached. You can only upload up to 2 images per day. (You have already uploaded ${dailyImageCount} today)`
      });
    }
  }

  let ctx;
  try {
    ctx = await prepareMessageContext({ message, sessionId, model, language, contextLimit, incomingHistory, userId });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ error: err.message });
    throw err;
  }

  const { cleanMessage, sid, history, isFirstMessage, preferredModelName } = ctx;

  // ── Phase 5: Inject user memories into system context ──────────────────────
  const memoryContext = await getUserMemoriesForPrompt(userId.toString(), cleanMessage);

  // Build RAG + web search context
  const extraContext = await buildContext({
    message: cleanMessage,
    sessionId,
    userId: userId.toString(),
    isRagSession: isRagSession !== false,
  });

  // Prepend memory + RAG context to message
  const contextParts = [memoryContext, extraContext].filter(Boolean);
  const enrichedMessage = contextParts.length > 0
    ? `${contextParts.join('\n\n')}\n\nUser Question: ${cleanMessage}`
    : cleanMessage;

  activeStreams.inc();
  messagesSentTotal.inc();

  // Convert uploaded images to base64 parts for the Gemini API
  const images = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) === 'image');
  const imageParts = [];
  if (images.length > 0) {
    for (const img of images) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) {
          logger.error('Failed to download image for Gemini prompt', { url: img.url });
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = response.headers.get("content-type") || img.mimeType || "image/png";
        imageParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType
          }
        });
      } catch (err) {
        logger.error('Error fetching image for Gemini prompt', { url: img.url, error: err.message });
      }
    }
  }

  let streamModelUsed = preferredModelName;

  try {
    const { result: streamIterable, modelUsed } = await withFallback(
      (m) => {
        // If falling back, trim history to reduce context window load
        const activeHistory = m !== preferredModelName ? history.slice(-6) : history;
        return geminiService.generateStream({
          message: enrichedMessage,
          history: activeHistory,
          model: m,
          language,
          imageParts
        });
      },
      preferredModelName
    );

    streamModelUsed = modelUsed;
    modelUsageTotal.inc({ model: modelUsed });

    const time = getTimeString();
    const nonImages = filesArray.filter(f => getDocumentType(f.originalName, f.mimeType) !== 'image');

    await SessionStore.addMessage(sid, userId, {
      id: crypto.randomUUID(),
      sender: "user",
      message: cleanMessage,
      image: images[0] || undefined,
      file: nonImages[0] || undefined,
      files: filesArray,
      time
    });

    await handleSSEStream({
      req,
      res,
      streamIterable,
      initialPayload: { model: modelUsed },
      onComplete: async (completeReply, isAborted) => {
        const finalReply = isAborted ? completeReply + " (Generation stopped)" : completeReply;
        if (finalReply.trim() !== "") {
          await SessionStore.addMessage(sid, userId, {
            id: crypto.randomUUID(),
            sender: "robot",
            message: finalReply,
            time,
            model: modelUsed
          });

          const currentSession = await SessionStore.getSession(sid, userId);
          if (isFirstMessage && currentSession && (currentSession.name === "New Chat" || currentSession.name === "New chat")) {
            const name = await generateSessionName(cleanMessage, finalReply);
            await SessionStore.updateSessionName(sid, userId, name);
            res.write(`event: session_name\ndata: ${name}\n\n`);
          }

          // ── Phase 5: Fire-and-forget memory extraction ────────────────────
          if (cleanMessage.length > 20) {
            extractAndSaveMemories({
              userId:      userId.toString(),
              userMessage: cleanMessage,
              sessionId,
            });
          }
        }
      },
      onError: async (error) => {
        if (!res.writableEnded) {
          const errPayload = {
            error: error.status === 503
              ? "AI is experiencing high demand right now. Switching to backup model automatically..."
              : error.status === 429
                ? "Too many messages. Please wait."
                : "Failed to get a response. Please try again.",
            details: error.message,
            status: error.status || 500
          };
          res.write(`data: ${JSON.stringify(errPayload)}\n\n`);
        }
      }
    });
  } finally {
    activeStreams.dec();
  }
});

export const sendVision = asyncHandler(async (req, res) => {
  const { message, sessionId, model, history: incomingHistory, imageUrl } = req.body;
  const userId = req.user.id;

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required." });
  }

  const cleanMessage = sanitizeText(message);
  if (!cleanMessage) {
    return res.status(400).json({ error: "Message content cannot be empty." });
  }

  if (incomingHistory !== undefined) {
    let parsedHistory = [];
    try {
      parsedHistory = typeof incomingHistory === "string" ? JSON.parse(incomingHistory) : incomingHistory;
    } catch { /* ignore */ }
    if (Array.isArray(parsedHistory)) {
      await SessionStore.setMessages(sessionId, userId, parsedHistory);
    }
  }

  const sessionExists = await SessionStore.sessionExists(sessionId, userId);
  const existingMessages = await SessionStore.getMessages(sessionId, userId);
  const isFirstMessage = !sessionExists || existingMessages.length === 0;
  if (!sessionExists) {
    await SessionStore.createSession(sessionId, userId, "New Chat");
  }

  const preferredModelName = model || DEFAULT_MODEL;
  const { result: visionResult, modelUsed } = await withFallback(
    (m) => processVisionMessage({
      message: cleanMessage,
      imageUrl,
      model: m
    }),
    preferredModelName
  );
  const { reply } = visionResult;

  const time = getTimeString();

  await SessionStore.addMessage(sessionId, userId, {
    id: crypto.randomUUID(),
    sender: "user",
    message: cleanMessage,
    image: imageUrl ? { url: imageUrl } : undefined,
    time
  });

  await SessionStore.addMessage(sessionId, userId, {
    id: crypto.randomUUID(),
    sender: "robot",
    message: reply,
    time,
    model: modelUsed
  });

  let generatedName = null;
  const currentSession = await SessionStore.getSession(sessionId, userId);
  if (isFirstMessage && currentSession && (currentSession.name === "New Chat" || currentSession.name === "New chat")) {
    generatedName = await generateSessionName(cleanMessage, reply);
    await SessionStore.updateSessionName(sessionId, userId, generatedName);
  }

  res.json({ reply, model: modelUsed, sessionName: generatedName });
});

export const getTelemetry = asyncHandler(async (req, res) => {
  const { telemetry, totalRequests, fallbackRequests } = getTelemetryStatus();
  const cooldowns = getCooldownStatus();

  res.json({
    success: true,
    telemetry,
    global: {
      totalRequests,
      fallbackRequests,
      fallbackRate: totalRequests > 0 ? `${((fallbackRequests / totalRequests) * 100).toFixed(2)}%` : "0.00%"
    },
    cooldowns
  });
});