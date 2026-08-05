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

export type AttentionCounts = {
  /** Header bell badge (overall unread / work queue). */
  count: number;
  /** How do you feel sidebar badge — staff urgent OR customer pharmacist replies. */
  feel: number;
  feelWorse?: number;
  feelEscalated?: number;
  feelReplies?: number;
};

/**
 * Tracks attention counts via /api/notifications/unread.
 * Polls every 20s while the tab is visible (faster for clinical urgency).
 */
export function useAttentionCounts(): AttentionCounts {
  const [counts, setCounts] = useState<AttentionCounts>({ count: 0, feel: 0 });

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setCounts({
          count: typeof j.count === "number" ? j.count : 0,
          feel: typeof j.feel === "number" ? j.feel : 0,
          feelWorse: typeof j.feelWorse === "number" ? j.feelWorse : undefined,
          feelEscalated: typeof j.feelEscalated === "number" ? j.feelEscalated : undefined,
          feelReplies: typeof j.feelReplies === "number" ? j.feelReplies : undefined,
        });
      } catch {
        /* ignore — best-effort */
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 20_000);

    const onVisibility = () => {
      if (!document.hidden) fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Allow LiveAlertCenter / push handlers to force a refresh.
    const onRefresh = () => fetchCount();
    window.addEventListener("aether:attention-refresh", onRefresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("aether:attention-refresh", onRefresh);
    };
  }, []);

  return counts;
}

/**
 * Tracks unread notification count via the /api/notifications/unread endpoint.
 * Kept for callers that only need the header bell total.
 */
export function useUnreadCount() {
  return useAttentionCounts().count;
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

/** Small red count pill for sidebar / header badges. */
export function formatBadgeCount(n: number): string {
  if (n <= 0) return "";
  return n > 9 ? "9+" : String(n);
}
