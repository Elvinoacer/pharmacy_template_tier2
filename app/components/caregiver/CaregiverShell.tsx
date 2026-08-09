"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HeartHandshake,
  Users,
  Pill,
  Bell,
  Activity,
  Clock,
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import { useSidebarEnhanced, useActivePath, isLinkActive } from "@/app/components/shell/useShell";

export const CAREGIVER_LINKS = [
  { href: "/caregiver", label: "Dashboard", icon: HeartHandshake },
  { href: "/caregiver/patients", label: "My Patients", icon: Users },
  { href: "/caregiver/refills", label: "Refill Requests", icon: Pill },
  { href: "/caregiver/reminders", label: "Reminders", icon: Clock },
  { href: "/caregiver/notifications", label: "Notifications", icon: Bell },
  { href: "/caregiver/adherence", label: "Adherence", icon: Activity },
] as const;

export function CaregiverShell({
  user,
  children,
  title,
  subtitle,
  actions,
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { collapsed, toggle, hydrated, width, pinned, togglePin, isPinned, startResize, isResizing } = useSidebarEnhanced("caregiver");
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useActivePath();

  // Separate pinned and unpinned links
  const pinnedLinks = CAREGIVER_LINKS.filter((l) => pinned.includes(l.href));
  const otherLinks = CAREGIVER_LINKS.filter((l) => !pinned.includes(l.href));

  return (
    <div
      className="shell-grid bg-[#f4f7f4] text-[#0c1a14]"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
      style={hydrated && !collapsed ? { "--sidebar-width": `${width}px` } as React.CSSProperties : undefined}
    >
      {/* Desktop sidebar */}
      <aside 
        className="shell-sidebar caregiver-sidebar-surface hidden lg:flex lg:flex-col border-r border-[#e3ebe6] bg-white relative"
        style={hydrated && !collapsed ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } as React.CSSProperties : undefined}
      >
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-[#e3ebe6]">
          <Link href="/caregiver" className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-md shadow-teal-900/20">
              <HeartHandshake className="h-4 w-4" />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-[#0c1a14]">Caregiver Portal</p>
                <p className="truncate text-[11px] text-[#5a6b62]">Aether Pharmacy</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
          {/* Pinned section */}
          {!collapsed && pinnedLinks.length > 0 && (
            <div className="sidebar-nav-section">
              <div className="sidebar-nav-label">
                <span>Pinned</span>
              </div>
              <ul className="space-y-1">
                {pinnedLinks.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  return (
                    <li key={l.href} className="relative tooltip-host nav-link-pinned is-pinned">
                      <Link
                        href={l.href}
                        className={`nav-link-portal ${active ? "active" : ""} pr-8`}
                        title={l.label}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{l.label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            togglePin(l.href);
                          }}
                          className="pin-toggle-btn is-pinned absolute right-1 top-1/2 -translate-y-1/2"
                          title="Unpin"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* All/Other links section */}
          <div className="sidebar-nav-section">
            {!collapsed && pinnedLinks.length > 0 && (
              <div className="sidebar-nav-label">
                <span>Navigation</span>
              </div>
            )}
            <ul className="space-y-1">
              {(collapsed ? CAREGIVER_LINKS : otherLinks).map((l) => {
                const Icon = l.icon;
                const active = isLinkActive(pathname, l.href);
                const isItemPinned = isPinned(l.href);
                return (
                  <li key={l.href} className={`relative tooltip-host nav-link-pinned ${isItemPinned ? "is-pinned" : ""}`}>
                    <Link
                      href={l.href}
                      className={`nav-link-portal ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : "pr-8"}`}
                      title={collapsed ? l.label : undefined}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{l.label}</span>}
                      {!collapsed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            togglePin(l.href);
                          }}
                          className={`pin-toggle-btn absolute right-1 top-1/2 -translate-y-1/2 ${isItemPinned ? "is-pinned" : ""}`}
                          title={isItemPinned ? "Unpin" : "Pin to top"}
                        >
                          {isItemPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                        </button>
                      )}
                    </Link>
                    {collapsed && (
                      <span className="tooltip-right hidden lg:block">{l.label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="border-t border-[#e3ebe6] p-3 space-y-1">
          <button
            type="button"
            onClick={toggle}
            className="nav-link-portal w-full"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <Link href="/" className="nav-link-portal" title="Back to website">
            <Home className="h-[18px] w-[18px]" />
            {!collapsed && <span>Back to website</span>}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="nav-link-portal w-full text-rose-600 hover:bg-rose-50">
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </form>
        </div>

        {/* Resize handle */}
        {!collapsed && (
          <div
            className={`sidebar-resize-handle ${isResizing ? "resizing" : ""}`}
            onMouseDown={startResize}
            title="Drag to resize sidebar"
          />
        )}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-drawer lg:hidden flex flex-col bg-white">
            <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b border-[#e3ebe6]">
              <Link href="/caregiver" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight text-[#0c1a14]">Caregiver Portal</p>
                  <p className="text-[11px] text-[#5a6b62]">Aether Pharmacy</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-icon"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
              <ul className="space-y-1">
                {CAREGIVER_LINKS.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-link-portal ${active ? "active" : ""}`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{l.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-t border-[#e3ebe6] p-3 space-y-1">
              <Link href="/" className="nav-link-portal">
                <Home className="h-[18px] w-[18px]" /> <span>Back to website</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="nav-link-portal w-full text-rose-600 hover:bg-rose-50">
                  <LogOut className="h-[18px] w-[18px]" /> <span>Sign out</span>
                </button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* Header */}
      <header className="shell-header flex items-center gap-3 border-b border-[#e3ebe6] bg-white/95 px-4 backdrop-blur sm:px-6 z-20">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-icon lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#8a9a92]">
          <Link href="/caregiver" className="hover:text-[#0d6e5a]">Caregiver</Link>
          {pathname !== "/caregiver" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#0c1a14] font-medium">{title || pathname.split("/").pop()}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/caregiver/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5a6b62] transition hover:bg-[#e6f4ef] hover:text-[#084c3f]"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>
          <div className="hidden text-left sm:block">
            <span className="block max-w-[160px] truncate text-xs font-semibold text-[#0c1a14]">
              {user.fullName || "Caregiver"}
            </span>
            <span className="block max-w-[160px] truncate text-[11px] text-[#5a6b62]">{user.email}</span>
          </div>
        </div>
      </header>

      {/* Main scroll area */}
      <main className="shell-main scroll-thin">
        <div className="page-container">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
              <div>
                {title && (
                  <h1
                    className="text-2xl font-bold tracking-tight text-[#0c1a14] sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-[#5a6b62]">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export { StatCard, Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
