"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MoreHorizontal,
  X,
  Search,
  Store,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import {
  type WorkspaceRole,
  type NavigationDestination,
  getWorkspaceGroups,
  getDestinationsForGroup,
  getDestinationForPath,
} from "@/app/lib/navigation/workspace-registry";
import { WorkspaceIcon } from "./WorkspaceIcons";
import { useNavigationProgress } from "./NavigationProgress";
import { logoutAction } from "@/app/actions/auth";
import { formatBadgeCount } from "@/app/components/shell/useShell";

export function MobileWorkspaceDock({
  role,
  user,
  brand,
  attentionCounts = { count: 0, feel: 0 },
  onOpenCommandCenter,
  themeControl,
  pharmacySwitcher,
}: {
  role: WorkspaceRole;
  user: SessionUser;
  brand?: { name: string; slug?: string | null };
  attentionCounts?: { count: number; feel: number };
  onOpenCommandCenter: () => void;
  themeControl?: React.ReactNode;
  pharmacySwitcher?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { startNavigation, stage, targetHref: activeNavHref } = useNavigationProgress();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  const groups = getWorkspaceGroups(role);
  // Pick primary groups (strictly 4 primary tabs)
  const primaryGroups = groups.filter((g) => g.mobilePrimary).slice(0, 4);
  // Secondary groups go into "More" sheet
  const secondaryGroups = groups.filter((g) => !primaryGroups.includes(g));

  const currentDest = getDestinationForPath(pathname, role);
  const activeGroupId = currentDest?.groupId || groups[0]?.id;

  const openSheet = () => {
    setSheetOpen(true);
    sheetRef.current?.showModal();
  };

  const closeSheet = () => {
    sheetRef.current?.close();
    setSheetOpen(false);
  };

  useEffect(() => {
    closeSheet();
  }, [pathname]);

  return (
    <>
      {/* Bottom Workspace Dock (4 Primary Tabs + More Sheet) */}
      <nav
        aria-label="Mobile workspace dock"
        className="aether-mobile-dock lg:hidden"
      >
        <div className="aether-mobile-dock-inner">
          {/* 4 Primary Tabs */}
          {primaryGroups.map((group) => {
            const isRouteActive = activeGroupId === group.id;
            const dests = getDestinationsForGroup(role, group.id, user);
            const targetHref = dests[0]?.href || (role === "admin" ? "/admin" : "/portal");
            const isPending = activeNavHref === targetHref && stage !== "idle";

            let badgeCount = 0;
            if (group.id === "today" && attentionCounts.count > 0) {
              badgeCount = attentionCounts.count;
            } else if (group.id === "care" && attentionCounts.feel > 0) {
              badgeCount = attentionCounts.feel;
            }

            return (
              <Link
                key={group.id}
                href={targetHref}
                onClick={() => startNavigation(targetHref, group.label)}
                className={`aether-dock-item ${isRouteActive ? "active" : ""} ${isPending ? "is-navigating-pending" : ""}`}
                aria-current={isRouteActive ? "page" : undefined}
              >
                <span className="relative inline-flex items-center justify-center">
                  <WorkspaceIcon name={group.icon} size={20} />
                  {badgeCount > 0 && (
                    <span className="aether-dock-badge">
                      {formatBadgeCount(badgeCount)}
                    </span>
                  )}
                </span>
                <span className="aether-dock-label">{group.shortLabel}</span>
              </Link>
            );
          })}

          {/* 5th Tab: More (Opens Slide-up Sheet) */}
          <button
            type="button"
            onClick={openSheet}
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            aria-label="More workspaces and settings"
            className={`aether-dock-item ${
              secondaryGroups.some((g) => g.id === activeGroupId) ? "active" : ""
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="aether-dock-label">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom Slide-up Sheet for "More" Destinations */}
      <dialog
        ref={sheetRef}
        closedby="any"
        aria-label="More workspaces and actions"
        className="aether-mobile-sheet"
        onClose={() => setSheetOpen(false)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickedInDialog =
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width;
          if (!clickedInDialog) closeSheet();
        }}
      >
        <div className="aether-mobile-sheet-content">
          <div className="aether-mobile-sheet-header">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[var(--admin-text)]">
                More Workspaces
              </h2>
              <p className="text-xs text-[var(--admin-text-muted)]">
                {brand?.name || "Aether Workspace"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeSheet}
              className="aether-mobile-sheet-close"
              aria-label="Close sheet"
            >
              <X size={18} />
            </button>
          </div>

          {/* Pharmacy switcher if available */}
          {pharmacySwitcher && (
            <div className="px-4 py-2 border-b border-[var(--admin-border)]">
              {pharmacySwitcher}
            </div>
          )}

          {/* Quick Command Trigger in Sheet */}
          <div className="px-4 py-2.5 border-b border-[var(--admin-border)]">
            <button
              type="button"
              onClick={() => {
                closeSheet();
                onOpenCommandCenter();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--admin-hover)] text-xs font-semibold text-[var(--admin-text)] border border-[var(--admin-border)] cursor-pointer"
            >
              <Search size={15} className="text-[var(--admin-accent)] shrink-0" />
              <span className="flex-1 text-left">Search or ask Aether…</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--admin-panel)] text-[10px] text-[var(--admin-text-soft)] border border-[var(--admin-border)]">⌘K</kbd>
            </button>
          </div>

          {/* Secondary Groups & Pages */}
          <div className="aether-mobile-sheet-body">
            {/* Show all groups and destinations in a clean grouped list */}
            {groups.map((group) => {
              const dests = getDestinationsForGroup(role, group.id, user);
              if (dests.length === 0) return null;

              return (
                <div key={group.id} className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-soft)]">
                    <WorkspaceIcon name={group.icon} size={14} />
                    <span>{group.label}</span>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {dests.map((dest) => {
                      const isItemActive = pathname === dest.href;
                      const isPending = activeNavHref === dest.href && stage !== "idle";
                      return (
                        <Link
                          key={dest.id}
                          href={dest.href}
                          onClick={() => {
                            startNavigation(dest.href, dest.label);
                            closeSheet();
                          }}
                          className={`aether-sheet-link ${isItemActive ? "active" : ""} ${isPending ? "is-navigating-pending" : ""}`}
                        >
                          <WorkspaceIcon name={dest.icon} size={16} />
                          <span className="truncate flex-1">{dest.label}</span>
                          <ChevronRight size={14} className="opacity-40" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sheet Footer: Storefront, Theme, Logout */}
          <div className="aether-mobile-sheet-footer">
            <div className="flex items-center justify-between gap-3 mb-3">
              {brand?.slug && (
                <Link
                  href={`/p/${brand.slug}`}
                  className="flex items-center gap-2 text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                >
                  <Store size={15} />
                  <span>View storefront</span>
                </Link>
              )}
              {themeControl}
            </div>

            <div className="pt-2 border-t border-[var(--admin-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--admin-text-soft)] truncate max-w-[180px]">
                {user.email}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
