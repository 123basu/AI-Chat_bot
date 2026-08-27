import ChatMessage from "./ChatMessage";
import EmptyState from "./EmptyState";

export default function ChatArea({
  messages,
  loading,
  mode,
  onSend,
}) {
  return (
    <main className="chat-area">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <EmptyState mode={mode} onSuggestionClick={onSend} />
        ) : (
          messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="ai-loading">
              <span className="ai-loading-avatar">✦</span>
              <span className="ai-loading-text">AI is thinking</span>
              <span className="ai-loading-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          </div>
        )}
        <div id="chat-end" style={{ height: 1 }} />
      </div>
    </main>
  );
}