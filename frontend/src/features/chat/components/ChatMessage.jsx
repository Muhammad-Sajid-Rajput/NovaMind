// NovaMind — ChatMessage.jsx — Scroll Bug Fix
import { memo, lazy, Suspense, useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";
import MessageActions from "./MessageActions.jsx";
import EditMessageBox from "./EditMessageBox.jsx";

const MarkdownRenderer = lazy(() => import("./MarkdownRenderer.jsx"));

const FILE_ICONS = {
  pdf:  { icon: 'vscode-icons:file-type-pdf2',       color: '#f87171' },
  docx: { icon: 'vscode-icons:file-type-word',       color: '#60a5fa' },
  doc:  { icon: 'vscode-icons:file-type-word',       color: '#60a5fa' },
  xlsx: { icon: 'vscode-icons:file-type-excel',      color: '#34d399' },
  xls:  { icon: 'vscode-icons:file-type-excel',      color: '#34d399' },
  pptx: { icon: 'vscode-icons:file-type-powerpoint', color: '#fb923c' },
  ppt:  { icon: 'vscode-icons:file-type-powerpoint', color: '#fb923c' },
  txt:  { icon: 'vscode-icons:file-type-text',       color: '#a78bfa' },
  csv:  { icon: 'vscode-icons:file-type-csv',        color: '#34d399' },
};

const getFileIcon = (filename) => {
  if (!filename) return { icon: 'material-symbols:description-outline', color: '#a78bfa' };
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || { 
    icon:  'material-symbols:description-outline', 
    color: '#a78bfa' 
  };
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
};

function ChatMessage({
  id,
  message,
  sender,
  time,
  createdAt,
  image,
  file,
  isStreaming,
  isLastBotMessage,
  onRegenerate,
  onEditSubmit,
  onNavigate,
  model,
  isError,
  errStatus,
  versionInfo,
  parentMessageId,
  files
}) {
  const { searchQuery, editingMessageId, setEditingMessageId } = useChatContext();
  const isEditing = id === editingMessageId;
  const [isTouched, setIsTouched] = useState(false);
  const touchTimeoutRef = useRef(null);

  const handleTouch = () => {
    setIsTouched((prev) => {
      const next = !prev;
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
      if (next) {
        touchTimeoutRef.current = setTimeout(() => {
          setIsTouched(false);
          touchTimeoutRef.current = null;
        }, 5000);
      }
      return next;
    });
  };

  const userBubbleRef = useRef(null);
  const [capturedBubbleWidth, setCapturedBubbleWidth] = useState(null);

  useEffect(() => {
    if (!isEditing && userBubbleRef.current) {
      const rect = userBubbleRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setCapturedBubbleWidth(rect.width);
      }
    }
  }, [isEditing, message]);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  function renderUserText() {
    if (!searchQuery || searchQuery.trim() === "") {
      return message;
    }
    const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = message.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  const isUser = sender === "user";
  const showTypingIndicator = !isUser && (message === "__LOADING__" || (isStreaming && !message));
  const imageUrl = typeof image === "string" ? image : image?.url;

  // Fallback support for single file / image properties
  const filesList = files && Array.isArray(files) && files.length > 0
    ? files
    : (file
        ? [file]
        : (image
            ? [{ url: imageUrl, originalName: 'image', mimeType: 'image/png', bytes: 0 }]
            : []));

  if (isUser) {
    return (
      <div 
        className="w-full flex my-4 justify-end group animate-in fade-in duration-200"
        onClick={handleTouch}
      >
        <div className="flex flex-col items-end max-w-[85%] w-fit min-w-0">
          {isEditing ? (
            <div className="w-full flex flex-col gap-2 items-end">
              {filesList.map((f, i) => {
                const isImg = f.mimeType?.startsWith('image/') || f.resourceType === 'image';
                if (isImg) {
                  return (
                    <div
                      key={f.url || i}
                      className="inline-flex max-w-full rounded-lg mb-1.5 shadow-sm border"
                      style={{
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <img
                        src={f.url}
                        alt="User upload attachment"
                        style={{
                          display: "block",
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "240px",
                          objectFit: "contain",
                          borderRadius: "inherit",
                        }}
                      />
                    </div>
                  );
                }
                return (
                  <a
                    key={f.url || i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 select-none mb-1.5 max-w-full w-fit text-left self-end"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${getFileIcon(f.originalName).color}15`,
                        border: `1px solid ${getFileIcon(f.originalName).color}30`,
                      }}
                    >
                      <Icon
                        icon={getFileIcon(f.originalName).icon}
                        style={{ fontSize: "20px", color: getFileIcon(f.originalName).color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate leading-tight">
                        {f.originalName}
                      </div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">
                        {f.originalName.split('.').pop().toUpperCase()} • {formatBytes(f.bytes || f.size || 0)}
                      </div>
                    </div>
                  </a>
                );
              })}
              <EditMessageBox
                originalText={message}
                onSubmit={(newText) => onEditSubmit(id, newText)}
                onCancel={() => setEditingMessageId(null)}
                initialWidth={capturedBubbleWidth}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-end w-full">
              {filesList.map((f, i) => {
                const isImg = f.mimeType?.startsWith('image/') || f.resourceType === 'image';
                if (isImg) {
                  return (
                    <a
                      key={f.url || i}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full rounded-xl shadow-sm border self-end overflow-hidden hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                      style={{
                        borderColor: "rgba(255,255,255,0.1)",
                      }}
                    >
                      <img
                        src={f.url}
                        alt="User upload attachment"
                        style={{
                          display: "block",
                          width: "auto",
                          height: "auto",
                          maxWidth: "100%",
                          maxHeight: "240px",
                          objectFit: "contain",
                          borderRadius: "inherit",
                        }}
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={f.url || i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-[18px_18px_4px_18px] border text-white shadow-xs transition-all duration-300 w-fit max-w-full text-left self-end hover:brightness-110 active:scale-[0.98]"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: `${getFileIcon(f.originalName).color}15`,
                        border: `1px solid ${getFileIcon(f.originalName).color}30`,
                      }}
                    >
                      <Icon
                        icon={getFileIcon(f.originalName).icon}
                        style={{ fontSize: "20px", color: getFileIcon(f.originalName).color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate leading-tight">
                        {f.originalName}
                      </div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">
                        {f.originalName.split('.').pop().toUpperCase()} • {formatBytes(f.bytes || f.size || 0)}
                      </div>
                    </div>
                  </a>
                );
              })}
              {message && message.trim() !== "" && (
                <div ref={userBubbleRef} className="relative p-3.5 px-4 rounded-[18px_18px_4px_18px] bg-user-bubble text-white shadow-xs flex flex-col gap-1.5 transition-all duration-300 w-fit max-w-full min-w-0 group self-end">
                  <span className="block max-w-full text-[14.5px] leading-relaxed wrap-break-word font-sans select-text whitespace-pre-wrap">
                    {renderUserText()}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isEditing && (
            <MessageActions
              id={id}
              message={message}
              sender={sender}
              time={time}
              createdAt={createdAt}
              isTouched={isTouched}
              versionInfo={versionInfo}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col my-6 gap-2 items-start group relative max-w-180 mx-auto animate-in fade-in duration-200"
      onClick={handleTouch}
    >
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {isError && (
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-red select-none mb-1" role="alert">
            <Icon icon="material-symbols:warning-outline" className="text-base shrink-0" />
            <span>Connection Warning</span>
          </div>
        )}

        {showTypingIndicator ? (
          <div className="flex items-center gap-1.5 py-2.5 select-none h-6" aria-label="NovaMind is typing">
            <div className="typing-dot bg-text-muted" />
            <div className="typing-dot bg-text-muted" />
            <div className="typing-dot bg-text-muted" />
          </div>
        ) : (
          <div
            className={`bot-message-content prose select-text bot-bubble ${
              isError ? "text-accent-red font-medium" : ""
            } ${isStreaming ? "streaming" : ""}`}
          >
            <Suspense fallback={<div className="text-text-muted text-sm py-1">Formatting response...</div>}>
              <MarkdownRenderer text={message} searchQuery={searchQuery} isStreaming={isStreaming} />
            </Suspense>
            {isStreaming && (
              <span className="cursor-blink inline-block align-middle ml-1" aria-hidden="true">▋</span>
            )}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2.5 mt-2 select-none">

            {errStatus === 429 && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("switch-model", { detail: { modelId: "gemini-3.1-flash-lite" } })
                  );
                }}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none border-none"
                aria-label="Switch to recommended model"
              >
                <Icon icon="material-symbols:swap-horiz" />
                <span>Switch Model</span>
              </button>
            )}
          </div>
        )}

        {!showTypingIndicator && (
          <MessageActions
            id={id}
            message={message}
            sender={sender}
            time={time}
            isLastBotMessage={isLastBotMessage}
            onRegenerate={onRegenerate}
            model={model}
            isTouched={isTouched}
          />
        )}
      </div>
    </div>
  );
}

export default memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.message === nextProps.message &&
    prevProps.sender === nextProps.sender &&
    prevProps.time === nextProps.time &&
    prevProps.image === nextProps.image &&
    prevProps.file === nextProps.file &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isLastBotMessage === nextProps.isLastBotMessage &&
    prevProps.model === nextProps.model &&
    prevProps.isError === nextProps.isError &&
    prevProps.errStatus === nextProps.errStatus &&
    prevProps.parentMessageId === nextProps.parentMessageId &&
    JSON.stringify(prevProps.versionInfo) === JSON.stringify(nextProps.versionInfo)
  );
});
