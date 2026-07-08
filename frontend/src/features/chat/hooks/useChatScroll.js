// NovaMind — useChatScroll.js — Scroll Bug Fix
import { useRef, useState, useEffect, useCallback } from 'react';

const BOTTOM_THRESHOLD = 80; // px from bottom = "at bottom"

export const useChatScroll = ({ 
  messages, 
  currentSessionId,
  isStreaming,
}) => {
  const scrollContainerRef = useRef(null);
  const bottomRef          = useRef(null);
  const isAtBottomRef      = useRef(true);
  const userScrolledUpRef  = useRef(false);
  const prevSessionIdRef   = useRef(currentSessionId);
  const prevLastMsgIdRef   = useRef(null);
  const rafRef             = useRef(null);

  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // ── Core: check if at bottom ───────────────────────
  const checkIfAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    return distFromBottom <= BOTTOM_THRESHOLD;
  }, []);

  // ── Core: scroll to bottom ─────────────────────────
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    isAtBottomRef.current    = true;
    userScrolledUpRef.current = false;
    setUserScrolledUp(false);
  }, []);

  // ── Passive throttled scroll listener ─────────────
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current) return; // throttle with RAF
      rafRef.current = requestAnimationFrame(() => {
        const atBottom = checkIfAtBottom();
        isAtBottomRef.current = atBottom;

        if (!atBottom) {
          userScrolledUpRef.current = true;
          setUserScrolledUp(true);
        } else {
          userScrolledUpRef.current = false;
          setUserScrolledUp(false);
        }
        rafRef.current = null;
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [checkIfAtBottom]);

  // ── Rule 1: Session switch → always jump to bottom ─
  useEffect(() => {
    if (prevSessionIdRef.current === currentSessionId) return;
    prevSessionIdRef.current = currentSessionId;

    // Use 'auto' for instant jump on session switch
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  }, [currentSessionId, scrollToBottom]);

  // ── Rule 2 & 3: New messages — smart scroll ────────
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const lastMsg    = messages[messages.length - 1];
    const lastMsgId  = lastMsg?.id;
    const prevLastId = prevLastMsgIdRef.current;

    // Detect what kind of change happened
    const isNewMessage = lastMsgId !== prevLastId;

    // Always update the ref
    prevLastMsgIdRef.current = lastMsgId;

    if (!isNewMessage) {
      // Message content changed (streaming chunk, edit)
      // Only scroll if already at bottom AND streaming
      if (isAtBottomRef.current && !userScrolledUpRef.current) {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
      return;
    }

    // New message added — determine if we should scroll
    const isNewUserMsg = lastMsg?.sender === 'user';
    const isNewBotStream =
      lastMsg?.sender === 'robot' && lastMsg?.isStreaming === true;

    // History mutations (edits, version nav, regenerate)
    // add messages but they are NOT new streaming messages
    // Rule: only scroll for genuinely new outgoing/incoming
    if (isNewUserMsg) {
      // User just sent — always scroll down
      requestAnimationFrame(() => scrollToBottom('smooth'));
      return;
    }

    if (isNewBotStream) {
      // New bot response starting — scroll if at bottom
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      return;
    }

    // History mutation (edit submit, version navigate,
    // regenerate) — do NOT scroll
    // The user is intentionally interacting with history
  }, [messages, scrollToBottom]);

  // ── Rule 4: Resize + fullscreen → maintain position ─
  useEffect(() => {
    const handleResize = () => {
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  return {
    scrollContainerRef,
    bottomRef,
    userScrolledUp,
    scrollToBottom,
  };
};
