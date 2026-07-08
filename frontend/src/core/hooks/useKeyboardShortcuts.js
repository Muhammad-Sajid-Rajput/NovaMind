// NovaMind — frontend/src/hooks/useKeyboardShortcuts.js

import { useEffect } from "react";
import { useChatContext } from "../../features/chat/context/ChatContext.jsx";

export function useKeyboardShortcuts() {
  const {
    createNewSession,
    clearAllSessions,
    toggleFullscreen,
    setIsShortcutsOpen,
    setIsSettingsOpen,
    setIsSearchOpen,
    setIsSidebarOpen,
    currentSessionId
  } = useChatContext();

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      if (e.key === "?" && !isInputFocused) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      if (e.ctrlKey) {
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          createNewSession();
        }
        if (e.key === "/") {
          e.preventDefault();
          document.querySelector(".chat-textarea")?.focus();
        }
        if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          if (confirm("Are you sure you want to clear all chats?")) {
            clearAllSessions();
          }
        }
        if (e.key.toLowerCase() === "f") {
          if (e.shiftKey) {
            e.preventDefault();
            toggleFullscreen();
          } else {
            e.preventDefault();
            setIsSearchOpen((prev) => !prev);
            setTimeout(() => {
              document.querySelector(".search-bar-input")?.focus();
            }, 100);
          }
        }
      }

      if (e.key === "Escape") {
        setIsShortcutsOpen(false);
        setIsSettingsOpen(false);
        setIsSearchOpen(false);
        if (window.innerWidth <= 768) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [
    createNewSession,
    clearAllSessions,
    toggleFullscreen,
    setIsShortcutsOpen,
    setIsSettingsOpen,
    setIsSearchOpen,
    setIsSidebarOpen,
    currentSessionId
  ]);
}
export default useKeyboardShortcuts;
