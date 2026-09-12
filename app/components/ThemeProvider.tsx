"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "aether-theme";
const ThemeContext = createContext({ mode: "system" as ThemeMode, resolved: "light" as "light" | "dark", hydrated: false, cycle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useRef<ThemeMode>("system");
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const readPreference = () => {
      let next: ThemeMode = "system";
      try {
        const stored = localStorage.getItem(KEY) || localStorage.getItem("aether-admin-theme");
        if (stored === "light" || stored === "dark") next = stored;
      } catch { /* Use the device preference when storage is blocked. */ }
      preference.current = next;
    };
    const sync = () => {
      const next = preference.current;
      const value = next === "system" ? (media.matches ? "dark" : "light") : next;
      setMode(next);
      setResolved(value);
      setHydrated(true);
      document.documentElement.dataset.theme = value;
      document.documentElement.dataset.adminTheme = value;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) { readPreference(); sync(); }
    };
    readPreference();
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const cycle = () => {
    const next = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    const value = next === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
    preference.current = next;
    try { localStorage.setItem(KEY, next); } catch { /* Keep the choice for this session. */ }
    setMode(next);
    setResolved(value);
    document.documentElement.dataset.theme = value;
    document.documentElement.dataset.adminTheme = value;
  };
  return <ThemeContext.Provider value={{ mode, resolved, hydrated, cycle }}>{children}</ThemeContext.Provider>;
}

export const useAppTheme = () => useContext(ThemeContext);

export default function ThemeToggle() {
  const { mode, cycle } = useAppTheme();
  const Icon = mode === "system" ? Monitor : mode === "light" ? Sun : Moon;
  const next = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  return <button type="button" onClick={cycle} className="theme-toggle" aria-label={`Theme: ${mode}. Switch to ${next} theme`} title={`Theme: ${mode}. Switch to ${next}`}><Icon key={mode} size={18} aria-hidden="true" /></button>;
}
