// NovaMind — frontend/src/hooks/useLocalStorage.js

import { useState, useEffect } from "react";

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      const cleanStringified = JSON.stringify(value, (k, v) =>
        k === "isStreaming" ? undefined : v
      );
      localStorage.setItem(key, cleanStringified);
    } catch {
      // quota exceeded or storage disabled
    }
  }, [key, value]);

  return [value, setValue];
};
export default useLocalStorage;
