import ThemeToggle from "./ThemeToggle";
import { LogoMark, MenuIcon } from "./icons";

export default function Header({
  onToggleSidebar,
  sidebarOpen,
  theme,
  setTheme,
}) {
  return (
    <header className="top-header">
      <button
        type="button"
        className={`icon-btn menu-toggle ${sidebarOpen ? "is-open" : ""}`}
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={sidebarOpen}
      >
        <MenuIcon size={20} />
      </button>

      <div className="header-brand">
        <LogoMark size={22} className="header-logo" />
        <h1>
          AI made by <span className="grad-text">AI</span>
        </h1>
      </div>

      <div className="header-actions">
        <ThemeToggle theme={theme} setTheme={setTheme} compact />
      </div>
    </header>
  );
}
