// NovaMind — frontend/src/hooks/useMessages.js

import { useLocalStorage } from "../../../core/hooks/useLocalStorage.js";
import { STORAGE_KEYS } from "../../../core/constants/index.js";

export function useMessages() {
  const [chatMessages, setChatMessages] = useLocalStorage(STORAGE_KEYS.MESSAGES, {});

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
