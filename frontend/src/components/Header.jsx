import AIAvatar from "./AIAvatar";

export default function Header({
  onToggleSidebar,
  mode,
  onModeChange,
  onSettingsOpen,
  themePref,
  onThemeChange,
}) {
  return (
    <header className="app-header">
      <button
        className="header-menu-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div className="header-brand">
        <AIAvatar size={22} />
        <span className="header-brand-text">AI made by AI</span>
      </div>

      <div className="header-mode-toggle" role="radiogroup" aria-label="Chat mode">
        <button
          className={`header-mode-btn ${mode === "chat" ? "active" : ""}`}
          onClick={() => onModeChange("chat")}
          role="radio"
          aria-checked={mode === "chat"}
          aria-label="Chat mode"
        >
          Chat
        </button>
        <button
          className={`header-mode-btn ${mode === "data" ? "active" : ""}`}
          onClick={() => onModeChange("data")}
          role="radio"
          aria-checked={mode === "data"}
          aria-label="Data mode"
        >
          Data
        </button>
      </div>

      <div className="header-actions">
        <div className="header-theme-toggle">
          {[
            { value: "light", icon: "☀️" },
            { value: "dark", icon: "🌙" },
            { value: "system", icon: "⚙️" },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`header-theme-btn ${themePref === opt.value ? "active" : ""}`}
              onClick={() => onThemeChange(opt.value)}
              aria-label={`${opt.value} theme`}
              title={`${opt.value} theme`}
            >
              {opt.icon}
            </button>
          ))}
        </div>
        <button
          className="header-settings-btn"
          onClick={onSettingsOpen}
          aria-label="Open settings"
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}