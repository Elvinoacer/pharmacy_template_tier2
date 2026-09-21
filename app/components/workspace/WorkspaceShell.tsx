"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Bell,
  Sun,
  Moon,
  Monitor,
  Store,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { SessionUser } from "@/app/lib/types";
import {
  type WorkspaceRole,
  getDestinationForPath,
  getWorkspaceGroups,
} from "@/app/lib/navigation/workspace-registry";
import { WorkspaceRail } from "./WorkspaceRail";
import { CommandCenter } from "./CommandCenter";
import { ContextualTaskSurface } from "./ContextualTaskSurface";
import { MobileWorkspaceDock } from "./MobileWorkspaceDock";
import {
  NavigationProgressProvider,
  NavigationProgressBar,
} from "./NavigationProgress";
import { useAppTheme, type ThemeMode } from "../ThemeProvider";
import {
  useAttentionCounts,
  formatBadgeCount,
} from "@/app/components/shell/useShell";
import { TenantBrandProvider } from "@/app/components/TenantBrand";
import { PushNotificationCenter } from "@/app/components/PushNotificationCenter";
import { LiveAlertCenter } from "@/app/components/LiveAlertCenter";
import { logoutAction } from "@/app/actions/auth";
import "./workspace.css";

export function WorkspaceShell({
  role,
  user,
  title,
  subtitle,
  actions,
  children,
  brand,
  headerExtra,
  pharmacySwitcher,
}: {
  role: WorkspaceRole;
  user: SessionUser;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  brand?: { name: string; slug?: string | null; network?: string };
  headerExtra?: React.ReactNode;
  pharmacySwitcher?: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const theme = useAppTheme();
  const attention = useAttentionCounts();

  const currentDest = getDestinationForPath(pathname, role);
  const groups = getWorkspaceGroups(role);
  const currentGroup = groups.find((g) => g.id === currentDest?.groupId);

  const defaultBrand = {
    name: brand?.name || user.memberships?.[0]?.name || "Afyvia Health",
    slug:
      brand?.slug !== undefined
        ? brand.slug
        : user.memberships?.[0]?.slug || null,
    network: brand?.network || "Afyvia Pharmacy Network",
  };

  const commandPlaceholder =
    role === "admin"
      ? "What do you want to do? (⌘K)"
      : role === "platform"
        ? "Search network, verify pharmacy, billing… (⌘K)"
        : role === "portal"
          ? "Find medicines, refills, orders… (⌘K)"
          : "Search patients, doses, refills… (⌘K)";

  return (
    <TenantBrandProvider value={defaultBrand}>
      <NavigationProgressProvider>
        <div
          className="afyvia-workspace-root min-h-screen shell-grid-admin admin-workspace"
          data-role={role}
          data-theme={theme.hydrated ? theme.resolved : undefined}
          data-admin-theme={theme.hydrated ? theme.resolved : undefined}
        >
          {/* Top Thin Layered Navigation Progress Bar */}
          <NavigationProgressBar />

          {/* Skip link for screen reader accessibility */}
          <a
            href="#workspace-main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to workspace content
          </a>

          {/* 1. Narrow Adaptive Navigation Rail (Desktop) */}
          <WorkspaceRail
            role={role}
            user={user}
            brand={defaultBrand}
            attentionCounts={attention}
            bottomContent={
              <WorkspaceUserRailControls
                user={user}
                role={role}
                theme={theme}
                brand={defaultBrand}
              />
            }
          />

          {/* 2. Workspace Content Layout */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 lg:pb-8">
            {/* Universal Workspace Header */}
            <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-panel)]/95 px-4 backdrop-blur sm:px-6">
              {/* Left: Breadcrumbs / Workspace Identity */}
              <nav
                aria-label="Breadcrumbs"
                className="flex items-center gap-2 min-w-0"
              >
                <Link
                  href={
                    role === "admin"
                      ? "/admin"
                      : role === "platform"
                        ? "/platform"
                        : role === "portal"
                          ? "/portal"
                          : "/caregiver"
                  }
                  className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-accent-text)] hover:underline shrink-0"
                >
                  {role === "admin"
                    ? "Pharmacy"
                    : role === "platform"
                      ? "Platform"
                      : role === "portal"
                        ? "Portal"
                        : "Caregiver"}
                </Link>

                {currentGroup && (
                  <>
                    <ChevronRight
                      size={13}
                      className="text-[var(--admin-text-soft)] shrink-0"
                    />
                    <span className="text-xs font-medium text-[var(--admin-text-soft)] truncate hidden sm:inline">
                      {currentGroup.shortLabel}
                    </span>
                  </>
                )}

                {currentDest &&
                  pathname !== "/admin" &&
                  pathname !== "/platform" &&
                  pathname !== "/portal" &&
                  pathname !== "/caregiver" && (
                    <>
                      <ChevronRight
                        size={13}
                        className="text-[var(--admin-text-soft)] shrink-0"
                      />
                      <span
                        aria-current="page"
                        className="text-xs font-semibold text-[var(--admin-text)] truncate"
                      >
                        {currentDest.label}
                      </span>
                    </>
                  )}
              </nav>

              {/* Center: Universal Command Bar */}
              <div className="flex-1 max-w-xl mx-auto px-2">
                <CommandCenter
                  role={role}
                  user={user}
                  currentPath={pathname}
                  placeholder={commandPlaceholder}
                />
              </div>

              {/* Right: Actions, Theme, Notifications & User Menu */}
              <div className="flex items-center gap-2 shrink-0">
                {headerExtra}

                {role === "admin" && (
                  <Link
                    href="/admin/billing"
                    className="hidden min-h-9 items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/15 dark:text-emerald-200 sm:inline-flex"
                    aria-label="Explore Premium plans and billing"
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    <span>Upgrade</span>
                  </Link>
                )}

                {/* Theme toggle */}
                <WorkspaceThemeToggle
                  mode={theme.mode}
                  resolved={theme.resolved}
                  onCycle={theme.cycle}
                />

                {/* Notifications Bell */}
                <WorkspaceBellButton role={role} unread={attention.count} />

                {/* User Menu */}
                <WorkspaceHeaderUserMenu
                  user={user}
                  role={role}
                  brand={defaultBrand}
                />
              </div>
            </header>

            {/* Main Content Body */}
            <main
              id="workspace-main-content"
              tabIndex={-1}
              className="workspace-main-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto"
            >
              {/* Contextual Task Surface (Surfacing nearby actions for medicines, patients, applications) */}
              <ContextualTaskSurface role={role} user={user} />

              {/* Page Title & Action Bar */}
              {(title || currentDest) && (
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-accent-text)]">
                      {currentGroup?.label || "Workspace"}
                    </p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--admin-text)] sm:text-3xl">
                      {title || currentDest?.label}
                    </h1>
                    {(subtitle || currentDest?.description) && (
                      <p className="mt-1 text-sm text-[var(--admin-text-muted)] max-w-3xl">
                        {subtitle || currentDest?.description}
                      </p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex items-center gap-2 shrink-0">
                      {actions}
                    </div>
                  )}
                </div>
              )}

              {/* Child Page Content */}
              <div className="min-w-0 w-full">{children}</div>
            </main>
          </div>

          {/* 3. Mobile Navigation Dock & Sheet */}
          <MobileWorkspaceDock
            role={role}
            user={user}
            brand={defaultBrand}
            attentionCounts={attention}
            onOpenCommandCenter={() => {
              // Trigger ⌘K programmatically
              window.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  bubbles: true,
                }),
              );
            }}
            themeControl={
              <WorkspaceThemeToggle
                mode={theme.mode}
                resolved={theme.resolved}
                onCycle={theme.cycle}
              />
            }
            pharmacySwitcher={pharmacySwitcher}
          />

          {/* Push Notifications & Realtime Alerts */}
          <PushNotificationCenter
            audience={role === "admin" ? "admin" : "portal"}
          />
          <LiveAlertCenter audience={role === "admin" ? "admin" : "portal"} />
        </div>
      </NavigationProgressProvider>
    </TenantBrandProvider>
  );
}

