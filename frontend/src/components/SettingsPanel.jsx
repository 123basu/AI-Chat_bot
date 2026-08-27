import ThemeToggle from "./ThemeToggle";

export default function SettingsPanel({
  open,
  onClose,
  themePref,
  onThemeChange,
  mode,
  onModeChange,
}) {
  if (!open) return null;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Theme</h3>
            <ThemeToggle preference={themePref} onChange={onThemeChange} />
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Chat Mode</h3>
            <div className="settings-mode-toggle" role="radiogroup" aria-label="Chat mode">
              <button
                className={`settings-mode-btn ${mode === "chat" ? "active" : ""}`}
                onClick={() => onModeChange("chat")}
                role="radio"
                aria-checked={mode === "chat"}
              >
                Chat
              </button>
              <button
                className={`settings-mode-btn ${mode === "data" ? "active" : ""}`}
                onClick={() => onModeChange("data")}
                role="radio"
                aria-checked={mode === "data"}
              >
                Data
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">About</h3>
            <p className="settings-about">
              AI made by AI — a modern AI chat assistant powered by local LLMs.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}