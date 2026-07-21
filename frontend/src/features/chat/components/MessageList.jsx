// NovaMind — MessageList.jsx — Scroll Bug Fix
import { memo } from 'react';
import ChatMessage from './ChatMessage.jsx';

const MessageList = memo(({
  messages,
  onRegenerate,
  onEditSubmit,
  onVersionNavigate,
}) => {
  return messages.map((msg, index) => {
    if (msg.type === 'system') return null;

    const msgId        = msg.id || msg._id || `msg-${index}`;
    const isLast       = index === messages.length - 1;
    const isLastBotMsg = isLast && msg.sender === 'robot';

    return (
      <div
        key={msgId}
        className="w-full md:max-w-190 lg:max-w-200
                   xl:max-w-210 mx-auto flex flex-col px-4"
      >
        <ChatMessage
          id={msgId}
          message={msg.message}
          sender={msg.sender}
          time={msg.time}
          createdAt={msg.createdAt}
          image={msg.image}
          file={msg.file}
          files={msg.files}
          isStreaming={msg.isStreaming}
          isLastBotMessage={isLastBotMsg}
          onRegenerate={onRegenerate}
          onEditSubmit={onEditSubmit}
          onNavigate={onVersionNavigate}
          model={msg.model}
          isError={msg.isError}
          errStatus={msg.errStatus}
          versionInfo={msg.versionInfo}
          parentMessageId={msg.parentMessageId}
        />
      </div>
    );
  });
}, (prev, next) => {
  // Only re-render when messages array actually changes
  // This prevents scroll events from re-rendering the list
  if (prev.messages.length !== next.messages.length) return false;

  const signature = (msg) => [
    msg?.id || msg?._id,
    msg?.sender,
    msg?.message,
    msg?.isStreaming ? '1' : '0',
    msg?.isError ? '1' : '0',
    typeof msg?.image === 'string' ? msg.image : msg?.image?.url || '',
    typeof msg?.file === 'string' ? msg.file : msg?.file?.url || '',
    (msg?.files || []).map(f => f.url).join(','),
    msg?.model || '',
    msg?.type || '',
    msg?.parentMessageId || '',
    JSON.stringify(msg?.versionInfo || null),
  ].join('|');

  for (let i = 0; i < prev.messages.length; i += 1) {
    if (signature(prev.messages[i]) !== signature(next.messages[i])) return false;
  }

  return true;
});

MessageList.displayName = 'MessageList';
export default MessageList;
