// NovaMind — frontend/src/features/chat/pages/ChatPage.jsx — Phase 1
// Main chat workspace page. Handles sidebar/main-area layout and
// responsive grid column sizing. Syncs URL parameters with context session state.
// Uses a ref tracker to prevent circular updates and navigation loops.

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../sessions/components/Sidebar.jsx";
import MainArea from "../components/MainArea.jsx";
import { useChatContext } from "../context/ChatContext.jsx";
import { useKeyboardShortcuts } from "../../../core/hooks/useKeyboardShortcuts.js";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const {
    isSidebarOpen,
    currentSessionId,
    setCurrentSessionId,
    sessionsList,
    chatMessages,
  } = useChatContext();

  useKeyboardShortcuts();

  // Track last successfully synchronized session ID to prevent circular navigation loops
  const lastSyncedIdRef = useRef(null);

  // ─── Viewport height CSS variable (fixes mobile browser chrome) ──────────
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  // ─── Bidirectional URL ↔ State Sync (Loop-Safe via Ref Tracker) ────────────
  useEffect(() => {
    if (!sessionsList || !chatMessages) return;

    const urlId   = sessionId || "";
    const stateId = currentSessionId || "";

    // Redirect to /new if the URL sessionId is not present in sessionsList (e.g. deleted chat)
    if (urlId && !sessionsList.some((s) => s.id === urlId)) {
      navigate("/new", { replace: true });
      return;
    }
    
    const currentMessages = chatMessages[stateId] || [];
    const hasMessages = currentMessages.length > 0 || sessionsList.some((s) => s.id === stateId);

    // 1. Visited `/new` (or base `/chat` which redirects to `/new`)
    if (!urlId) {
      if (hasMessages) {
        if (!lastSyncedIdRef.current || lastSyncedIdRef.current === "") {
          // User was on /new and just sent a message -> navigate to the chat
          navigate(`/chat/${stateId}`, { replace: true });
        } else {
          // User navigated to /new from another chat -> start a fresh draft session
          const freshId = crypto.randomUUID();
          lastSyncedIdRef.current = "";
          setCurrentSessionId(freshId);
        }
      } else {
        // Fresh empty chat: track that we are on a draft state
        lastSyncedIdRef.current = "";
      }
      return;
    }

    // 2. URL changed (e.g. user clicked sidebar item, back/forward button)
    if (urlId !== lastSyncedIdRef.current) {
      lastSyncedIdRef.current = urlId;
      if (urlId !== stateId) {
        setCurrentSessionId(urlId);
      }
      return;
    }

    // 3. Context state changed internally (e.g. first message sent, or session deleted)
    if (stateId !== lastSyncedIdRef.current) {
      lastSyncedIdRef.current = stateId;
      
      const targetMessages = chatMessages[stateId] || [];
      const targetHasMessages = targetMessages.length > 0 || sessionsList.some((s) => s.id === stateId);
      
      if (targetHasMessages) {
        if (stateId !== urlId) {
          navigate(`/chat/${stateId}`, { replace: true });
        }
      } else {
        // If the new active session is empty, redirect URL to /new
        if (urlId) {
          navigate("/new", { replace: true });
        }
      }
    }
  }, [sessionId, currentSessionId, sessionsList, chatMessages, navigate, setCurrentSessionId]);

  // ─── Responsive sidebar grid columns ───────────────────────────────────────
  const [isLargeScreen, setIsLargeScreen] = useState(
    () => window.innerWidth >= 1024
  );

  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridTemplateColumns = isLargeScreen
    ? isSidebarOpen
      ? "260px 1fr"
      : "0px 1fr"
    : "1fr";

  return (
    <div
      className="app-container w-screen overflow-hidden transition-all duration-300 ease-out grid"
      style={{ gridTemplateColumns }}
    >
      <Sidebar />
      <MainArea />
    </div>
  );
}
