import ReactMarkdown from "react-markdown";
import MessageActions from "./MessageActions";
import { LogoMark } from "./icons";

function AIContent({ content }) {
  return (
    <div className="md-content">
      <ReactMarkdown
        components={{
          a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatMessage({
  message,
  isLastAssistant,
  feedback,
  onFeedback,
  onRegenerate,
}) {
  const isError = message.role === "assistant" && /^error\s*:/i.test(message.content);

  if (message.role === "user") {
    return (
      <div className="message user">
        <div className="bubble user">{message.content}</div>
      </div>
    );
  }

  return (
    <div className={`message assistant ${isError ? "is-error" : ""}`}>
      <span className="ai-avatar" aria-hidden="true">
        <LogoMark size={22} />
      </span>
      <div className="bubble assistant">
        <AIContent content={message.content} />
        {!isError && (
          <MessageActions
            content={message.content}
            isLastAssistant={isLastAssistant}
            onRegenerate={onRegenerate}
            feedbackValue={feedback ?? null}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
}