/* ============================================================
   SUBCOMPONENTS
   ============================================================ */

export function WorkspaceThemeToggle({
  mode,
  resolved,
  onCycle,
  className = "",
}: {
  mode: ThemeMode;
  resolved: "light" | "dark";
  onCycle: () => void;
  className?: string;
}) {
  const next =
    mode === "system" ? "light" : mode === "light" ? "dark" : "system";
  const label =
    mode === "system"
      ? `Theme: system (${resolved}). Switch to ${next} theme`
      : `Theme: ${mode}. Switch to ${next} theme`;
  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={onCycle}
      className={`theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function WorkspaceBellButton({
  role,
  unread,
}: {
  role: WorkspaceRole;
  unread: number;
}) {
  const href =
    role === "admin"
      ? "/admin/inbox"
      : role === "platform"
        ? "/platform/notifications"
        : role === "portal"
          ? "/portal/messages"
          : "/caregiver/notifications";

  return (
    <Link
      href={href}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
      aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
    >
      <Bell size={16} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
          {formatBadgeCount(unread)}
        </span>
      )}
    </Link>
  );
}

function WorkspaceHeaderUserMenu({
  user,
  role,
  brand,
}: {
  user: SessionUser;
  role: WorkspaceRole;
  brand: { name: string; slug?: string | null };
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const initials = (user.fullName || user.email || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) {
        menu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <details
      ref={menu}
      className="relative inline-block"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="flex items-center gap-2 h-9 px-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs font-semibold cursor-pointer select-none list-none"
        aria-label={`User account options for ${user.fullName || user.email}`}
      >
        <span className="grid place-items-center w-6 h-6 rounded-lg bg-teal-700 text-white font-bold text-[11px]">
          {initials}
        </span>
        <span className="hidden md:inline max-w-[120px] truncate text-[var(--admin-text)]">
          {user.fullName || user.email}
        </span>
        <ChevronDown size={13} className="text-[var(--admin-text-soft)]" />
      </summary>

      <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-panel)] p-3 shadow-2xl z-50 text-xs">
        <p className="font-semibold text-[var(--admin-text)] truncate">
          {user.fullName || "User"}
        </p>
        <p className="text-[11px] text-[var(--admin-text-soft)] truncate mt-0.5">
          {user.email}
        </p>
        <p className="mt-1 text-[10px] uppercase font-bold text-[var(--admin-accent-text)]">
          {user.role} · {brand.name}
        </p>

        <div className="mt-3 pt-2 border-t border-[var(--admin-border)] space-y-1">
          {brand.slug && (
            <Link
              href={`/p/${brand.slug}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              <Store size={14} /> View pharmacy website
            </Link>
          )}

          {role === "admin" && (
            <Link
              href="/admin/settings/location"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              Pharmacy settings
            </Link>
          )}

          {role === "platform" && (
            <Link
              href="/platform/security"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              Security credentials
            </Link>
          )}

          {role === "portal" && (
            <>
              <Link
                href="/portal/profile"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                My Profile & Medical Info
              </Link>
              <Link
                href="/portal/preferences"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                Notification Preferences
              </Link>
            </>
          )}

          {role === "caregiver" && (
            <>
              <Link
                href="/caregiver/patients"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                Managed Patients
              </Link>
              <Link
                href="/caregiver/notifications"
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                Alerts & Reminders
              </Link>
            </>
          )}

          <form action={logoutAction} className="pt-1">
            <button
              type="submit"
              className="w-full text-left px-2 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function WorkspaceUserRailControls({
  user,
  role,
  theme,
  brand,
}: {
  user: SessionUser;
  role: WorkspaceRole;
  theme: { mode: ThemeMode; resolved: "light" | "dark"; cycle: () => void };
  brand: { name: string; slug?: string | null };
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <WorkspaceThemeToggle
        mode={theme.mode}
        resolved={theme.resolved}
        onCycle={theme.cycle}
      />
    </div>
  );
}
