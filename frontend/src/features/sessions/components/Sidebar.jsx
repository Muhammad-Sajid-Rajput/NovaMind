// NovaMind — Sidebar.jsx — Phase 5

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import SessionList from "./SessionList.jsx";
import SidebarFooter from "./SidebarFooter.jsx";
import { useChatContext } from "../../chat/context/ChatContext.jsx";
import { api } from "../../../config/api.js";

// Highlights the matching query within a text snippet
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-primary/25 text-primary rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    sessionsList,
    setCurrentSessionId,
  } = useChatContext();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);   // null = not yet searched
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus search input when search is activated
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  // Escape key closes search
  useEffect(() => {
    if (!isSearchActive) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        clearSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchActive]);

  // Reset all search state
  const clearSearch = () => {
    setIsSearchActive(false);
    setSearchQuery("");
    setSearchResults(null);
    setSearchLoading(false);
    setSearchError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  // Debounced API search — fires after 350ms of user inactivity
  const triggerSearch = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q || q.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.chat.search(q.trim());
        setSearchResults(data.results || []);
      } catch (err) {
        setSearchError("Search failed. Please try again.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    triggerSearch(val);
  };

  // Local name filter (used when search is active but query < 2 chars)
  const filteredSessions = useMemo(() => {
    if (!isSearchActive || !searchQuery.trim()) return sessionsList;
    const q = searchQuery.toLowerCase().trim();
    return sessionsList.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessionsList, searchQuery, isSearchActive]);

  // Navigate to a session from a search result
  const handleResultClick = (sessionId) => {
    setCurrentSessionId(sessionId);
    clearSearch();
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside
        role="complementary"
        aria-label="Sidebar navigation"
        className={`fixed lg:relative top-0 bottom-0 left-0 w-[85vw] max-w-[320px] lg:w-65 bg-sidebar border-r z-50 lg:z-auto flex flex-col h-full transition-transform duration-250 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ borderColor: "var(--color-border)", height: "100vh", maxHeight: "100vh" }}
      >
        {/* Sidebar Header */}
        <div className="p-4 pb-2 flex flex-col gap-4">
          {!isSearchActive ? (
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center font-serif font-semibold text-text-primary text-xl select-none">
                <span>NovaMind</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer border-none bg-transparent flex items-center justify-center transition-colors"
                  onClick={() => setIsSearchActive(true)}
                  title="Search chats"
                >
                  <Icon icon="material-symbols:search" className="text-lg" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 w-full">
                {/* Back button */}
                <button
                  className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer border-none bg-transparent flex items-center justify-center transition-colors"
                  onClick={clearSearch}
                  title="Back"
                >
                  <Icon icon="material-symbols:arrow-back" className="text-base" />
                </button>

                {/* Input field */}
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-2 pr-7 py-1 bg-surface border rounded-lg text-sm text-text-primary outline-none focus:border-primary placeholder-text-muted"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                  {/* Clear button */}
                  {searchQuery && (
                    <button
                      className="absolute right-1.5 p-0.5 rounded-full text-text-secondary hover:text-text-primary bg-transparent hover:bg-surface-hover border-none cursor-pointer flex items-center justify-center text-xs transition-colors"
                      onClick={() => {
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                        setSearchQuery("");
                        setSearchResults(null);
                        setSearchError("");
                      }}
                      title="Clear query"
                    >
                      <Icon icon="material-symbols:close" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status line */}
              <div className="text-[11px] font-semibold px-1 select-none min-h-4" style={{ color: "var(--color-text-secondary)" }}>
                {searchLoading && "Searching..."}
                {!searchLoading && searchError && <span className="text-error">{searchError}</span>}
                {!searchLoading && !searchError && searchResults !== null && (
                  <span>{searchResults.length} {searchResults.length === 1 ? "result" : "results"} found</span>
                )}
                {!searchLoading && !searchError && searchResults === null && searchQuery.trim().length >= 2 && "Type to search..."}
                {!searchLoading && searchQuery.trim().length < 2 && searchQuery.trim().length > 0 && "Type at least 2 characters"}
                {!searchLoading && !searchQuery && `${filteredSessions.length} ${filteredSessions.length === 1 ? "chat" : "chats"}`}
              </div>
            </div>
          )}
        </div>

        {/* New chat row — only visible when not searching */}
        {!isSearchActive && (
          <div className="px-3 pb-3 shrink-0">
            <button
              onClick={() => {
                navigate("/new");
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border bg-transparent text-left cursor-pointer transition-colors"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-text-secondary">
                <Icon icon="material-symbols:add" className="text-sm" />
              </div>
              <span className="font-semibold">New chat</span>
            </button>
          </div>
        )}

        {/* Scrollable Session List or Search Results */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isSearchActive && searchResults !== null && searchResults.length > 0 ? (
            /* ── Full-text search results ── */
            <div className="flex-1 overflow-y-auto scrollbar-thin py-1 px-1">
              {searchResults.map((result) => (
                <button
                  key={result.messageId}
                  onClick={() => handleResultClick(result.sessionId)}
                  className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-surface-hover transition-colors border-none bg-transparent cursor-pointer mb-0.5 group"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon
                      icon={result.sender === "user" ? "material-symbols:person-outline" : "material-symbols:smart-toy-outline"}
                      className="text-xs text-text-muted shrink-0"
                    />
                    <span className="text-[10px] font-semibold text-primary/80 truncate flex-1">
                      <HighlightedText text={result.sessionName} query={searchQuery} />
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                    <HighlightedText text={result.snippet} query={searchQuery} />
                  </p>
                </button>
              ))}
            </div>
          ) : isSearchActive && searchResults !== null && searchResults.length === 0 && !searchLoading ? (
            /* ── No results state ── */
            <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4 text-center py-8">
              <Icon icon="material-symbols:search-off" className="text-2xl text-text-muted" />
              <span className="text-xs text-text-muted">No messages found for "{searchQuery}"</span>
            </div>
          ) : (
            /* ── Default session list ── */
            <SessionList
              filteredSessions={filteredSessions}
              searchQuery={searchQuery}
              isSearchActive={isSearchActive}
            />
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="hidden lg:block shrink-0">
          <SidebarFooter />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
