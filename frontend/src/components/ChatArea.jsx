import ChatMessage from "./ChatMessage";
import ThinkingIndicator from "./ThinkingIndicator";
import EmptyState from "./EmptyState";

export default function ChatArea({
  messages,
  loading,
  chatEndRef,
  onSuggestion,
  feedback,
  onFeedback,
  onRegenerate,
}) {
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  })();

  return (
    <div className="chat-box">
      {messages.length === 0 && !loading && <EmptyState onSuggestion={onSuggestion} />}

      {messages.map((msg, i) => (
        <ChatMessage
          key={i}
          message={msg}
          isLastAssistant={i === lastAssistantIndex}
          feedback={feedback[i]}
          onFeedback={(value) => onFeedback(i, value)}
          onRegenerate={onRegenerate}
        />
      ))}

      {loading && <ThinkingIndicator />}
      <div ref={chatEndRef} aria-hidden="true" />
    </div>
  );
}
