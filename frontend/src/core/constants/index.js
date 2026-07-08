// NovaMind — frontend/src/constants/index.js — Bug Fix Pass

export const LANGUAGES = ["English", "Urdu", "Arabic", "French", "Spanish", "German"];

export const MODELS = [
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    badge: "Latest",
    description: "Most intelligent, best responses",
    rpd: "1500 req/day",
    color: "var(--accent)"
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    badge: "Recommended",
    description: "Fast, stable, highest quota",
    rpd: "1500 req/day",
    color: "#10b981"
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3.0 Flash Preview",
    badge: "Preview",
    description: "Frontier performance, experimental",
    rpd: "10 req/min",
    color: "#6366f1"
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    badge: "Powerful",
    description: "Highest intelligence, complex tasks",
    rpd: "500 req/day",
    color: "#8b5cf6"
  }
];

export const STORAGE_KEYS = {
  THEME: "chat_theme",
  SESSIONS: "sessions_list",
  PINNED: "pinned_messages",
  MESSAGES: "sessions_messages",

  CONTEXT_LIMIT: "context_limit",
  LANGUAGE: "selected_language",
  MODEL: "novamind-model"
};
