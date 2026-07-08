// NovaMind — frontend/src/features/sessions/hooks/useSessions.js — Filter Empty Chats Pass
import { useState, useEffect } from "react";
import { useLocalStorage } from "../../../core/hooks/useLocalStorage.js";
import { STORAGE_KEYS } from "../../../core/constants/index.js";
import { api } from "../../../config/api.js";

export function useSessions(setChatMessages, chatMessages) {
  const [sessionsList, setSessionsList] = useLocalStorage(STORAGE_KEYS.SESSIONS, []);
  const [sessionDrafts, setSessionDrafts] = useLocalStorage("sessions_drafts", {});
  const [currentSessionId, rawSetCurrentSessionId] = useState(() => {
    // sessionStorage survives F5 but is wiped on tab close / new tab.
    // If "tab_active" is absent → new tab open → clear saved session → welcome screen.
    // If "tab_active" is present → page refresh → restore last session as-is.
    const isNewTab = !sessionStorage.getItem("tab_active");
    if (isNewTab) {
      localStorage.removeItem("current_session_id");
    }
    sessionStorage.setItem("tab_active", "1");
    return localStorage.getItem("current_session_id") || "";
  });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem("current_session_id", currentSessionId);
    } else {
      localStorage.removeItem("current_session_id");
    }
  }, [currentSessionId]);

  // Sync messages from backend when currentSessionId changes
  useEffect(() => {
    if (!currentSessionId) return;

    async function syncMessages() {
      // Only sync if the session is saved in the database
      const isSaved = sessionsList.some((s) => s.id === currentSessionId);
      if (!isSaved) return;

      try {
        const data = await api.messages.get(currentSessionId);
        if (data && data.messages) {
          setChatMessages((prev) => {
            const localMsgs = prev[currentSessionId] || [];
            // Preserve optimistic local messages if server hasn't saved them yet
            if (data.messages.length === 0 && localMsgs.length > 0) {
              return prev;
            }
            const localById = new Map(localMsgs.map((msg) => [msg.id, msg]));
            const normalized = data.messages.map((m) => {
              const id = m.id || m._id;
              const local = localById.get(id);
              return {
                ...local,
                ...m,
                id,
                image: m.image ?? local?.image ?? null,
                file: m.file ?? local?.file ?? null,
              };
            });
            return {
              ...prev,
              [currentSessionId]: normalized
            };
          });
        }
      } catch (err) {
        console.error("Failed to sync messages from server:", err);
      }
    }

    syncMessages();
  }, [currentSessionId, setChatMessages]);

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await api.sessions.list();
        if (data.sessions) {
          // Keep backend sessions, or keep local sessions that have messages/drafts if backend is empty (server restart)
          const activeSessions = data.sessions.length > 0 
            ? data.sessions 
            : sessionsList.filter((s) => (chatMessages[s.id] && chatMessages[s.id].length > 0) || sessionDrafts[s.id]);

          setSessionsList(activeSessions);

          const currentMessages = chatMessages[currentSessionId] || [];
          const isEmpty = currentMessages.length === 0;

          const exists = activeSessions.some((s) => s.id === currentSessionId);
          if (!currentSessionId) {
            // Fresh login: no saved session → land on welcome screen with a new local draft
            rawSetCurrentSessionId(crypto.randomUUID());
          } else if (!exists && !isEmpty) {
            if (activeSessions.length > 0) {
              // Saved ID no longer exists on server (e.g. deleted) → pick first session
              rawSetCurrentSessionId(activeSessions[0].id);
            } else {
              // Saved ID no longer exists on server, and server is empty → create new empty session
              rawSetCurrentSessionId(crypto.randomUUID());
            }
          }
        }
      } catch (err) {
        console.error("Error loading sessions from server:", err);
        if (sessionsList.length === 0 && !currentSessionId) {
          const localId = crypto.randomUUID();
          rawSetCurrentSessionId(localId);
        }
      }
    }
    loadSessions();
  }, []);

  const setCurrentSessionId = (newId) => {
    if (newId === currentSessionId) return;

    // Save draft of the old session before switching
    if (currentSessionId) {
      const textarea = document.querySelector(".chat-textarea");
      const currentInputVal = textarea ? textarea.value : "";
      setSessionDrafts((prev) => ({
        ...prev,
        [currentSessionId]: currentInputVal
      }));
    }

    rawSetCurrentSessionId(newId);
  };

  const createNewSession = async (customName = "New Chat") => {
    const textarea = document.querySelector(".chat-textarea");
    const currentInputVal = textarea ? textarea.value : "";

    // If the current session is already completely empty and has no draft, just reuse it
    if (currentSessionId) {
      const currentMessages = chatMessages[currentSessionId] || [];
      const isSessionInDb = sessionsList.some((s) => s.id === currentSessionId);
      const draft = sessionDrafts[currentSessionId] || currentInputVal || "";

      if (currentMessages.length === 0 && !isSessionInDb && !draft.trim()) {
        if (textarea) {
          textarea.focus();
        }
        return currentSessionId;
      }
    }

    const localId = crypto.randomUUID();
    rawSetCurrentSessionId(localId);

    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }

    return localId;
  };

  const deleteSession = async (id, e) => {
    if (e) e.stopPropagation();

    // Optimistically remove from UI immediately
    const remaining = sessionsList.filter((s) => s.id !== id);
    setSessionsList(remaining);

    if (setChatMessages) {
      setChatMessages((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }

    // Delete draft from sessionDrafts
    setSessionDrafts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    if (currentSessionId === id) {
      if (remaining.length > 0) {
        rawSetCurrentSessionId(remaining[0].id);
      } else {
        createNewSession("First Chat");
      }
    }

    // Fire-and-forget backend deletion
    try {
      await api.sessions.delete(id);
    } catch (err) {
      console.error("Failed to delete session on server:", err);
    }
  };

  const startRename = (id, name, e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(id);
    setEditingName(name);
  };

  const saveRename = async (id) => {
    if (!editingName.trim()) {
      setEditingSessionId(null);
      return;
    }
    const safeName = editingName.trim().substring(0, 50);

    try {
      await api.sessions.rename(id, safeName);
    } catch (err) {
      console.error("Failed to rename session on server:", err);
    }

    setSessionsList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: safeName } : s))
    );
    setEditingSessionId(null);
  };

  const handleSessionNamed = (sessionId, name) => {
    setSessionsList((prev) => {
      const exists = prev.some((s) => s.id === sessionId);
      if (exists) {
        return prev.map((s) => (s.id === sessionId ? { ...s, name } : s));
      } else {
        const newSession = {
          id: sessionId,
          name: name || "New Chat",
          createdAt: new Date().toISOString()
        };
        return [newSession, ...prev];
      }
    });
  };

  const clearAllSessions = async () => {
    if (sessionsList.length === 0) return;

    try {
      await api.sessions.clearAll();
    } catch (err) {
      console.error("Failed to clear all sessions on server:", err);
    }

    setSessionsList([]);
    setSessionDrafts({});
    if (setChatMessages) {
      setChatMessages({});
    }

    await createNewSession("First Chat");
  };

  // Filter visible sessions for the sidebar list (show only with messages or drafts)
  const visibleSessions = sessionsList.filter((s) => {
    const messages = chatMessages[s.id] || [];
    const draft = sessionDrafts[s.id] || "";
    return messages.length > 0 || draft.trim().length > 0 || (s.messageCount && s.messageCount > 0);
  });

  return {
    sessionsList: visibleSessions,
    setSessionsList,
    currentSessionId,
    setCurrentSessionId,
    editingSessionId,
    setEditingSessionId,
    editingName,
    setEditingName,
    createNewSession,
    deleteSession,
    startRename,
    saveRename,
    handleSessionNamed,
    clearAllSessions,
    sessionDrafts,
    setSessionDrafts
  };
}

export default useSessions;
