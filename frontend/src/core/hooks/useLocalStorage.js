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

  // Listen for storage changes from other browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== key) return;
      try {
        const newValue = e.newValue ? JSON.parse(e.newValue) : defaultValue;
        setValue(newValue);
      } catch {
        // ignore JSON parse error from malformed storage write
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, defaultValue]);

  return [value, setValue];
};
export default useLocalStorage;
