import { SunIcon, MoonIcon, MonitorIcon } from "./icons";

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
];

export default function ThemeToggle({ theme, setTheme, compact = false }) {
  if (compact) {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const Current =
      theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;
    return (
      <button
        type="button"
        className="theme-cycle-btn"
        onClick={() => setTheme(next)}
        aria-label={`Theme: ${theme}. Switch to ${next}`}
        title="Change theme"
      >
        <Current size={17} />
      </button>
    );
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={label}
            className={`theme-option ${selected ? "selected" : ""}`}
            onClick={() => setTheme(value)}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
