// NovaMind — frontend/src/core/hooks/useCopyToClipboard.js
// Shared hook for copying text to clipboard with feedback timer.

import { useState, useCallback } from "react";

export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, [resetDelay]);

  return [copied, copy];
}
