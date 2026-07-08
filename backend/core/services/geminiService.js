// NovaMind — backend/services/geminiService.js
// All Gemini calls now go through getModel() which pulls from the rotating key pool.
// reportSuccess / reportFailure are called after every request so the key manager
// can advance the round-robin cursor and apply per-key cooldowns on failure.

import { getModel } from "../config/gemini.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";
import { logger } from "../utils/logger.js";

// ─── History formatter ────────────────────────────────────────────────────────
function formatGeminiHistory(messages) {
  const history = [];
  for (const msg of messages) {
    if (msg.sender !== "user" && msg.sender !== "robot" && msg.sender !== "bot") continue;
    const role = msg.sender === "user" ? "user" : "model";
    const text = msg.message || "";
    // Skip empty, loading, or error messages — they must never reach Gemini context
    if (!text.trim() || text === "__LOADING__" || msg.isError) continue;

    if (history.length > 0 && history[history.length - 1].role === role) {
      // Merge consecutive same-role messages (shouldn't normally happen, but be safe)
      history[history.length - 1].parts[0].text += "\n" + text;
    } else {
      history.push({ role, parts: [{ text }] });
    }
  }

  // Gemini requires history to ALWAYS start with role 'user'.
  // If a context-window slice starts on a model message, drop entries
  // from the front until we hit a user message.
  while (history.length > 0 && history[0].role !== "user") {
    history.shift();
  }

  // Gemini also requires history to alternate strictly user/model.
  // If after trimming we still have consecutive same roles, clean them up.
  const validated = [];
  for (const entry of history) {
    if (validated.length > 0 && validated[validated.length - 1].role === entry.role) {
      validated[validated.length - 1].parts[0].text += "\n" + entry.parts[0].text;
    } else {
      validated.push(entry);
    }
  }

  return validated;
}

// ─── System instruction builder ───────────────────────────────────────────────
const formatSystemInstruction = (prompt) => {
  if (!prompt) return undefined;
  if (typeof prompt === "string") return { parts: [{ text: prompt }] };
  return prompt;
};

// ─── Language instruction builder ─────────────────────────────────────────────
function buildLanguageInstruction(language) {
  if (!language) return "";

  if (language.toLowerCase() === "english") {
    return [
      "Detect the language the user is writing in and always reply in that same language and script.",
      "If the user writes in Urdu (Nastaliq script), reply in Urdu.",
      "If the user writes in Hindi (Devanagari script), reply in Hindi.",
      "If the user writes in Roman Urdu or Roman Hindi (Urdu/Hindi words written in Latin letters), reply in the same Roman script.",
      "If the user writes in English, reply in English.",
      "Match the user's language exactly — never switch to a different language or script unless the user does.",
    ].join(" ");
  }

  return `Always respond in ${language}. If the user writes in a different language, still respond in ${language}.`;
}

// ─── Shared system prompt builder ─────────────────────────────────────────────
function buildSystemInstruction(language) {
  const langInstruction = buildLanguageInstruction(language);
  const systemCorrection = `
Important:
Respond only according to the user's request.
Do not introduce programming topics unless the user specifically asks about programming.
Do NOT force personal references or relate every answer to the user's background unless they specifically ask or it is clearly relevant.
`;
  const combined = [SYSTEM_PROMPT, langInstruction, systemCorrection]
    .filter(Boolean)
    .join("\n");
  return formatSystemInstruction(combined);
}

// ─── generateReply (non-streaming) ───────────────────────────────────────────
export const generateReply = async ({ message, history, model, language, imageParts = [] }) => {
  const systemInstruction = buildSystemInstruction(language);
  const { model: modelInstance, reportSuccess, reportFailure } = getModel(model, systemInstruction);
  const formattedHistory = formatGeminiHistory(history || []);

  try {
    const chat = modelInstance.startChat({ history: formattedHistory });
    const content = imageParts.length > 0 ? [message, ...imageParts] : message;
    const result = await chat.sendMessage(content);
    reportSuccess();
    return result.response.text();
  } catch (err) {
    reportFailure(err);
    throw err;
  }
};

// ─── generateStream (SSE streaming) ──────────────────────────────────────────
export const generateStream = async ({ message, history, model, language, imageParts = [] }) => {
  const systemInstruction = buildSystemInstruction(language);
  const { model: modelInstance, reportSuccess, reportFailure } = getModel(model, systemInstruction);
  const formattedHistory = formatGeminiHistory(history || []);

  try {
    const chat = modelInstance.startChat({ history: formattedHistory });
    const content = imageParts.length > 0 ? [message, ...imageParts] : message;
    const resultStream = await chat.sendMessageStream(content);
    // Report success once the stream is initiated (first chunk received)
    reportSuccess();
    return resultStream;
  } catch (err) {
    reportFailure(err);
    throw err;
  }
};

// ─── generateVisionReply (image + text) ──────────────────────────────────────
export const generateVisionReply = async ({ message, imageBase64, mimeType, model }) => {
  const { model: modelInstance, reportSuccess, reportFailure } = getModel(model);
  const imagePart = { inlineData: { data: imageBase64, mimeType } };

  try {
    const result = await modelInstance.generateContent([message, imagePart]);
    reportSuccess();
    return result.response.text();
  } catch (err) {
    reportFailure(err);
    throw err;
  }
};
