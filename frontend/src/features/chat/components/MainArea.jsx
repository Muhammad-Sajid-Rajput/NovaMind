// NovaMind — MainArea.jsx — File Upload Bug Fix

import { Icon } from "@iconify/react";
import ChatHeader from "./ChatHeader.jsx";
import ChatMessages from "./ChatMessages.jsx";
import ChatInput from "./ChatInput.jsx";
import SettingsPanel from "../../settings/components/SettingsPanel.jsx";
import ShortcutsModal from "../../settings/components/ShortcutsModal.jsx";
import WelcomeScreen from "./WelcomeScreen.jsx";
import { useChatContext } from "../context/ChatContext.jsx";

function MainArea() {
  const {
    currentSessionId,
    chatMessages,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    isSettingsOpen
  } = useChatContext();

  const currentMessages = chatMessages[currentSessionId] || [];
  const hasMessages = currentMessages.length > 0;

  return (
    <main className="flex flex-col h-full relative overflow-hidden bg-background flex-1">
      {/* Background radial depth lighting */}
      <div className="absolute inset-0 z-0 welcome-radial-lighting pointer-events-none" />

      {/* Floating gradient glows */}
      <div className="welcome-glow-purple pointer-events-none" />
      <div className="welcome-glow-blue pointer-events-none" />

      {/* Technical grid */}
      <div className="absolute inset-0 z-0 welcome-bg-grid pointer-events-none" />

      {/* top chat header */}
      <ChatHeader />

      {/* Conditionally rendered search bar */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${isSearchOpen ? "h-12 border-b" : "h-0 border-b-0"
          }`}
        style={{
          backgroundColor: "var(--color-sidebar)",
          borderColor: "var(--color-border)"
        }}
      >
        <div className="w-full md:max-w-190 lg:max-w-200 xl:max-w-210 mx-auto h-full flex items-center px-4 gap-2.5">
          <Icon icon="material-symbols:search" className="text-lg text-text-secondary" />
          <input
            type="text"
            placeholder="Search in chat messages..."
            className="flex-1 bg-transparent border-none text-text-primary text-sm outline-none search-bar-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="text-xs font-semibold bg-primary-light text-primary px-2 py-0.5 rounded-full select-none">
              {currentMessages.filter((m) => m.message?.toLowerCase().includes(searchQuery.toLowerCase())).length} results
            </span>
          )}
          <button
            className="bg-transparent border-none text-text-secondary hover:text-accent-red cursor-pointer text-lg flex items-center justify-center p-1 rounded-md hover:bg-surface-hover"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
          >
            <Icon icon="material-symbols:close" />
          </button>
        </div>
      </div>

      {/* Scrollable messages container */}
      <ChatMessages />

      {/* Message input bar */}
      {hasMessages && <ChatInput />}

      {/* Full-screen Welcome Screen */}
      {!hasMessages && <WelcomeScreen />}

      {/* Modals & panels rendering */}
      {isSettingsOpen && <SettingsPanel />}

      {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}
    </main>
  );
}

export default MainArea;
