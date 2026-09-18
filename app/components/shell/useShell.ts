"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

type CachedSidebarState = {
  collapsed: boolean;
  width: number;
  pinned: string[];
  collapsedGroups: Record<string, boolean>;
  hydrated: boolean;
};

// In-memory module cache so SPA navigations render instantly with zero layout shifts or flash.
const sidebarMemoryCache: Record<string, CachedSidebarState> = {};
const sidebarScrollMemory: Record<string, number> = {};
let cachedAttentionCounts: AttentionCounts = { count: 0, feel: 0 };

/**
 * Enhanced sidebar state with collapse, pinned items, width persistence, and group collapse.
 * Supports drag-to-resize, favorite pinning, and collapsible navigation groups.
 */
export function useSidebarEnhanced(storageKey: "portal" | "admin" | "caregiver") {
  const collapsedKey = `afyvia:sidebar:${storageKey}:collapsed`;
  const widthKey = `afyvia:sidebar:${storageKey}:width`;
  const pinnedKey = `afyvia:sidebar:${storageKey}:pinned`;
  const groupsKey = `afyvia:sidebar:${storageKey}:groups`;

  const cached = sidebarMemoryCache[storageKey];

  const [collapsed, setCollapsed] = useState<boolean>(() => cached?.collapsed ?? false);
  const [width, setWidth] = useState<number>(() => cached?.width ?? 264);
  const [pinned, setPinned] = useState<string[]>(() => cached?.pinned ?? []);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    () => cached?.collapsedGroups ?? {},
  );
  const [hydrated, setHydrated] = useState<boolean>(() => cached?.hydrated ?? false);
  const [isResizing, setIsResizing] = useState(false);

  // Sync to memory cache whenever state changes.
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
    // The lazy state initializers already consumed the in-memory cache.
    if (sidebarMemoryCache[storageKey]?.hydrated) return;

    // localStorage is an external browser store. Hydrate it after paint so the
    // effect subscribes/synchronizes instead of synchronously cascading state.
    const frame = requestAnimationFrame(() => {
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
          const parsedWidth = parseInt(storedWidth, 10);
          if (!Number.isNaN(parsedWidth) && parsedWidth >= 200 && parsedWidth <= 400) {
            nextWidth = parsedWidth;
          }
        }
        if (storedPinned !== null) {
          const storedValue: unknown = JSON.parse(storedPinned);
          if (Array.isArray(storedValue) && storedValue.every((item) => typeof item === "string")) {
            nextPinned = storedValue;
          }
        }
        if (storedGroups !== null) {
          const storedValue: unknown = JSON.parse(storedGroups);
          if (storedValue && typeof storedValue === "object" && !Array.isArray(storedValue)) {
            nextGroups = Object.fromEntries(
              Object.entries(storedValue).filter(
                (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
              ),
            );
          }
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
    });

    return () => cancelAnimationFrame(frame);
  }, [collapsedKey, widthKey, pinnedKey, groupsKey, storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
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

  const setWidthSafe = useCallback(
    (nextWidth: number) => {
      const clamped = Math.max(200, Math.min(400, nextWidth));
      setWidth(clamped);
      if (sidebarMemoryCache[storageKey]) {
        sidebarMemoryCache[storageKey].width = clamped;
      }
      try {
        localStorage.setItem(widthKey, String(clamped));
      } catch {
        /* ignore */
      }
    },
    [widthKey, storageKey],
  );

  const togglePin = useCallback(
    (href: string) => {
      setPinned((previous) => {
        const next = previous.includes(href)
          ? previous.filter((item) => item !== href)
          : [...previous, href];
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
    },
    [pinnedKey, storageKey],
  );

  const isPinned = useCallback((href: string) => pinned.includes(href), [pinned]);

  const toggleGroup = useCallback(
    (groupId: string) => {
      setCollapsedGroups((previous) => {
        const next = { ...previous, [groupId]: !previous[groupId] };
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
    },
    [groupsKey, storageKey],
  );

  const isGroupCollapsed = useCallback(
    (groupId: string) => Boolean(collapsedGroups[groupId]),
    [collapsedGroups],
  );

  const startResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsResizing(true);

      const startX = event.clientX;
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
    },
    [width, setWidthSafe],
  );

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
  const scrollKey = `afyvia:sidebar:${storageKey}:scroll`;
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const top = event.currentTarget.scrollTop;
      sidebarScrollMemory[storageKey] = top;
      try {
        sessionStorage.setItem(scrollKey, String(top));
      } catch {
        /* ignore */
      }
    },
    [storageKey, scrollKey],
  );

  useEffect(() => {
    const element = navRef.current;
    if (!element) return;

    const restore = () => {
      let savedTop: number | null = null;
      if (typeof sidebarScrollMemory[storageKey] === "number") {
        savedTop = sidebarScrollMemory[storageKey];
      } else {
        try {
          const stored = sessionStorage.getItem(scrollKey);
          if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!Number.isNaN(parsed)) savedTop = parsed;
          }
        } catch {
          /* ignore */
        }
      }

      if (savedTop !== null && savedTop > 0) {
        element.scrollTop = savedTop;
      } else {
        const activeLink = element.querySelector<HTMLElement>('[data-active="true"], a.active');
        if (activeLink) {
          const navRect = element.getBoundingClientRect();
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

/** Legacy hook for backward compatibility. */
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
        const response = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (cancelled || !payload || typeof payload !== "object") return;
        const data = payload as Record<string, unknown>;
        const next: AttentionCounts = {
          count: typeof data.count === "number" ? data.count : 0,
          feel: typeof data.feel === "number" ? data.feel : 0,
          feelWorse: typeof data.feelWorse === "number" ? data.feelWorse : undefined,
          feelEscalated: typeof data.feelEscalated === "number" ? data.feelEscalated : undefined,
          feelReplies: typeof data.feelReplies === "number" ? data.feelReplies : undefined,
        };
        cachedAttentionCounts = next;
        setCounts(next);
      } catch {
        /* ignore — best-effort */
      }
    };

    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 20_000);

    const onVisibility = () => {
      if (!document.hidden) void fetchCount();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onRefresh = () => void fetchCount();
    window.addEventListener("afyvia:attention-refresh", onRefresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("afyvia:attention-refresh", onRefresh);
    };
  }, [pathname]);

  return counts;
}

/** Tracks unread notification count for callers that only need the header total. */
export function useUnreadCount() {
  return useAttentionCounts().count;
}

export function useActivePath(): string {
  return usePathname() || "/";
}

/** Determines whether a sidebar link is active given the current path. */
export function isLinkActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  if (href === "/portal" || href === "/admin" || href === "/caregiver") return false;
  return pathname.startsWith(`${href}/`) || pathname === href;
}

/** Small red count pill for sidebar / header badges. */
export function formatBadgeCount(count: number): string {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}
