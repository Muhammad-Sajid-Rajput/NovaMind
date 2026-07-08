// NovaMind — VersionNavigator.jsx
// Shows < 1/2 > arrows below edited user messages

import React from "react";

const VersionNavigator = ({ 
  message, 
  onNavigate  // (messageId, newIndex) => void
}) => {
  const { versions, currentVersionIndex } = message;
  
  if (!versions || versions.length <= 1) return null;

  const total = versions.length;
  const current = currentVersionIndex + 1; // 1-based for display
  const isFirst = currentVersionIndex === 0;
  const isLast = currentVersionIndex === total - 1;

  return (
    <div className="version-nav flex items-center gap-1 justify-end mt-1 select-none">
      <button
        onClick={() => !isFirst && onNavigate(message.id, currentVersionIndex - 1)}
        disabled={isFirst}
        className={`version-btn ${isFirst ? "opacity-30 cursor-not-allowed" : "hover:text-text-primary cursor-pointer"}`}
        aria-label="Previous version"
      >
        &lt;
      </button>
      
      <span className="text-xs text-text-muted font-mono select-none">
        {current} / {total}
      </span>
      
      <button
        onClick={() => !isLast && onNavigate(message.id, currentVersionIndex + 1)}
        disabled={isLast}
        className={`version-btn ${isLast ? "opacity-30 cursor-not-allowed" : "hover:text-text-primary cursor-pointer"}`}
        aria-label="Next version"
      >
        &gt;
      </button>
    </div>
  );
};

export default VersionNavigator;
