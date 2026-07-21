// NovaMind — ChatMessages.jsx — File Upload Bug Fix
import { useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import { useChatContext } from '../context/ChatContext.jsx';
import { useChatScroll } from '../hooks/useChatScroll.js';
import MessageList from './MessageList.jsx';
import { api } from '../../../config/api.js';

function ChatMessages() {
  const {
    chatMessages,
    setChatMessages,
    currentSessionId,
    setEditingMessageId,
  } = useChatContext();

  // Guard against concurrent edit submissions (e.g. Enter + button click race)
  const isEditSubmittingRef = useRef(false);

  const currentMessages = chatMessages[currentSessionId] || [];
  const hasMessages = currentMessages.length > 0;

  // ── Smart scroll hook ──────────────────────────────
  const {
    scrollContainerRef,
    bottomRef,
    userScrolledUp,
    scrollToBottom,
  } = useChatScroll({
    messages: currentMessages,
    currentSessionId,
    isStreaming: currentMessages[currentMessages.length - 1]
      ?.isStreaming ?? false,
  });

  // ── Code copy (event delegation) ──────────────────
  const handleCodeCopy = useCallback((e) => {
    const btn = e.target.closest('.copy-code-btn');
    if (!btn || btn.disabled) return;
    const code = decodeURIComponent(btn.dataset.code);
    navigator.clipboard.writeText(code);
    btn.textContent = '✓ Copied!';
    btn.disabled = true;
    btn.style.cursor = 'not-allowed';
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.disabled = false;
      btn.style.cursor = 'pointer';
    }, 5000);
  }, []);

  // ── Regenerate ─────────────────────────────────────
  const handleRegenerate = useCallback(() => {
    setChatMessages((prev) => {
      const sessionMsgs = prev[currentSessionId] || [];
      const lastBotIdx = [...sessionMsgs]
        .reverse()
        .findIndex(m => m.sender === 'robot');
      if (lastBotIdx === -1) return prev;
      const botIdx = sessionMsgs.length - 1 - lastBotIdx;
      const prevMessages = sessionMsgs.slice(0, botIdx);
      const lastUserMsg = [...prevMessages]
        .reverse()
        .find(m => m.sender === 'user');
      if (!lastUserMsg) return prev;

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(
          'auto-send-chat-message',
          {
            detail: {
              text: lastUserMsg.message,
              file: lastUserMsg.file || null,
              files: lastUserMsg.files || [],
              isRagSession: !!((lastUserMsg.files || []).some(f => !f.mimeType?.startsWith('image/'))),
              skipAppend: true,
            }
          }
        ));
      }, 50);

      return { ...prev, [currentSessionId]: prevMessages };
    });
  }, [currentSessionId, setChatMessages]);

  // ── Edit & resend ──────────────────────────────────
  const handleEditSubmit = useCallback(async (messageId, newText) => {
    // Prevent concurrent invocations (e.g. Enter + button-click race, fast double-click).
    // Without this guard, two concurrent calls each call createEditBranch, producing
    // two sibling branch nodes — one of which never gets a bot reply (empty version).
    if (isEditSubmittingRef.current) return;
    isEditSubmittingRef.current = true;

    const messages = chatMessages[currentSessionId] || [];
    const editIndex = messages.findIndex(m => (m.id || m._id) === messageId);
    if (editIndex === -1) {
      isEditSubmittingRef.current = false;
      return;
    }
    const currentUserMsg = messages[editIndex];

    try {
      const res = await api.messages.createEditBranch(
        currentSessionId,
        messageId,
        newText,
        currentUserMsg.file || null,
        currentUserMsg.files || []
      );

      const newNode = res.message;
      setEditingMessageId(null);

      // Construct optimistic versionInfo and updated user message node
      const oldVersionInfo = currentUserMsg.versionInfo;
      const oldIdStr = String(currentUserMsg._id || currentUserMsg.id);
      const newIdStr = String(newNode._id || newNode.id);

      let siblingIds = oldVersionInfo?.siblingIds
        ? [...oldVersionInfo.siblingIds]
        : [oldIdStr];

      if (!siblingIds.includes(newIdStr)) {
        siblingIds.push(newIdStr);
      }

      const optimisticNewNode = {
        ...currentUserMsg,
        ...newNode,
        id: newIdStr,
        _id: newIdStr,
        sender: "user",
        message: newText,
        parentMessageId: currentUserMsg.parentMessageId ? String(currentUserMsg.parentMessageId) : null,
        versionInfo: {
          siblingIds,
          currentIndex: siblingIds.indexOf(newIdStr) !== -1 ? siblingIds.indexOf(newIdStr) : siblingIds.length - 1
        }
      };

      // Keep messages prior to editIndex, place optimisticNewNode at editIndex
      const messagesBefore = messages.slice(0, editIndex);
      const optimisticPath = [...messagesBefore, optimisticNewNode];

      // Optimistically update chatMessages state immediately
      setChatMessages((prev) => ({
        ...prev,
        [currentSessionId]: optimisticPath
      }));

      // Dispatch auto-send with the new branch node's _id as parentMessageId.
      // useStream will append the loading indicator immediately below optimisticNewNode,
      // stream the reply, and re-sync authoritative path from server when complete.
      window.dispatchEvent(new CustomEvent(
        'auto-send-chat-message',
        {
          detail: {
            text: newText,
            file: currentUserMsg.file || null,
            files: currentUserMsg.files || [],
            isRagSession: !!((currentUserMsg.files || []).some(f => !f.mimeType?.startsWith('image/'))),
            skipAppend: true,
            parentMessageId: newNode._id
          }
        }
      ));
    } catch (err) {
      console.error('Failed to create edit branch:', err);
    } finally {
      isEditSubmittingRef.current = false;
    }
  }, [currentSessionId, chatMessages, setChatMessages, setEditingMessageId]);

  // ── Version navigation ─────────────────────────────
  const handleVersionNavigate = useCallback(async (messageId, targetChildId) => {
    const messages = chatMessages[currentSessionId] || [];
    const msg = messages.find(m => (m.id || m._id) === messageId);
    if (!msg) return;

    try {
      // Ensure parentMessageId is a plain string — it may be an ObjectId object
      // if local state was populated before the backend serialization fix landed.
      const parentMessageId = msg.parentMessageId ? String(msg.parentMessageId) : null;
      const res = await api.messages.switchBranch(currentSessionId, parentMessageId, targetChildId);
      if (res && res.messages) {
        setChatMessages(prev => ({
          ...prev,
          [currentSessionId]: res.messages
        }));
      }
    } catch (err) {
      console.error('Failed to switch branch:', err);
    }
  }, [currentSessionId, chatMessages, setChatMessages]);

  // ── Render ─────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-transparent
                    overflow-hidden relative w-full h-full">

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        onClick={handleCodeCopy}
        className="flex-1 overflow-y-auto overflow-x-hidden
                   messages-container-native relative"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {/* Top spacer */}
        <div className="h-4 shrink-0" />

        {/* Memoized message list */}
        {hasMessages && (
          <MessageList
            messages={currentMessages}
            onRegenerate={handleRegenerate}
            onEditSubmit={handleEditSubmit}
            onVersionNavigate={handleVersionNavigate}
          />
        )}

        {/* Bottom spacer */}
        <div ref={bottomRef} className="h-12 shrink-0" />
      </div>

      {/* Jump to latest button */}
      {userScrolledUp && hasMessages && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
                     flex items-center justify-center
                     w-10 h-10 rounded-full
                     bg-primary hover:bg-primary-hover
                     text-white shadow-lg
                     transition-all duration-200
                     border border-white/10"
          aria-label="Jump to latest message"
        >
          <Icon icon="material-symbols:arrow-downward-rounded"
            className="text-xl" />
        </button>
      )}
    </div>
  );
}

export default ChatMessages;
