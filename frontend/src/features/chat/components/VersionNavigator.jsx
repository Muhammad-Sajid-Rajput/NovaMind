// NovaMind — VersionNavigator.jsx
// Shows < 1/2 > arrows below edited user messages

import React from "react";

const VersionNavigator = ({ 
  message, 
  onNavigate  // (messageId, targetChildId) => void
}) => {
  const { versionInfo } = message;
  
  if (!versionInfo || !versionInfo.siblingIds || versionInfo.siblingIds.length <= 1) return null;

  const total = versionInfo.siblingIds.length;
  const current = versionInfo.currentIndex + 1; // 1-based for display
  const isFirst = versionInfo.currentIndex === 0;
  const isLast = versionInfo.currentIndex === total - 1;

  const handlePrev = () => {
    if (!isFirst) {
      const prevSiblingId = versionInfo.siblingIds[versionInfo.currentIndex - 1];
      onNavigate(message.id || message._id, prevSiblingId);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      const nextSiblingId = versionInfo.siblingIds[versionInfo.currentIndex + 1];
      onNavigate(message.id || message._id, nextSiblingId);
    }
  };

  return (
    <div className="version-nav flex items-center gap-1 justify-end mt-1 select-none">
      <button
        onClick={handlePrev}
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
        onClick={handleNext}
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
