// NovaMind — ModelSelector.jsx — Responsive

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";
import { MODELS } from "../../../core/constants/index.js";

function ModelSelector({ compact = false, dropdownPosition = "up" }) {
  const {
    selectedModel,
    setSelectedModel,
    fallbackUsed
  } = useChatContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center gap-1.5 bg-transparent hover:bg-surface border rounded-full text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer font-medium border-none bg-transparent ${
          compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
        }`}
        style={{ borderColor: "var(--color-border)" }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select Gemini model"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${fallbackUsed ? "bg-warning animate-pulse" : ""}`}
          style={fallbackUsed ? undefined : { backgroundColor: currentModel.color }}
        />
        <span>
          {fallbackUsed
            ? `${MODELS.find((m) => m.id === fallbackUsed)?.label || fallbackUsed} (fallback)`
            : currentModel.label}
        </span>
        <Icon icon="material-symbols:keyboard-arrow-down" className="text-sm opacity-70" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            dropdownPosition === "down" ? "top-full mt-1.5 right-0" : "bottom-full mb-1.5 left-0"
          } ${compact ? "w-48" : "w-60"} bg-sidebar border rounded-xl shadow-xl py-1 z-50 flex flex-col gap-0.5 animate-in fade-in duration-150 max-h-60 overflow-y-auto`}
          style={{ borderColor: "var(--color-border)" }}
          role="menu"
        >
          {MODELS.map((m) => (
            <button
              key={m.id}
              className={`flex flex-col px-3 py-2 text-left text-xs cursor-pointer transition-colors w-full border-none bg-transparent hover:bg-surface-hover ${
                m.id === selectedModel
                  ? "bg-primary-light text-primary hover:bg-primary-light"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => {
                setSelectedModel(m.id);
                setIsOpen(false);
              }}
              role="menuitem"
            >
              <div className="flex items-center justify-between w-full font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span>{m.label}</span>
                </div>
                {!compact && (
                  <span
                    className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                      m.id === selectedModel ? "bg-primary text-white" : "bg-surface-hover text-text-secondary"
                    }`}
                  >
                    {m.badge}
                  </span>
                )}
              </div>
              {!compact && <span className="text-[10px] text-text-muted mt-0.5 pl-3 truncate w-full">{m.description}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
