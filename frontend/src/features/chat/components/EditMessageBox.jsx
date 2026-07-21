// NovaMind — EditMessageBox.jsx
// Inline edit box that replaces a user message bubble

import { useState, useRef, useEffect } from "react";

const EditMessageBox = ({ originalText, onSubmit, onCancel, initialWidth }) => {
  const [text, setText] = useState(originalText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  // Auto-focus and select all on mount
  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && text.trim() && text.trim() !== originalText.trim()) {
        setIsSubmitting(true);
        onSubmit(text.trim());
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSubmitClick = () => {
    if (isSubmitting || isEmpty || isUnchanged) return;
    setIsSubmitting(true);
    onSubmit(text.trim());
  };

  const isUnchanged = text.trim() === originalText.trim();
  const isEmpty = text.trim() === "";

  return (
    <div className="edit-message-box w-full max-w-full flex flex-col gap-2 items-end">
      <div 
        className="relative p-3.5 px-4 rounded-[18px_18px_4px_18px] bg-user-bubble text-white shadow-xs flex flex-col gap-1.5 transition-all duration-200 w-fit max-w-full min-w-0 self-end overflow-hidden"
        style={{
          minWidth: initialWidth ? `${initialWidth}px` : undefined,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white text-[14.5px] leading-relaxed font-sans border-none outline-none resize-none p-0 m-0 select-text overflow-hidden wrap-break-word focus:ring-0 focus:outline-none"
          rows={1}
          disabled={isSubmitting}
          aria-label="Edit message input"
        />
      </div>
      <div className="flex justify-end gap-2 mt-1 select-none self-end">
        <button onClick={onCancel} className="edit-cancel-btn" disabled={isSubmitting}>
          Cancel
        </button>
        <button
          onClick={handleSubmitClick}
          disabled={isEmpty || isUnchanged || isSubmitting}
          className="edit-submit-btn"
        >
          {isSubmitting ? "Submitting…" : "Save & Submit"}
        </button>
      </div>
    </div>
  );
};

export default EditMessageBox;

