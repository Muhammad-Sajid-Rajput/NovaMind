// NovaMind — VersionNavigator.jsx
// Shows < 1/2 > arrows below edited user messages

import React from "react";

const VersionNavigator = ({ 
  message, 
  onNavigate // (messageId, targetChildId) => void
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
    <div className="version-nav flex items-center gap-0 select-none opacity-100">
      <button
        onClick={handlePrev}
        disabled={isFirst}
        className={`w-5.5 h-5.5 flex items-center justify-center rounded-md bg-transparent border-none text-[11px] font-sans transition-colors duration-150 focus:outline-none ${
          isFirst 
            ? "text-text-muted/30 cursor-not-allowed" 
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer"
        }`}
        aria-label="Previous version"
      >
        &lt;
      </button>
      
      <span className="text-[10.5px] text-text-muted/80 font-medium select-none px-0.5">
        {current} / {total}
      </span>
      
      <button
        onClick={handleNext}
        disabled={isLast}
        className={`w-5.5 h-5.5 flex items-center justify-center rounded-md bg-transparent border-none text-[11px] font-sans transition-colors duration-150 focus:outline-none ${
          isLast 
            ? "text-text-muted/30 cursor-not-allowed" 
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer"
        }`}
        aria-label="Next version"
      >
        &gt;
      </button>
    </div>
  );
};

export default VersionNavigator;
