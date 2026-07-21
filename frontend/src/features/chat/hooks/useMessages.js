// NovaMind — frontend/src/hooks/useMessages.js

import { useLocalStorage } from "../../../core/hooks/useLocalStorage.js";
import { STORAGE_KEYS } from "../../../core/constants/index.js";

export function useMessages() {
  const [chatMessages, setRawChatMessages] = useLocalStorage(STORAGE_KEYS.MESSAGES, {});

  const setChatMessages = (updater) => {
    setRawChatMessages((prevReactState) => {
      const nextProposed = typeof updater === "function" ? updater(prevReactState) : updater;

      if (!nextProposed) return nextProposed;

      let diskState = {};
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (stored) diskState = JSON.parse(stored);
      } catch {
        diskState = {};
      }

      // Dev collision detection check
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
        Object.keys(diskState).forEach((sid) => {
          if (
            prevReactState[sid] &&
            JSON.stringify(prevReactState[sid]) !== JSON.stringify(diskState[sid]) &&
            nextProposed[sid] &&
            JSON.stringify(nextProposed[sid]) !== JSON.stringify(diskState[sid])
          ) {
            console.warn(
              `[useMessages] Concurrent session write collision detected for session "${sid}". Preserving disk updates.`
            );
          }
        });
      }

      // Explicit clear / reset handler
      if (Object.keys(nextProposed).length === 0) {
        return {};
      }

      // Merge disk-fresh sessions with proposed tab session updates
      const merged = {
        ...diskState,
        ...nextProposed
      };

      // Reflect session deletions initiated in this tab
      Object.keys(prevReactState).forEach((sid) => {
        if (!(sid in nextProposed)) {
          delete merged[sid];
        }
      });

      return merged;
    });
  };

  const clearCurrentChat = () => {
    setChatMessages({});
  };

  return {
    chatMessages,
    setChatMessages,
    clearCurrentChat
  };
}
export default useMessages;
