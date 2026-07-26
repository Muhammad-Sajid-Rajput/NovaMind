import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";
import { MODELS } from "../../../core/constants/index.js";
import { api } from "../../../config/api.js";

function ModelSelector({ compact = false, dropdownPosition = "up" }) {
  const {
    selectedModel,
    setSelectedModel,
    fallbackUsed,
    cooledModels
  } = useChatContext();

  const [isOpen, setIsOpen] = useState(false);
  const [serverCooled, setServerCooled] = useState({});
  const [now, setNow] = useState(Date.now());
  const dropdownRef = useRef(null);

  // Client-side timer for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll /models/status every 15 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const data = await api.utils.modelStatus();
        if (isMounted && data?.models) {
          setServerCooled(data.models);
        }
      } catch {
        /* ignore error */
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

  const getCooldownInfo = (modelId) => {
    const opt = cooledModels[modelId];
    const srv = serverCooled[modelId];

    let expiresAt = null;
    if (opt?.cooldownExpiresAt) {
      expiresAt = new Date(opt.cooldownExpiresAt).getTime();
    } else if (srv?.available === false && srv?.cooldownExpiresAt) {
      expiresAt = new Date(srv.cooldownExpiresAt).getTime();
    }

    if (expiresAt && expiresAt > now) {
      const seconds = Math.ceil((expiresAt - now) / 1000);
      return { isDisabled: true, seconds };
    }
    return { isDisabled: false, seconds: 0 };
  };

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center gap-1.5 bg-transparent hover:bg-surface border rounded-full text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer font-medium border-none ${
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
          {MODELS.map((m) => {
            const { isDisabled, seconds } = getCooldownInfo(m.id);
            const isSelected = m.id === selectedModel;

            return (
              <button
                key={m.id}
                disabled={isDisabled}
                className={`flex flex-col px-3 py-2 text-left text-xs transition-colors w-full border-none bg-transparent ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : isSelected
                    ? "bg-primary-light text-primary hover:bg-primary-light cursor-pointer"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer"
                }`}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedModel(m.id);
                  setIsOpen(false);
                }}
                role="menuitem"
                title={isDisabled ? `Quota reached — resets in ${seconds}s` : undefined}
              >
                <div className="flex items-center justify-between w-full font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-text-muted opacity-50" : ""}`}
                      style={isDisabled ? undefined : { backgroundColor: m.color }}
                    />
                    <span>{m.label}</span>
                  </div>
                  {!compact && (
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                        isDisabled
                          ? "bg-surface-hover text-text-muted"
                          : isSelected
                          ? "bg-primary text-white"
                          : "bg-surface-hover text-text-secondary"
                      }`}
                    >
                      {isDisabled ? "Cooled" : m.badge}
                    </span>
                  )}
                </div>
                {!compact && (
                  <span className="text-[10px] text-text-muted mt-0.5 pl-3 truncate w-full">
                    {isDisabled
                      ? `Quota reached — resets in ${seconds}s`
                      : m.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;

