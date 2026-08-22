import { useLayoutEffect, useRef } from "react";
import { SendIcon } from "./icons";

const MAX_HEIGHT = 180;

export default function ChatComposer({
  input,
  setInput,
  onSend,
  onKeyDown,
  loading,
  inputRef,
}) {
  const innerRef = useRef(null);
  const textareaRef = inputRef || innerRef;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [input, textareaRef]);

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={textareaRef}
          className="composer-input"
          rows={1}
          placeholder="Type your message…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={onKeyDown}
          aria-label="Message"
        />
        <button
          type="button"
          className="send-btn"
          onClick={onSend}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          title="Send (Enter)"
        >
          <SendIcon size={17} />
        </button>
      </div>
      <p className="composer-hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
      </p>
    </div>
  );
}
