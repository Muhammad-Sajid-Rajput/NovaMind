// NovaMind — ShortcutsModal.jsx — Responsive
import { Icon } from "@iconify/react";

const SHORTCUTS = [
  { keys: "Ctrl + K",       desc: "New Chat Session" },
  { keys: "Ctrl + /",       desc: "Focus Input Textarea" },
  { keys: "Ctrl + L",       desc: "Clear Current Chat History" },
  { keys: "Ctrl + F",       desc: "Open / Close Message Search" },
  { keys: "Ctrl + Shift + F", desc: "Toggle Fullscreen Mode" },
  { keys: "Ctrl + Enter",   desc: "Send Message" },
  { keys: "Escape",         desc: "Close Open Panel / Modal" },
  { keys: "?",              desc: "Open Shortcuts (when unfocused)" },
];

function ShortcutsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center sm:p-4 p-0 z-50 transition-opacity duration-300"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="modal-appear p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto transition-transform duration-300 ease-out
          fixed inset-0 rounded-none w-full h-full max-w-none max-h-none
          sm:relative sm:inset-auto sm:rounded-2xl sm:w-full sm:max-w-120 sm:max-h-[90vh] sm:h-auto"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2
            className="font-semibold text-text-primary"
            style={{ fontSize: "18px" }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            className="p-1.5 rounded-lg cursor-pointer transition-colors text-text-muted hover:text-text-primary hover:bg-surface-hover"
            onClick={onClose}
            style={{ background: "none", border: "none" }}
          >
            <Icon icon="material-symbols:close" className="text-xl" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="flex flex-col gap-2">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div
              key={keys}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
            >
              <span className="text-sm text-text-secondary">{desc}</span>
              <kbd
                className="font-mono text-xs font-semibold px-2 py-1 rounded"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  boxShadow: "0 2px 0 var(--color-border)",
                }}
              >
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
