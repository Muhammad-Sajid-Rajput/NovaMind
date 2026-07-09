// NovaMind — MessageActions.jsx — File Upload Bug Fix
import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";

const MODELS_LABELS = {
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
  "gemini-3-flash-preview": "Gemini 3.0 Flash Preview",
  "gemini-2.5-flash": "Gemini 2.5 Flash"
};

function MessageActions({
  id,
  message,
  sender,
  time,
  isLastBotMessage,
  onRegenerate,
  model,
  isTouched
}) {
  const {
    setChatMessages,
    currentSessionId,
    setEditingMessageId
  } = useChatContext();

  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isTtsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const isUser = sender === "user";

  useEffect(() => {
    return () => {
      if (isTtsSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isTtsSupported]);

  const handleCopy = useCallback(() => {
    if (copied) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  }, [message, copied]);

  const stripMarkdown = useCallback((text) => {
    return text
      .replace(/`{3,}[\s\S]*?`{3,}/g, "")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^[#\s]+(.*)$/gm, "$1")
      .replace(/^[>\s]+(.*)$/gm, "$1")
      .replace(/[\[\]\(\)]/g, "");
  }, []);

  const handleSpeak = useCallback(() => {
    if (!isTtsSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = stripMarkdown(message);
      if (!cleanText.trim()) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [isTtsSupported, isSpeaking, message, stripMarkdown]);



  if (isUser) {
    return (
      <div className="flex items-center gap-3.5 mt-1.5 text-xs text-text-muted select-none px-1 h-5">
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${
          isTouched 
            ? "opacity-100" 
            : "opacity-0 md:group-hover:opacity-100 focus-within:opacity-100"
        }`}>
          <button
            className="bg-transparent border-none text-text-secondary hover:text-primary cursor-pointer p-0.5 rounded transition-all text-lg flex items-center justify-center relative focus:ring-1 focus:ring-primary focus:outline-none"
            onClick={handleCopy}
            disabled={copied}
            style={{ cursor: copied ? "not-allowed" : "pointer" }}
            title="Copy message"
            aria-label="Copy message text"
          >
            <Icon icon={copied ? "material-symbols:check-rounded" : "material-symbols:content-copy-outline"} />
            {copied && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 bg-surface border border-border text-text-primary p-1 px-2 text-[10px] rounded whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
                Copied!
              </span>
            )}
          </button>

          <button
            className="bg-transparent border-none text-text-secondary hover:text-primary cursor-pointer p-0.5 rounded transition-all text-lg flex items-center justify-center focus:ring-1 focus:ring-primary focus:outline-none"
            onClick={() => setEditingMessageId(id)}
            title="Edit message"
            aria-label="Edit message"
          >
            <Icon icon="material-symbols:edit-outline" />
          </button>
        </div>
        <span>{time}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 mt-2 text-xs text-text-muted select-none h-5">
      <span className="font-sans">
        {time || "just now"}
        {model ? ` · ${MODELS_LABELS[model] || model}` : ""}
      </span>

      <div className={`flex items-center gap-2 transition-opacity duration-200 ${
        isTouched 
          ? "opacity-100" 
          : "opacity-0 md:group-hover:opacity-100 focus-within:opacity-100"
      }`}>
        <button
          className="bg-transparent border-none text-text-secondary hover:text-primary cursor-pointer p-0.5 rounded transition-all text-lg flex items-center justify-center relative focus:ring-1 focus:ring-primary focus:outline-none"
          onClick={handleCopy}
          disabled={copied}
          style={{ cursor: copied ? "not-allowed" : "pointer" }}
          title="Copy response"
          aria-label="Copy response text"
        >
          <Icon icon={copied ? "material-symbols:check-rounded" : "material-symbols:content-copy-outline"} />
          {copied && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 bg-surface border border-border text-text-primary p-1 px-2 text-[10px] rounded whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
              Copied!
            </span>
          )}
        </button>

        {isTtsSupported && (
          <button
            className={`bg-transparent border-none text-text-secondary hover:text-primary cursor-pointer p-0.5 rounded transition-all text-lg flex items-center justify-center focus:ring-1 focus:ring-primary focus:outline-none ${isSpeaking ? "text-primary scale-110 animate-bounce" : ""
              }`}
            onClick={handleSpeak}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
            aria-label={isSpeaking ? "Stop reading response" : "Read response aloud"}
          >
            <Icon icon={isSpeaking ? "material-symbols:volume-up" : "material-symbols:volume-up-outline"} />
          </button>
        )}

        {isLastBotMessage && onRegenerate && (
          <button
            className="bg-transparent border-none text-text-secondary hover:text-primary cursor-pointer p-0.5 rounded transition-all text-lg flex items-center justify-center focus:ring-1 focus:ring-primary focus:outline-none"
            onClick={onRegenerate}
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <Icon icon="material-symbols:refresh" />
          </button>
        )}
      </div>
    </div>
  );
}

export default MessageActions;
