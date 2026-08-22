import { LogoMark } from "./icons";

const SUGGESTIONS = [
  {
    emoji: "💡",
    title: "Brainstorm ideas",
    prompt: "Brainstorm 10 creative ideas for a weekend side project",
  },
  {
    emoji: "💻",
    title: "Help me write code",
    prompt: "Help me write a Python function that finds duplicate files in a folder",
  },
  {
    emoji: "📚",
    title: "Explain something",
    prompt: "Explain how HTTPS keeps my data secure, in simple terms",
  },
  {
    emoji: "🎵",
    title: "Identify music",
    prompt: "I like calm lo-fi beats for studying. Suggest some artists and tracks",
  },
];

function SuggestionCard({ emoji, title, prompt, onSelect }) {
  return (
    <button type="button" className="suggestion-card" onClick={() => onSelect(prompt)}>
      <span className="suggestion-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="suggestion-text">
        <span className="suggestion-title">{title}</span>
        <span className="suggestion-sub">{prompt}</span>
      </span>
    </button>
  );
}

export default function EmptyState({ onSuggestion }) {
  return (
    <div className="empty-state">
      <div className="empty-logo">
        <LogoMark size={56} />
      </div>
      <h2 className="empty-title">
        AI made by <span className="grad-text">AI</span>
      </h2>
      <p className="empty-sub">How can I help you today?</p>

      <div className="suggestions-grid">
        {SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.title} {...s} onSelect={onSuggestion} />
        ))}
      </div>
    </div>
  );
}
