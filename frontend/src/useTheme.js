import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ai-chat-theme";

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {}
  return "system";
}

function resolveTheme(pref) {
  return pref === "system" ? getSystemTheme() : pref;
}

export default function useTheme() {
  const [preference, setPreference] = useState(() => getSavedTheme());

  const applyTheme = useCallback((pref) => {
    const resolved = resolveTheme(pref);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  }, []);

  const updatePreference = useCallback((newPref) => {
    setPreference(newPref);
    try { localStorage.setItem(STORAGE_KEY, newPref); } catch {}
    applyTheme(newPref);
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(preference);
    if (preference === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [preference, applyTheme]);

  return {
    preference,
    resolved: resolveTheme(preference),
    setTheme: updatePreference,
    isDark: resolveTheme(preference) === "dark",
  };
}