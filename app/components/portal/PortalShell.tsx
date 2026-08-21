"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Pill,
  FileText,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Settings,
  User,
  Star,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  X,
  Home,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  HeartPulse,
  Pin,
  PinOff,
  FolderKanban,
  ClipboardList,
  CreditCard,
  Calendar,
  RefreshCw,
  Activity,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import {
  useSidebarEnhanced,
  useSidebarScroll,
  useAttentionCounts,
  useActivePath,
  isLinkActive,
  formatBadgeCount,
} from "@/app/components/shell/useShell";
import { PushEnableChip, PushNotificationCenter } from "@/app/components/PushNotificationCenter";
import { LiveAlertCenter } from "@/app/components/LiveAlertCenter";

export const PORTAL_LINKS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, group: "overview" },
  { href: "/portal/refills", label: "Refills", icon: Pill, group: "medications" },
  { href: "/portal/prescriptions", label: "Prescriptions", icon: FileText, group: "medications" },
  { href: "/portal/calendar", label: "Medication Calendar", icon: Calendar, group: "medications" },
  { href: "/portal/sync", label: "Refill Synchronization", icon: RefreshCw, group: "medications" },
  { href: "/portal/counselling", label: "Medication Counselling", icon: HeartPulse, group: "medications" },
  { href: "/portal/orders", label: "Orders", icon: ShoppingCart, group: "orders" },
  { href: "/portal/screenings", label: "Health Screenings", icon: Activity, group: "health" },
  { href: "/portal/feel", label: "How do you feel?", icon: HeartPulse, group: "health" },
  { href: "/portal/caregivers", label: "Caregivers", icon: HeartHandshake, group: "health" },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare, group: "communication" },
  { href: "/portal/loyalty", label: "Loyalty", icon: Sparkles, group: "rewards" },
  { href: "/portal/preferences", label: "Preferences", icon: Settings, group: "settings" },
  { href: "/portal/profile", label: "Profile", icon: User, group: "settings" },
  { href: "/portal/feedback", label: "Feedback", icon: Star, group: "settings" },
] as const;

export const PORTAL_GROUPS = {
  overview: { label: "Overview", icon: LayoutDashboard },
  medications: { label: "Medications", icon: Pill },
  orders: { label: "Orders & Shopping", icon: ShoppingCart },
  health: { label: "Health & Care", icon: HeartPulse },
  communication: { label: "Communication", icon: MessageSquare },
  rewards: { label: "Rewards", icon: Sparkles },
  settings: { label: "Settings", icon: Settings },
} as const;

