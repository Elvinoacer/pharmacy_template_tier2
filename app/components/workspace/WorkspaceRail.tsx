"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Pin,
  PinOff,
  ChevronRight,
  ExternalLink,
  Plus,
  Home,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import {
  type WorkspaceRole,
  type WorkspaceGroup,
  type NavigationDestination,
  getWorkspaceGroups,
  getDestinationsForGroup,
  getDestinationForPath,
} from "@/app/lib/navigation/workspace-registry";
import { WorkspaceIcon } from "./WorkspaceIcons";
import { useNavigationProgress } from "./NavigationProgress";
import { formatBadgeCount } from "@/app/components/shell/useShell";

export function WorkspaceRail({
  role,
  user,
  brand,
  attentionCounts = { count: 0, feel: 0 },
  bottomContent,
}: {
  role: WorkspaceRole;
  user: SessionUser;
  brand?: { name: string; slug?: string | null; network?: string };
  attentionCounts?: { count: number; feel: number };
  bottomContent?: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    startNavigation,
    stage,
    targetHref: activeNavHref,
  } = useNavigationProgress();

  const groups = getWorkspaceGroups(role);
  const currentDest = getDestinationForPath(pathname, role);
  const activeGroupId = currentDest?.groupId || groups[0]?.id || "today";

  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [pinnedPanel, setPinnedPanel] = useState<boolean>(false);
  const [pinnedItems, setPinnedItems] = useState<string[]>([]);

  const flyoutRef = useRef<HTMLDivElement>(null);
  const pinnedStorageKey = `aether:pinned:${role}`;
  const panelPinnedKey = `aether:panel-pinned:${role}`;

  // Hydrate panel pin state and pinned items
  useEffect(() => {
    try {
      const storedPanel = localStorage.getItem(panelPinnedKey);
      if (storedPanel === "true") {
        setPinnedPanel(true);
        setActiveFlyout(activeGroupId);
      }
      const storedItems = localStorage.getItem(pinnedStorageKey);
      if (storedItems) {
        const parsed = JSON.parse(storedItems);
        if (Array.isArray(parsed)) setPinnedItems(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [panelPinnedKey, pinnedStorageKey, activeGroupId]);

  const togglePanelPin = useCallback(() => {
    setPinnedPanel((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(panelPinnedKey, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [panelPinnedKey]);

  const togglePinItem = useCallback(
    (href: string, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setPinnedItems((prev) => {
        const next = prev.includes(href)
          ? prev.filter((h) => h !== href)
          : [...prev, href];
        try {
          localStorage.setItem(pinnedStorageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [pinnedStorageKey],
  );

  // Close flyout on route change if not pinned
  useEffect(() => {
    if (!pinnedPanel) {
      setActiveFlyout(null);
    }
  }, [pathname, pinnedPanel]);

  // Click outside flyout to dismiss (unless pinned)
  useEffect(() => {
    if (!activeFlyout || pinnedPanel) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (flyoutRef.current && !flyoutRef.current.contains(target)) {
        // If click is not inside the rail itself
        const railEl = document.getElementById("aether-adaptive-rail");
        if (railEl && !railEl.contains(target)) {
          setActiveFlyout(null);
        }
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeFlyout, pinnedPanel]);

  // Escape key closes flyout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeFlyout) {
        if (!pinnedPanel) {
          setActiveFlyout(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFlyout, pinnedPanel]);

  const handleGroupClick = (groupId: string) => {
    if (activeFlyout === groupId) {
      if (!pinnedPanel) {
        setActiveFlyout(null);
      }
    } else {
      setActiveFlyout(groupId);
    }
  };

  const activeGroup = groups.find((g) => g.id === activeFlyout);
  const flyoutDestinations: NavigationDestination[] = activeFlyout
    ? getDestinationsForGroup(role, activeFlyout, user)
    : [];

  const homeHref =
    role === "admin"
      ? "/admin"
      : role === "platform"
        ? "/platform"
        : role === "portal"
          ? "/portal"
          : "/caregiver";

  const brandMarkText =
    role === "admin"
      ? "Rx"
      : role === "platform"
        ? "P"
        : role === "portal"
          ? "A"
          : "C";

  return (
    <div
      className="relative flex min-h-screen"
      onMouseLeave={() => {
        if (!pinnedPanel) setActiveFlyout(null);
      }}
    >
      {/* 1. Narrow Adaptive Navigation Rail (never scrolls vertically) */}
      <aside
        id="aether-adaptive-rail"
        aria-label="Workspace Rail"
        className="aether-rail"
        onMouseEnter={() => {
          if (!pinnedPanel) setActiveFlyout(activeGroupId);
        }}
      >
        {/* Brand Mark */}
        <div className="aether-rail-brand">
          <Link
            href={homeHref}
            className="aether-rail-mark"
            aria-label={`${brand?.name || "Aether"} workspace home`}
            onClick={() => startNavigation(homeHref, "Dashboard")}
          >
            {brandMarkText}
          </Link>
        </div>

        {/* Workspace Groups (5–6 items strictly) */}
        <nav aria-label="Conceptual Workspaces" className="aether-rail-groups">
          {groups.map((group) => {
            const isSelected = activeFlyout === group.id;
            const isRouteActive = activeGroupId === group.id;

            // Notification badges
            let badgeCount = 0;
            if (group.id === "today" && attentionCounts.count > 0) {
              badgeCount = attentionCounts.count;
            } else if (group.id === "care" && attentionCounts.feel > 0) {
              badgeCount = attentionCounts.feel;
            }

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleGroupClick(group.id)}
                onMouseEnter={() => {
                  if (!pinnedPanel) setActiveFlyout(group.id);
                }}
                aria-expanded={isSelected}
                aria-haspopup="true"
                aria-label={`${group.label} workspace`}
                title={`${group.label} — ${group.description}`}
                className={`aether-rail-btn ${isRouteActive ? "active" : ""} ${
                  isSelected ? "selected" : ""
                }`}
              >
                <span className="aether-rail-icon-wrap relative">
                  <WorkspaceIcon name={group.icon} size={20} />
                  {badgeCount > 0 && (
                    <span className="aether-rail-badge">
                      {formatBadgeCount(badgeCount)}
                    </span>
                  )}
                </span>
                <span className="aether-rail-label">{group.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Rail Footer (Theme, Website, Sign out / bottom controls) */}
        <div className="aether-rail-footer">
          {brand?.slug && (
            <Link
              href={`/p/${brand.slug}`}
              className="aether-rail-footer-btn"
              title="View public storefront"
              aria-label="View public storefront"
            >
              <Store size={18} />
            </Link>
          )}

          {bottomContent}
        </div>
      </aside>

      {/* 2. Temporary / Expanding Contextual Flyout Panel */}
      {activeFlyout && activeGroup && (
        <div
          ref={flyoutRef}
          role="region"
          aria-label={`${activeGroup.label} contextual actions`}
          className={`aether-context-flyout ${pinnedPanel ? "is-pinned" : ""}`}
        >
          {/* Flyout Header */}
          <div className="aether-flyout-header">
            <div className="min-w-0 flex-1">
              <p className="aether-flyout-eyebrow">Workspace</p>
              <h2 className="aether-flyout-title truncate">
                {activeGroup.label}
              </h2>
              <p className="aether-flyout-desc">{activeGroup.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={togglePanelPin}
                className={`aether-flyout-pin-btn ${pinnedPanel ? "active" : ""}`}
                aria-label={
                  pinnedPanel ? "Unpin panel (auto-close)" : "Pin panel open"
                }
                title={
                  pinnedPanel ? "Unpin panel (auto-close)" : "Keep panel pinned"
                }
              >
                {pinnedPanel ? (
                  <PanelLeftClose size={16} />
                ) : (
                  <PanelLeftOpen size={16} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFlyout(null)}
                className="aether-flyout-close-btn"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Flyout Navigation Items */}
          <div className="aether-flyout-body">
            <ul className="space-y-1">
              {flyoutDestinations.map((dest) => {
                const isItemActive =
                  pathname === dest.href ||
                  pathname.startsWith(`${dest.href}/`);
                const isPinned = pinnedItems.includes(dest.href);
                const isPending =
                  activeNavHref === dest.href && stage !== "idle";

                return (
                  <li key={dest.id} className="relative group">
                    <Link
                      href={dest.href}
                      onClick={() => {
                        startNavigation(dest.href, dest.label);
                        if (!pinnedPanel) setActiveFlyout(null);
                      }}
                      className={`aether-flyout-link ${isItemActive ? "active" : ""} ${isPending ? "is-navigating-pending" : ""}`}
                    >
                      <span className="aether-flyout-item-icon">
                        <WorkspaceIcon name={dest.icon} size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="aether-flyout-item-label truncate block">
                          {dest.label}
                        </span>
                        {dest.description && (
                          <span className="aether-flyout-item-sub truncate block">
                            {dest.description}
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className="aether-flyout-chevron shrink-0"
                        aria-hidden
                      />
                    </Link>

                    {/* Quick pin toggle */}
                    <button
                      type="button"
                      onClick={(e) => togglePinItem(dest.href, e)}
                      className={`aether-flyout-pin-item-btn ${isPinned ? "is-pinned" : ""}`}
                      aria-label={
                        isPinned ? "Unpin from favorites" : "Pin to favorites"
                      }
                      title={isPinned ? "Unpin" : "Pin"}
                    >
                      <Pin size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>

            {flyoutDestinations.length === 0 && (
              <p className="p-4 text-xs text-[var(--admin-text-muted)] text-center">
                No destinations available with your current permissions.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
