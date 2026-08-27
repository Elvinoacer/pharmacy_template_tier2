"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Enhanced sidebar state with collapse, pinned items, width persistence, and group collapse.
 * Supports drag-to-resize, favorite pinning, and collapsible navigation groups.
 */
type CachedSidebarState = {
  collapsed: boolean;
  width: number;
  pinned: string[];
  collapsedGroups: Record<string, boolean>;
  hydrated: boolean;
};

// In-memory module cache so SPA navigations render instantly with zero layout shifts or flash
const sidebarMemoryCache: Record<string, CachedSidebarState> = {};
const sidebarScrollMemory: Record<string, number> = {};
let cachedAttentionCounts: AttentionCounts = { count: 0, feel: 0 };

/**
 * Enhanced sidebar state with collapse, pinned items, width persistence, and group collapse.
 * Supports drag-to-resize, favorite pinning, and collapsible navigation groups.
 */
export function useSidebarEnhanced(storageKey: "portal" | "admin" | "caregiver") {
  const collapsedKey = `aether:sidebar:${storageKey}:collapsed`;
  const widthKey = `aether:sidebar:${storageKey}:width`;
  const pinnedKey = `aether:sidebar:${storageKey}:pinned`;
  const groupsKey = `aether:sidebar:${storageKey}:groups`;

  const cached = sidebarMemoryCache[storageKey];
  
  const [collapsed, setCollapsed] = useState<boolean>(() => cached?.collapsed ?? false);
  const [width, setWidth] = useState<number>(() => cached?.width ?? 264);
  const [pinned, setPinned] = useState<string[]>(() => cached?.pinned ?? []);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => cached?.collapsedGroups ?? {});
  const [hydrated, setHydrated] = useState<boolean>(() => cached?.hydrated ?? false);
  const [isResizing, setIsResizing] = useState(false);

  // Sync to memory cache whenever state changes
  useEffect(() => {
    sidebarMemoryCache[storageKey] = {
      collapsed,
      width,
      pinned,
      collapsedGroups,
      hydrated,
    };
  }, [storageKey, collapsed, width, pinned, collapsedGroups, hydrated]);

  useEffect(() => {
    if (sidebarMemoryCache[storageKey]?.hydrated) {
      setHydrated(true);
      return;
    }

    try {
      const storedCollapsed = localStorage.getItem(collapsedKey);
      const storedWidth = localStorage.getItem(widthKey);
      const storedPinned = localStorage.getItem(pinnedKey);
      const storedGroups = localStorage.getItem(groupsKey);
      
      let nextCollapsed = false;
      let nextWidth = 264;
      let nextPinned: string[] = [];
      let nextGroups: Record<string, boolean> = {};

      if (storedCollapsed !== null) nextCollapsed = storedCollapsed === "true";
      if (storedWidth !== null) {
        const w = parseInt(storedWidth, 10);
        if (!isNaN(w) && w >= 200 && w <= 400) nextWidth = w;
      }
      if (storedPinned !== null) {
        const p = JSON.parse(storedPinned);
        if (Array.isArray(p)) nextPinned = p;
      }
      if (storedGroups !== null) {
        const g = JSON.parse(storedGroups);
        if (g && typeof g === "object") nextGroups = g;
      }

      setCollapsed(nextCollapsed);
      setWidth(nextWidth);
      setPinned(nextPinned);
      setCollapsedGroups(nextGroups);
      setHydrated(true);

      sidebarMemoryCache[storageKey] = {
        collapsed: nextCollapsed,
        width: nextWidth,
        pinned: nextPinned,
        collapsedGroups: nextGroups,
        hydrated: true,
      };
    } catch {
      setHydrated(true);
    }
  }, [collapsedKey, widthKey, pinnedKey, groupsKey, storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      if (sidebarMemoryCache[storageKey]) {
        sidebarMemoryCache[storageKey].collapsed = next;
      }
      try {
        localStorage.setItem(collapsedKey, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [collapsedKey, storageKey]);

  const setWidthSafe = useCallback((w: number) => {
    const clamped = Math.max(200, Math.min(400, w));
    setWidth(clamped);
    if (sidebarMemoryCache[storageKey]) {
      sidebarMemoryCache[storageKey].width = clamped;
    }
    try {
      localStorage.setItem(widthKey, String(clamped));
    } catch {
      /* ignore */
    }
  }, [widthKey, storageKey]);

  const togglePin = useCallback((href: string) => {
    setPinned((prev) => {
      const next = prev.includes(href) 
        ? prev.filter((h) => h !== href)
        : [...prev, href];
      if (sidebarMemoryCache[storageKey]) {
        sidebarMemoryCache[storageKey].pinned = next;
      }
      try {
        localStorage.setItem(pinnedKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [pinnedKey, storageKey]);

  const isPinned = useCallback((href: string) => {
    return pinned.includes(href);
  }, [pinned]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      if (sidebarMemoryCache[storageKey]) {
        sidebarMemoryCache[storageKey].collapsedGroups = next;
      }
      try {
        localStorage.setItem(groupsKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [groupsKey, storageKey]);

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
 * Persists and restores sidebar scroll position across route navigations and page reloads.
 * Also ensures the active link stays in view without snapping to the top.
 */
export function useSidebarScroll(storageKey: string) {
  const scrollKey = `aether:sidebar:${storageKey}:scroll`;
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const top = (e.currentTarget as HTMLElement).scrollTop;
      sidebarScrollMemory[storageKey] = top;
      try {
        sessionStorage.setItem(scrollKey, String(top));
      } catch {
        /* ignore */
      }
    },
    [storageKey, scrollKey]
  );

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const restore = () => {
      let savedTop: number | null = null;
      if (typeof sidebarScrollMemory[storageKey] === "number") {
        savedTop = sidebarScrollMemory[storageKey];
      } else {
        try {
          const stored = sessionStorage.getItem(scrollKey);
          if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed)) savedTop = parsed;
          }
        } catch {
          /* ignore */
        }
      }

      if (savedTop !== null && savedTop > 0) {
        el.scrollTop = savedTop;
      } else {
        // If no scroll position is recorded yet, ensure active link is in view
        const activeLink = el.querySelector<HTMLElement>('[data-active="true"], a.active');
        if (activeLink) {
          const navRect = el.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          if (linkRect.top < navRect.top || linkRect.bottom > navRect.bottom) {
            activeLink.scrollIntoView({ block: "nearest", behavior: "auto" });
          }
        }
      }
    };

    restore();
    const rafId = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(rafId);
  }, [pathname, storageKey, scrollKey]);

  return { navRef, handleScroll };
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
  const [counts, setCounts] = useState<AttentionCounts>(cachedAttentionCounts);
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
        const next: AttentionCounts = {
          count: typeof j.count === "number" ? j.count : 0,
          feel: typeof j.feel === "number" ? j.feel : 0,
          feelWorse: typeof j.feelWorse === "number" ? j.feelWorse : undefined,
          feelEscalated: typeof j.feelEscalated === "number" ? j.feelEscalated : undefined,
          feelReplies: typeof j.feelReplies === "number" ? j.feelReplies : undefined,
        };
        cachedAttentionCounts = next;
        setCounts(next);
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
