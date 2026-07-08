// NovaMind — ChatContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import { useSessions } from "../../sessions/hooks/useSessions.js";
import useMessages from "../hooks/useMessages.js";
import { MODELS } from "../../../core/constants/index.js";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const messagesState = useMessages();
  const sessionsState = useSessions(messagesState.setChatMessages, messagesState.chatMessages);

  // central UI layout states
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);

  // central app configuration states
  const [contextLimit, setContextLimit] = useState(
    () => parseInt(localStorage.getItem("context_limit"), 10) || 10
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => localStorage.getItem("selected_language") || "English"
  );
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("novamind-model");
    return MODELS.some((m) => m.id === saved) ? saved : "gemini-3.5-flash";
  });
  const [activeModel, setActiveModel] = useState(() => selectedModel);
  const [modelStatus, setModelStatus] = useState("working");
  const [fallbackUsed, setFallbackUsed] = useState(null);
  const [isStreamEnabled, setIsStreamEnabled] = useState(() => {
    return localStorage.getItem("novamind-stream-enabled") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("novamind-stream-enabled", isStreamEnabled);
  }, [isStreamEnabled]);

  useEffect(() => {
    localStorage.setItem("novamind-model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("context_limit", contextLimit);
  }, [contextLimit]);

  useEffect(() => {
    localStorage.setItem("selected_language", selectedLanguage);
  }, [selectedLanguage]);


  // Listen for model switch events
  useEffect(() => {
    const handleSwitchModel = (e) => {
      if (e.detail && e.detail.modelId) {
        setSelectedModel(e.detail.modelId);
      }
    };
    window.addEventListener("switch-model", handleSwitchModel);
    return () => window.removeEventListener("switch-model", handleSwitchModel);
  }, []);

  // Fullscreen event listeners & handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn("Fullscreen error:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn("Fullscreen exit error:", err));
    }
  }

  const value = {
    ...messagesState,
    ...sessionsState,
    isSidebarOpen,
    setIsSidebarOpen,
    isFooterMenuOpen,
    setIsFooterMenuOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isFullscreen,
    setIsFullscreen,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    editingMessageId,
    setEditingMessageId,
    contextLimit,
    setContextLimit,
    selectedLanguage,
    setSelectedLanguage,
    selectedModel,
    setSelectedModel,
    activeModel,
    setActiveModel,
    modelStatus,
    setModelStatus,
    fallbackUsed,
    setFallbackUsed,
    isStreamEnabled,
    setIsStreamEnabled,
    toggleFullscreen
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
export default ChatContext;