export function PortalShell({
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
  const { collapsed, toggle, hydrated, width, pinned, togglePin, isPinned, startResize, isResizing, collapsedGroups, toggleGroup, isGroupCollapsed } = useSidebarEnhanced("portal");
  const { navRef: desktopNavRef, handleScroll: handleDesktopScroll } = useSidebarScroll("portal");
  const { navRef: mobileNavRef, handleScroll: handleMobileScroll } = useSidebarScroll("portal_mobile");
  const [mobileOpen, setMobileOpen] = useState(false);
  const attention = useAttentionCounts();
  const unread = attention.count;
  const feelBadge = attention.feel;
  const pathname = useActivePath();

  // Separate pinned and unpinned links
  const pinnedLinks = PORTAL_LINKS.filter((l) => pinned.includes(l.href));
  const otherLinks = PORTAL_LINKS.filter((l) => !pinned.includes(l.href));

  // Group the non-pinned links by their group
  const groupedLinks: Record<string, Array<(typeof PORTAL_LINKS)[number]>> = {};
  otherLinks.forEach((link) => {
    const groupName = link.group || "other";
    if (!groupedLinks[groupName]) {
      groupedLinks[groupName] = [];
    }
    groupedLinks[groupName].push(link);
  });

  // Get ordered group keys based on PORTAL_GROUPS definition
  const groupOrder = Object.keys(PORTAL_GROUPS);
  const orderedGroups = groupOrder.filter((g) => groupedLinks[g]);
  // Add any groups not in PORTAL_GROUPS (like "other") at the end
  const extraGroups = Object.keys(groupedLinks).filter((g) => !groupOrder.includes(g));
  const allGroups = [...orderedGroups, ...extraGroups];

  return (
    <div
      className="shell-grid bg-[#f4f7f4] text-[#0c1a14]"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
      style={hydrated && !collapsed ? { "--sidebar-width": `${width}px` } as React.CSSProperties : undefined}
    >
      {/* Desktop sidebar */}
      <aside 
        className="shell-sidebar hidden lg:flex lg:flex-col border-r border-[#e3ebe6] bg-white relative"
        style={hydrated && !collapsed ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } as React.CSSProperties : undefined}
      >
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-[#e3ebe6]">
          <Link href="/portal" scroll={false} className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white font-bold shadow-md shadow-teal-900/20">
              A
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-[#0c1a14]">Customer Portal</p>
                <p className="truncate text-[11px] text-[#5a6b62]">Aether Pharmacy</p>
              </div>
            )}
          </Link>
        </div>

        <nav
          ref={desktopNavRef}
          onScroll={handleDesktopScroll}
          className="flex-1 overflow-y-auto scroll-thin px-3 py-4"
        >
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
                  const showFeel = l.href === "/portal/feel" && feelBadge > 0;
                  const badge = showFeel ? formatBadgeCount(feelBadge) : "";
                  return (
                    <li key={l.href} className="relative tooltip-host nav-link-pinned is-pinned">
                      <Link
                        href={l.href}
                        scroll={false}
                        data-active={active ? "true" : undefined}
                        className={`nav-link-portal ${active ? "active" : ""} pr-8`}
                        title={showFeel ? `${l.label} · ${feelBadge} new` : l.label}
                      >
                        <span className="relative shrink-0">
                          <Icon className="h-[18px] w-[18px]" />
                          {badge && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </span>
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

          {/* Grouped navigation sections */}
          {!collapsed && allGroups.map((groupId) => {
            const groupDef = PORTAL_GROUPS[groupId as keyof typeof PORTAL_GROUPS];
            const groupLabel = groupDef?.label || groupId;
            const GroupIcon = groupDef?.icon || FolderKanban;
            const links = groupedLinks[groupId];
            const isCollapsed = isGroupCollapsed(groupId);

            return (
              <div key={groupId} className="sidebar-nav-section">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupId)}
                  className="sidebar-nav-label w-full hover:bg-[#eef5f2] rounded-lg transition-colors"
                  title={isCollapsed ? `Expand ${groupLabel}` : `Collapse ${groupLabel}`}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{groupLabel}</span>
                    <span className="ml-1 text-[10px] opacity-60">({links.length})</span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </button>
                {!isCollapsed && (
                  <ul className="space-y-1 mt-1">
                    {links.map((l) => {
                      const Icon = l.icon;
                      const active = isLinkActive(pathname, l.href);
                      const showFeel = l.href === "/portal/feel" && feelBadge > 0;
                      const badge = showFeel ? formatBadgeCount(feelBadge) : "";
                      const isItemPinned = isPinned(l.href);
                      return (
                        <li key={l.href} className={`relative tooltip-host nav-link-pinned ${isItemPinned ? "is-pinned" : ""}`}>
                          <Link
                            href={l.href}
                            scroll={false}
                            data-active={active ? "true" : undefined}
                            className={`nav-link-portal ${active ? "active" : ""} pr-8 ${
                              showFeel ? "!text-rose-700" : ""
                            }`}
                            title={showFeel ? `${l.label} · ${feelBadge} new` : l.label}
                          >
                            <span className="relative shrink-0">
                              <Icon className="h-[18px] w-[18px]" />
                              {badge && (
                                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white">
                                  {badge}
                                </span>
                              )}
                            </span>
                            <span className="truncate">{l.label}</span>
                            {badge && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                                {badge}
                              </span>
                            )}
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
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[#e3ebe6] p-3">
          <button
            type="button"
            onClick={toggle}
            className="nav-link-portal w-full"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
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
              <Link href="/portal" scroll={false} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white font-bold">
                  A
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight text-[#0c1a14]">Customer Portal</p>
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
            <nav
              ref={mobileNavRef}
              onScroll={handleMobileScroll}
              className="flex-1 overflow-y-auto scroll-thin px-3 py-4"
            >
              <ul className="space-y-1">
                {PORTAL_LINKS.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  const showFeel = l.href === "/portal/feel" && feelBadge > 0;
                  const badge = showFeel ? formatBadgeCount(feelBadge) : "";
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        scroll={false}
                        data-active={active ? "true" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-link-portal ${active ? "active" : ""} ${
                          showFeel ? "!text-rose-700" : ""
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{l.label}</span>
                        {badge && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                            {badge}
                          </span>
                        )}
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
          <Link href="/portal" scroll={false} className="hover:text-[#0d6e5a]">Portal</Link>
          {pathname !== "/portal" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#0c1a14] font-medium">{title || pathname.split("/").pop()}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <PushEnableChip audience="portal" />
          <BellButton unread={unread} />
          <Link href="/" className="btn-icon hidden sm:inline-flex" title="View website" aria-label="View website">
            <Home className="h-[18px] w-[18px]" />
          </Link>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Main scroll area */}
      <main className="shell-main scroll-thin">
        <div className="page-container">
          {(title || actions) && (
            <div className="mb-5 flex flex-col gap-3 animate-fade-up sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                {title && (
                  <h1
                    className="text-xl font-bold tracking-tight text-[#0c1a14] sm:text-2xl md:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-xs text-[#5a6b62] sm:text-sm">{subtitle}</p>
                )}
              </div>
              {actions && (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  {actions}
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </main>

      <PushNotificationCenter audience="portal" />
      <LiveAlertCenter audience="portal" />
    </div>
  );
}

function BellButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/portal/messages"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5a6b62] transition hover:bg-[#e6f4ef] hover:text-[#084c3f]"
      aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
    >
      <Bell className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const initials = (user.fullName || user.email || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-[#e6f4ef]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-xs font-bold text-white">
          {initials || "U"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-xs font-semibold text-[#0c1a14]">
            {user.fullName || "Customer"}
          </span>
          <span className="block max-w-[160px] truncate text-[11px] text-[#5a6b62]">{user.email}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border border-[#e3ebe6] bg-white p-2 shadow-xl animate-scale-in">
            <div className="px-3 py-2 border-b border-[#e3ebe6]">
              <p className="truncate text-sm font-semibold text-[#0c1a14]">{user.fullName || "Customer"}</p>
              <p className="truncate text-xs text-[#5a6b62]">{user.email}</p>
            </div>
            <Link
              href="/portal/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#3d4f46] hover:bg-[#e6f4ef]"
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            <Link
              href="/portal/preferences"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#3d4f46] hover:bg-[#e6f4ef]"
            >
              <Settings className="h-4 w-4" /> Preferences
            </Link>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#3d4f46] hover:bg-[#e6f4ef]"
            >
              <Home className="h-4 w-4" /> View website
            </Link>
            <div className="my-1 h-px bg-[#e3ebe6]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Reusable building blocks (kept stable for the existing pages)

   StatCard, Panel, Badge, and EmptyState live in PortalWidgets.tsx,
   a Server Component file, and are re-exported here so every
   existing `import { ... } from "@/app/components/portal/PortalShell"`
   keeps working unchanged. They can't be defined in *this* file:
   this file starts with "use client", which would force them to be
   Client Components too, and several /portal pages pass lucide
   icon components into their `icon` prop from Server Components —
   React can't serialize a component reference across that boundary.
   See PortalWidgets.tsx for details. Do not move them back here.
   ============================================================ */
export { StatCard, Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
