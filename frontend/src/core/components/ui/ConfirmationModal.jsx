// NovaMind — ConfirmationModal.jsx — Standardized Popups
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDangerous = false
}) {
  const modalRef = useRef(null);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Content Card */}
      <div 
        ref={modalRef}
        className="relative bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 transform transition-all animate-in zoom-in-95 duration-200 select-none animate-duration-200"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDangerous 
                ? "bg-error/10 text-error" 
                : "bg-warning/10 text-warning"
            }`}
          >
            <Icon 
              icon={isDangerous ? "material-symbols:delete-outline" : "material-symbols:warning-outline"} 
              className="text-xl"
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary mb-1.5 leading-snug">
              {title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl border border-border bg-transparent cursor-pointer transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl border-none cursor-pointer transition-colors duration-200 ${
              isDangerous 
                ? "bg-error hover:bg-error/90" 
                : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
