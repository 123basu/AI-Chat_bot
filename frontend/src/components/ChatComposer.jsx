import { useRef, useEffect, useState } from "react";

export default function ChatComposer({
  input,
  onInputChange,
  onSend,
  loading,
  mode,
}) {
  const textareaRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const placeholder = mode === "data"
    ? "Ask about your business data..."
    : "Type your message...";

  return (
    <div className={`composer-wrapper ${focused ? "focused" : ""}`}>
      <div className="composer-inner">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={1}
          aria-label="Message input"
          disabled={loading}
        />
        <button
          className="composer-send-btn"
          onClick={onSend}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <p className="composer-hint">Enter to send · Shift + Enter for new line</p>
    </div>
  );
}