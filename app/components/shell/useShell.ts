"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Enhanced sidebar state with collapse, pinned items, width persistence, and group collapse.
 * Supports drag-to-resize, favorite pinning, and collapsible navigation groups.
 */
export function useSidebarEnhanced(storageKey: "portal" | "admin" | "caregiver") {
  const collapsedKey = `aether:sidebar:${storageKey}:collapsed`;
  const widthKey = `aether:sidebar:${storageKey}:width`;
  const pinnedKey = `aether:sidebar:${storageKey}:pinned`;
  const groupsKey = `aether:sidebar:${storageKey}:groups`;
  
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState<number>(264);
  const [pinned, setPinned] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedCollapsed = localStorage.getItem(collapsedKey);
        const storedWidth = localStorage.getItem(widthKey);
        const storedPinned = localStorage.getItem(pinnedKey);
        const storedGroups = localStorage.getItem(groupsKey);
        
        if (storedCollapsed !== null) setCollapsed(storedCollapsed === "true");
        if (storedWidth !== null) {
          const w = parseInt(storedWidth, 10);
          if (!isNaN(w) && w >= 200 && w <= 400) setWidth(w);
        }
        if (storedPinned !== null) {
          const p = JSON.parse(storedPinned);
          if (Array.isArray(p)) setPinned(p);
        }
        if (storedGroups !== null) {
          const g = JSON.parse(storedGroups);
          if (g && typeof g === "object") setCollapsedGroups(g);
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [collapsedKey, widthKey, pinnedKey, groupsKey]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(collapsedKey, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [collapsedKey]);

  const setWidthSafe = useCallback((w: number) => {
    const clamped = Math.max(200, Math.min(400, w));
    setWidth(clamped);
    try {
      localStorage.setItem(widthKey, String(clamped));
    } catch {
      /* ignore */
    }
  }, [widthKey]);

  const togglePin = useCallback((href: string) => {
    setPinned((prev) => {
      const next = prev.includes(href) 
        ? prev.filter((h) => h !== href)
        : [...prev, href];
      try {
        localStorage.setItem(pinnedKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [pinnedKey]);

  const isPinned = useCallback((href: string) => {
    return pinned.includes(href);
  }, [pinned]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(groupsKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [groupsKey]);

  const isGroupCollapsed = useCallback((groupId: string) => {
    return !!collapsedGroups[groupId];
  }, [collapsedGroups]);

  // Drag to resize handlers
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setWidthSafe(startWidth + delta);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, setWidthSafe]);

  return {
    collapsed,
    toggle,
    hydrated,
    width,
    setWidth: setWidthSafe,
    pinned,
    togglePin,
    isPinned,
    isResizing,
    startResize,
    collapsedGroups,
    toggleGroup,
    isGroupCollapsed,
  };
}

/**
 * Legacy hook for backward compatibility
 */
export function useSidebarCollapsed(storageKey: "portal" | "admin" | "caregiver") {
  const enhanced = useSidebarEnhanced(storageKey);
  return {
    collapsed: enhanced.collapsed,
    toggle: enhanced.toggle,
    hydrated: enhanced.hydrated,
  };
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
  const pathname = usePathname();

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

    // Allow LiveAlertCenter / push handlers / feel-thread open to force a refresh.
    const onRefresh = () => fetchCount();
    window.addEventListener("aether:attention-refresh", onRefresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("aether:attention-refresh", onRefresh);
    };
    // Re-fetch when route changes (e.g. open a How-do-you-feel thread → badge clears).
  }, [pathname]);

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
