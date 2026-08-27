import AIAvatar from "./AIAvatar";

const suggestions = [
  { icon: "💡", title: "Brainstorm ideas", desc: "Help me generate creative ideas" },
  { icon: "💻", title: "Write code", desc: "Help me write some code" },
  { icon: "📚", title: "Explain something", desc: "Explain a concept to me" },
  { icon: "🎵", title: "Find music", desc: "Help me identify or find music" },
];

export default function EmptyState({ mode, onSuggestionClick }) {
  const placeholder = mode === "data" ? "Ask about your business data..." : "How can I help you today?";

  return (
    <div className="empty-state">
      <div className="empty-state-brand">
        <AIAvatar size={48} />
      </div>
      <h2 className="empty-state-title">AI made by AI</h2>
      <p className="empty-state-subtitle">{placeholder}</p>
      <div className="suggestion-grid">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-card"
            onClick={() => onSuggestionClick(s.title + ": " + s.desc)}
            aria-label={`Suggestion: ${s.title}`}
          >
            <span className="suggestion-icon">{s.icon}</span>
            <span className="suggestion-title">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}