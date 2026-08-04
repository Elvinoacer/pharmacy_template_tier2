"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Persisted sidebar collapse state for desktop. Stored in localStorage so the
 * user's preference survives across sessions.
 */
export function useSidebarCollapsed(storageKey: "portal" | "admin" | "caregiver") {
  const key = `aether:sidebar:${storageKey}`;
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Use a microtask to avoid calling setState synchronously inside the effect,
    // which lint flags as a cascading render.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = localStorage.getItem(key);
        if (stored !== null) setCollapsed(stored === "true");
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return { collapsed, toggle, hydrated };
}

/**
 * Tracks unread notification count via the /api/notifications/unread endpoint.
 * Polls every 60s while the tab is visible.
 */
export function useUnreadCount() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled && typeof j.count === "number") setCount(j.count);
      } catch {
        /* ignore — best-effort */
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    const onVisibility = () => {
      if (!document.hidden) fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return count;
}

export function useActivePath(): string {
  const pathname = usePathname() || "/";
  return pathname;
}

/**
 * Determines whether a sidebar link is active given the current path.
 * Active when the link href is the longest matching prefix of the path.
 */
export function isLinkActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  if (href === "/portal" || href === "/admin" || href === "/caregiver") {
    // Root link is active only on exact match (so /portal/refills doesn't highlight Dashboard)
    return false;
  }
  return pathname.startsWith(href + "/") || pathname === href;
}
