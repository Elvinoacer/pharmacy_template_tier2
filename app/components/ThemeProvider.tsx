"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "afyvia-theme";
const ADMIN_KEY = "afyvia-admin-theme";

export interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  hydrated: boolean;
  cycle: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "light",
  hydrated: false,
  cycle: () => {},
  setTheme: () => {},
});

function applyThemeToDocument(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.adminTheme = resolved;
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  document.documentElement.style.colorScheme = resolved;
}

function writeThemeCookie(value: "light" | "dark") {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `afyvia-theme=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* ignore cookie write failure */
  }
}

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
        const stored = localStorage.getItem(KEY) || localStorage.getItem(ADMIN_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          next = stored;
        }
      } catch {
        /* Use the device preference when storage is blocked. */
      }
      preference.current = next;
    };

    const sync = () => {
      const next = preference.current;
      const value = next === "system" ? (media.matches ? "dark" : "light") : next;
      setMode(next);
      setResolved(value);
      setHydrated(true);
      applyThemeToDocument(value);
      writeThemeCookie(value);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === ADMIN_KEY || event.key === null) {
        readPreference();
        sync();
      }
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

  const updateMode = (nextMode: ThemeMode) => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const value = nextMode === "system" ? (media.matches ? "dark" : "light") : nextMode;
    preference.current = nextMode;

    try {
      localStorage.setItem(KEY, nextMode);
      localStorage.setItem(ADMIN_KEY, nextMode);
    } catch {
      /* Keep the choice for this session. */
    }

    setMode(nextMode);
    setResolved(value);
    applyThemeToDocument(value);
    writeThemeCookie(value);
  };

  const cycle = () => {
    const next = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    updateMode(next);
  };

  const setTheme = (newMode: ThemeMode) => {
    updateMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, resolved, hydrated, cycle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
export const useTheme = useAppTheme;

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { mode, resolved, cycle } = useAppTheme();
  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const next = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  const label =
    mode === "system"
      ? `Theme: system (${resolved}). Switch to ${next} theme`
      : `Theme: ${mode}. Switch to ${next} theme`;

  return (
    <button
      type="button"
      onClick={cycle}
      className={`theme-toggle ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon key={mode} size={compact ? 16 : 18} aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
