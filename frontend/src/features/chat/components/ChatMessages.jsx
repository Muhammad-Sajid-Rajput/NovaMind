// NovaMind — ChatMessages.jsx — File Upload Bug Fix
import { useCallback } from 'react';
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
              isRagSession: !!lastUserMsg.file,
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
    const messages = chatMessages[currentSessionId] || [];
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const botResponseIndex = msgIndex + 1;
    const currentUserMsg = messages[msgIndex];
    const currentBotResponse = messages[botResponseIndex];

    const currentVersionEntry = {
      userMessage: currentUserMsg.message,
      botResponse: currentBotResponse?.sender === 'robot'
        ? currentBotResponse : null,
    };

    const updatedVersions = currentUserMsg.versions
      ? [...currentUserMsg.versions, currentVersionEntry]
      : [currentVersionEntry];

    const newVersionIndex = updatedVersions.length;
    const finalVersions = [
      ...updatedVersions,
      { userMessage: newText, botResponse: null },
    ];

    const messagesBefore = messages.slice(0, msgIndex);
    const updatedUserMsg = {
      ...currentUserMsg,
      message: newText,
      versions: finalVersions,
      currentVersionIndex: newVersionIndex,
    };

    setEditingMessageId(null);
    setChatMessages(prev => ({
      ...prev,
      [currentSessionId]: [...messagesBefore, updatedUserMsg],
    }));

    try {
      await api.messages.truncate(currentSessionId, msgIndex);
    } catch (err) {
      console.error('Failed to truncate backend messages:', err);
    }

    window.dispatchEvent(new CustomEvent(
      'auto-send-chat-message',
      { detail: { text: newText, skipAppend: true } }
    ));
  }, [currentSessionId, chatMessages, setChatMessages, setEditingMessageId]);

  // ── Version navigation ─────────────────────────────
  const handleVersionNavigate = useCallback((messageId, newIndex) => {
    setChatMessages(prev => {
      const messages = prev[currentSessionId] || [];
      const msgIndex = messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return prev;

      const msg = messages[msgIndex];
      const fromIndex = msg.currentVersionIndex;
      const targetVersion = msg.versions[newIndex];
      const currentSubsequent = messages.slice(msgIndex + 2);

      const updatedVersions = msg.versions.map((v, idx) => {
        if (idx === fromIndex) {
          const currentBotResponse = messages[msgIndex + 1];
          return {
            ...v,
            botResponse: currentBotResponse?.sender === 'robot'
              ? currentBotResponse : v.botResponse,
            subsequentMessages: currentSubsequent,
          };
        }
        return v;
      });

      const updatedMsg = {
        ...msg,
        message: targetVersion.userMessage,
        versions: updatedVersions,
        currentVersionIndex: newIndex,
      };

      return {
        ...prev,
        [currentSessionId]: [
          ...messages.slice(0, msgIndex),
          updatedMsg,
          ...(targetVersion.botResponse
            ? [targetVersion.botResponse] : []),
          ...(targetVersion.subsequentMessages || []),
        ],
      };
    });
  }, [currentSessionId, setChatMessages]);

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
