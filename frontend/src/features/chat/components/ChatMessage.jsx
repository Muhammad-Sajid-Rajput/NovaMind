// NovaMind — ChatMessage.jsx — Scroll Bug Fix
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.min.css";
import DOMPurify from "dompurify";

import { memo } from "react";
import { Icon } from "@iconify/react";
import { marked, Renderer } from "marked";
import { useChatContext } from "../context/ChatContext.jsx";
import MessageActions from "./MessageActions.jsx";
import EditMessageBox from "./EditMessageBox.jsx";
import VersionNavigator from "./VersionNavigator.jsx";

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

// Custom renderer for code blocks
const renderer = new Renderer();

renderer.code = (codeOrObj, info) => {
  // Handle both marked v9+ (object arg) and older (string args)
  let code = "";
  let lang = "";
  if (codeOrObj && typeof codeOrObj === "object") {
    code = codeOrObj.text || "";
    lang = codeOrObj.lang || "";
  } else {
    code = codeOrObj || "";
    lang = info || "";
  }
  const displayLang = lang || "plaintext";
  const validLang = hljs.getLanguage(displayLang) ? displayLang : "plaintext";
  const highlighted = hljs.highlight(code, { language: validLang }).value;

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${displayLang}</span>
        <button
          class="copy-code-btn"
          data-code="${encodeURIComponent(code)}"
        >
          Copy
        </button>
      </div>
      <pre><code class="hljs language-${displayLang}">${highlighted}</code></pre>
    </div>
  `;
};

// FIX 4: Single marked.use() call — merges renderer + options.
// Previously setOptions was called twice; the second call silently overwrote
// the first (losing breaks, gfm, and highlight settings).
marked.use({
  renderer,
  breaks: true,
  gfm: true,
});

function ChatMessage({
  id,
  message,
  sender,
  time,
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
  versions,
  currentVersionIndex,
  files
}) {
  const { searchQuery, editingMessageId, setEditingMessageId } = useChatContext();
  const isEditing = id === editingMessageId;


  function getBotMarkdownHtml() {
    let cleanText = message || "";

    if (searchQuery && searchQuery.trim() !== "") {
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      cleanText = cleanText.replace(regex, `<mark class="search-highlight">$1</mark>`);
    }

    let rawHtml = marked.parse(cleanText);
    
    // Wrap tables in responsive container for scrolling and styling
    rawHtml = rawHtml.replace(/<table>/g, '<div class="table-container"><table>').replace(/<\/table>/g, '</table></div>');

    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "code", "pre",
        "ul", "ol", "li", "blockquote", "h1", "h2",
        "h3", "h4", "h5", "h6", "a", "span", "div",
        "table", "thead", "tbody", "tr", "th", "td",
        "hr", "mark",
      ],
      ALLOWED_ATTR: [
        "href", "class", "data-code", "target", "rel", "aria-hidden"
      ],
      ALLOW_DATA_ATTR: true,
    });
  }

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
      <div className="w-full flex my-4 justify-end group animate-in fade-in duration-200">
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
                        background: "rgba(0,0,0,0.12)",
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
                      background: "rgba(255,255,255,0.06)",
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
              />
            </div>
          ) : (
            <div className="relative p-3.5 px-4 rounded-[18px_18px_4px_18px] bg-user-bubble text-white shadow-xs flex flex-col gap-1.5 transition-all duration-300 w-fit max-w-full min-w-0 group self-end">
              {filesList.map((f, i) => {
                const isImg = f.mimeType?.startsWith('image/') || f.resourceType === 'image';
                if (isImg) {
                  return (
                    <div
                      key={f.url || i}
                      className="inline-flex max-w-full rounded-lg mb-1.5 shadow-sm border"
                      style={{
                        borderColor: "var(--color-border)",
                        background: "rgba(0,0,0,0.12)",
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
                    className="flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 select-none mb-1.5 max-w-full w-fit text-left self-start"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderColor: "rgba(255,255,255,0.1)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
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
              <span className="block max-w-full text-[14.5px] leading-relaxed wrap-break-word font-sans select-text whitespace-pre-wrap">
                {renderUserText()}
              </span>
            </div>
          )}

          {!isEditing && (
            <>
              <VersionNavigator
                message={{ id, versions, currentVersionIndex }}
                onNavigate={onNavigate}
              />
              <MessageActions
                id={id}
                message={message}
                sender={sender}
                time={time}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col my-6 gap-2 items-start group relative max-w-180 mx-auto animate-in fade-in duration-200"
    >
      <img
        src="/favicon.webp"
        alt="NovaMind Logo"
        className="w-9 h-9 shrink-0 select-none object-contain rounded-md"
        aria-hidden="true"
      />

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
            <div className="bot-markdown" dangerouslySetInnerHTML={{ __html: getBotMarkdownHtml() }} />
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
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.versions === nextProps.versions
  );
});
