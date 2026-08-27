import MessageActions from "./MessageActions";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`message ${message.role} ${isUser ? "user" : "assistant"}`}>
      {!isUser && (
        <div className="ai-message-header">
          <span className="ai-message-avatar" aria-hidden="true">✦</span>
          <span className="ai-message-name">AI</span>
        </div>
      )}
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-ai"}`}>
        <div className="bubble-content">{message.content}</div>
      </div>
      {!isUser && <MessageActions content={message.content} />}
    </div>
  );
}