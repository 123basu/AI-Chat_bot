import { LogoMark } from "./icons";

export default function ThinkingIndicator() {
  return (
    <div className="message assistant" aria-live="polite" aria-label="AI is thinking">
      <span className="ai-avatar sm" aria-hidden="true">
        <LogoMark size={18} />
      </span>
      <div className="bubble assistant thinking-card">
        <span className="thinking-label">AI is thinking</span>
        <span className="thinking-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
