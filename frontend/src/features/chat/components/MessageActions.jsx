// NovaMind — MessageActions.jsx — File Upload Bug Fix
import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";
import VersionNavigator from "./VersionNavigator.jsx";

const MODELS_LABELS = {
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash",
  "gemini-3-flash-preview": "Gemini 3.0 Flash",
  "gemini-2.5-flash": "Gemini 2.5 Flash"
};

function formatMessageTime(time, createdAt) {
  if (time && typeof time === "string" && (time.includes("AM") || time.includes("PM") || time.includes(":"))) {
    return time;
  }
  const dateObj = createdAt ? new Date(createdAt) : (time ? new Date(time) : new Date());
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hourCycle: "h12" });
  }
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hourCycle: "h12" });
}

function MessageActions({
  id,
  message,
  sender,
  time,
  createdAt,
  isLastBotMessage,
  onRegenerate,
  model,
  isTouched,
  versionInfo,
  onNavigate
}) {
  const { setEditingMessageId } = useChatContext();

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



  const displayTime = formatMessageTime(time, createdAt);

  if (isUser) {
    return (
      <div className="flex items-center justify-end gap-1 mt-0.5 text-xs text-text-muted select-none">
        <div className={`flex items-center gap-1 transition-opacity duration-150 ${isTouched
            ? "opacity-100"
            : "opacity-0 md:group-hover:opacity-100 focus-within:opacity-100"
          }`}>
          <span className="text-[11px] text-text-muted/60 font-sans">{displayTime}</span>
          <div className="flex items-center gap-0.5">
            <button
              className="w-5.5 h-5.5 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded transition-colors duration-150 relative focus:outline-none p-0 m-0"
              onClick={handleCopy}
              disabled={copied}
              style={{ cursor: copied ? "not-allowed" : "pointer" }}
              title="Copy message"
              aria-label="Copy message text"
            >
              <Icon icon={copied ? "material-symbols:check-rounded" : "material-symbols:content-copy-outline"} className="text-[13.5px]" />
              {copied && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 bg-surface border border-border text-text-primary p-1 px-2 text-[10px] rounded whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
                  Copied!
                </span>
              )}
            </button>

            <button
              className="w-5.5 h-5.5 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded transition-colors duration-150 focus:outline-none p-0 m-0"
              onClick={() => setEditingMessageId(id)}
              title="Edit message"
              aria-label="Edit message"
            >
              <Icon icon="material-symbols:edit-outline" className="text-[13.5px]" />
            </button>
          </div>
        </div>

        {versionInfo && (
          <VersionNavigator
            message={{ id, _id: id, versionInfo }}
            onNavigate={onNavigate}
            isTouched={isTouched}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-0.5 text-xs text-text-muted select-none">
      <div className={`flex items-center gap-0.5 transition-opacity duration-150 ${isTouched
          ? "opacity-100"
          : "opacity-0 md:group-hover:opacity-100 focus-within:opacity-100"
        }`}>
        <button
          className="w-5.5 h-5.5 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded transition-colors duration-150 relative focus:outline-none p-0 m-0"
          onClick={handleCopy}
          disabled={copied}
          style={{ cursor: copied ? "not-allowed" : "pointer" }}
          title="Copy response"
          aria-label="Copy response text"
        >
          <Icon icon={copied ? "material-symbols:check-rounded" : "material-symbols:content-copy-outline"} className="text-[13.5px]" />
          {copied && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1.5 bg-surface border border-border text-text-primary p-1 px-2 text-[10px] rounded whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
              Copied!
            </span>
          )}
        </button>

        {isTtsSupported && (
          <button
            className={`w-5.5 h-5.5 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded transition-colors duration-150 focus:outline-none p-0 m-0 ${isSpeaking ? "text-primary scale-110 animate-bounce" : ""
              }`}
            onClick={handleSpeak}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
            aria-label={isSpeaking ? "Stop reading response" : "Read response aloud"}
          >
            <Icon icon={isSpeaking ? "material-symbols:volume-up" : "material-symbols:volume-up-outline"} className="text-[13.5px]" />
          </button>
        )}

        {isLastBotMessage && onRegenerate && (
          <button
            className="w-5.5 h-5.5 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer rounded transition-colors duration-150 focus:outline-none p-0 m-0"
            onClick={onRegenerate}
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <Icon icon="material-symbols:refresh" className="text-[13.5px]" />
          </button>
        )}
      </div>

      {model && (
        <span className={`text-[11px] text-text-muted/60 font-sans transition-opacity duration-150 ${isTouched
            ? "opacity-100"
            : "opacity-0 md:group-hover:opacity-100 focus-within:opacity-100"
          }`}>
          {MODELS_LABELS[model] || model}
        </span>
      )}
    </div>
  );
}

export default MessageActions;
