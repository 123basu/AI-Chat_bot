export default function ThemeToggle({ preference, onChange }) {
  const options = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "⚙️" },
  ];

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme selection">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`theme-toggle-btn ${preference === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
          aria-label={`${opt.label} theme`}
          role="radio"
          aria-checked={preference === opt.value}
          title={`${opt.label} theme`}
        >
          <span className="theme-toggle-icon">{opt.icon}</span>
          <span className="theme-toggle-label">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}