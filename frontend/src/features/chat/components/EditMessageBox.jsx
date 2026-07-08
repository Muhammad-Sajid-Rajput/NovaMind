// NovaMind — EditMessageBox.jsx
// Inline edit box that replaces a user message bubble

import { useState, useRef, useEffect } from "react";

const EditMessageBox = ({ originalText, onSubmit, onCancel }) => {
  const [text, setText] = useState(originalText);
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
      if (text.trim() && text.trim() !== originalText.trim()) {
        onSubmit(text.trim());
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const isUnchanged = text.trim() === originalText.trim();
  const isEmpty = text.trim() === "";

  return (
    <div className="edit-message-box w-full max-w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="edit-textarea scrollbar-thin select-text"
        rows={1}
        aria-label="Edit message input"
      />
      <div className="flex justify-end gap-2 mt-2 select-none">
        <button onClick={onCancel} className="edit-cancel-btn">
          Cancel
        </button>
        <button
          onClick={() => onSubmit(text.trim())}
          disabled={isEmpty || isUnchanged}
          className="edit-submit-btn"
        >
          Save & Submit
        </button>
      </div>
    </div>
  );
};

export default EditMessageBox;
