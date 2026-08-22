import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ai-chat-theme";

function readStoredPreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

export function useTheme() {
  const [preference, setPreference] = useState(readStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved =
        preference === "system" ? (media.matches ? "dark" : "light") : preference;
      const root = document.documentElement;
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  const setTheme = useCallback((next) => {
    setPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return { theme: preference, resolvedTheme, setTheme };
}
