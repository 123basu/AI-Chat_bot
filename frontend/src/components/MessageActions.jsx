import { useState } from "react";
import {
  CopyIcon,
  CheckIcon,
  RefreshIcon,
  ThumbUpIcon,
  ThumbDownIcon,
} from "./icons";

export default function MessageActions({
  content,
  onRegenerate,
  isLastAssistant,
  feedbackValue,
  onFeedback,
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="msg-actions" role="toolbar" aria-label="Message actions">
      {onFeedback && (
        <>
          <button
            type="button"
            className={`action-chip ${feedbackValue === "up" ? "active up" : ""}`}
            onClick={() => onFeedback(feedbackValue === "up" ? null : "up")}
            aria-label="Good response"
            aria-pressed={feedbackValue === "up"}
            title="Good response"
          >
            <ThumbUpIcon size={14} />
          </button>
          <button
            type="button"
            className={`action-chip ${feedbackValue === "down" ? "active down" : ""}`}
            onClick={() => onFeedback(feedbackValue === "down" ? null : "down")}
            aria-label="Bad response"
            aria-pressed={feedbackValue === "down"}
            title="Bad response"
          >
            <ThumbDownIcon size={14} />
          </button>
        </>
      )}

      {isLastAssistant && onRegenerate && (
        <button
          type="button"
          className="action-chip"
          onClick={onRegenerate}
          aria-label="Regenerate response"
          title="Regenerate response"
        >
          <RefreshIcon size={13} />
          <span>Regenerate</span>
        </button>
      )}

      <button
        type="button"
        className="action-chip"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy response"}
        title="Copy"
      >
        {copied ? (
          <>
            <CheckIcon size={13} />
            <span>Copied</span>
          </>
        ) : (
          <>
            <CopyIcon size={13} />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
