// NovaMind — ChatHeader.jsx — Responsive

import { Icon } from "@iconify/react";
import { useChatContext } from "../context/ChatContext.jsx";

function ChatHeader() {
  const {
    sessionsList,
    currentSessionId,
    isSidebarOpen,
    setIsSidebarOpen,
    isFullscreen,
    toggleFullscreen,
    setIsSettingsOpen,
    createNewSession
  } = useChatContext();

  const currentSession = sessionsList.find((s) => s.id === currentSessionId);
  const sessionName = currentSession ? currentSession.name : "New Chat";

  return (
    <header
      className="h-13 flex items-center justify-between px-3 z-30 transition-colors duration-300 relative"
      style={{
        backgroundColor: "var(--color-background)",
        borderBottom: "1px solid var(--color-border)"
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Toggle Sidebar / Hamburger Button */}
        <button
          className="w-9 h-9 flex items-center justify-center border-none bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-md cursor-pointer transition-colors duration-200 text-xl"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <Icon icon={isSidebarOpen ? "material-symbols:menu-open-rounded" : "material-symbols:menu-rounded"} />
        </button>

        {/* Current Session Title */}
        <span className="font-sans font-medium text-text-primary text-sm select-none truncate max-w-37.5 sm:max-w-50 md:max-w-75 lg:text-base">
          {sessionName}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Fullscreen Toggle Button — Desktop Only */}
        <button
          className="w-9 h-9 inline-flex items-center justify-center border-none bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-md cursor-pointer transition-colors duration-200 text-lg max-lg:hidden"
          onClick={toggleFullscreen}
          aria-label="Toggle Fullscreen"
          title="Toggle Fullscreen"
        >
          <Icon icon={isFullscreen ? "material-symbols:fullscreen-exit" : "material-symbols:fullscreen"} />
        </button>

        {/* Mobile: New Chat Button (widths < 1024px) */}
        <button
          className="w-9 h-9 flex items-center justify-center border-none bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-md cursor-pointer transition-colors duration-200 text-lg lg:hidden"
          onClick={() => createNewSession()}
          aria-label="New chat"
          title="New chat"
        >
          <Icon icon="material-symbols:edit-square-outline" />
        </button>

        {/* Mobile: More Options / Settings Button (widths < 1024px) */}
        <button
          className="w-9 h-9 flex items-center justify-center border-none bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-md cursor-pointer transition-colors duration-200 text-lg lg:hidden"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="More options"
          title="Settings"
        >
          <Icon icon="material-symbols:more-vert" />
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
