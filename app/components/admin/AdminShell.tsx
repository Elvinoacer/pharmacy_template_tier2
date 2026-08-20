"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Pill,
  Mail,
  MessageSquare,
  Megaphone,
  Layers,
  Bell,
  Inbox,
  Brain,
  Sparkles,
  Star,
  BookOpen,
  FileText,
  CalendarClock,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Home,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Package,
  HeartPulse,
  MapPin,
  Stethoscope,
  DollarSign,
  ShoppingCart,
  Wallet,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Scale,
  ClipboardList,
  ClipboardCheck,
  Receipt,
  Settings,
  Search,
  Pin,
  PinOff,
  ChevronDown,
  FolderKanban,
  Zap,
  Activity,
  Boxes,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import {
  useSidebarEnhanced,
  useAttentionCounts,
  useActivePath,
  isLinkActive,
  formatBadgeCount,
} from "@/app/components/shell/useShell";
import { PushEnableChip, PushNotificationCenter } from "@/app/components/PushNotificationCenter";
import { LiveAlertCenter } from "@/app/components/LiveAlertCenter";

export const ADMIN_GROUPS = {
  main: { label: "Main", icon: LayoutDashboard },
  clinical: { label: "Pharmacy & Clinical", icon: Stethoscope },
  commerce: { label: "Commerce & Inventory", icon: Package },
  care: { label: "Patient Care & CRM", icon: HeartPulse },
  intelligence: { label: "Intelligence & Settings", icon: Sparkles },
} as const;

export const ADMIN_LINKS = [
  // ── Main Overview ──
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "main", description: "Overview & key metrics" },

  // ── Pharmacy & Clinical Operations ──
  {
    href: "/admin/prescriptions",
    label: "Prescriptions & Intake",
    icon: FileText,
    group: "clinical",
    description: "9-channel intake & review",
  },
  {
    href: "/admin/refills",
    label: "Refill Requests",
    icon: RefreshCw,
    group: "clinical",
    description: "Course renewal queue",
  },
  {
    href: "/admin/dispensing",
    label: "Dispensing Register",
    icon: ClipboardCheck,
    group: "clinical",
    description: "Controlled prescription log",
  },
  {
    href: "/admin/medications",
    label: "Medication Catalogue",
    icon: Pill,
    group: "clinical",
    description: "Drug master & inventory",
  },
  {
    href: "/admin/services",
    label: "Clinical Services",
    icon: Stethoscope,
    group: "clinical",
    description: "Consults & vaccinations",
  },

  // ── Commerce & Inventory ──
  {
    href: "/admin/orders",
    label: "Orders & POS",
    icon: ShoppingCart,
    group: "commerce",
    description: "Counter sales & invoices",
  },
  {
    href: "/admin/inventory",
    label: "Inventory & Stock",
    icon: Boxes,
    group: "commerce",
    description: "FEFO batches & expiry",
  },
  {
    href: "/admin/customers",
    label: "Patients & Customers",
    icon: Users,
    group: "commerce",
    description: "Patient profiles & records",
  },

  // ── Patient Care & Outreach ──
  {
    href: "/admin/inbox",
    label: "Messages & Enquiries",
    icon: Inbox,
    group: "care",
    description: "WhatsApp & email inbox",
  },
  {
    href: "/admin/feel",
    label: "Symptom Check-ins",
    icon: HeartPulse,
    group: "care",
    badgeKey: "feel",
    description: "Patient adherence checks",
  },
  {
    href: "/admin/campaigns",
    label: "Campaigns & Outreach",
    icon: Megaphone,
    group: "care",
    description: "SMS, WhatsApp & email",
  },
  {
    href: "/admin/reminders",
    label: "Automated Reminders",
    icon: CalendarClock,
    group: "care",
    description: "Refill & dose notifications",
  },
  {
    href: "/admin/loyalty",
    label: "Loyalty & Feedback",
    icon: Star,
    group: "care",
    description: "Rewards & customer reviews",
  },

  // ── Intelligence & Settings ──
  {
    href: "/admin/analytics",
    label: "Analytics & Reports",
    icon: TrendingUp,
    group: "intelligence",
    description: "Revenue, refills & audit",
  },
  {
    href: "/admin/ai",
    label: "AI Agent & Knowledge",
    icon: Brain,
    group: "intelligence",
    description: "Escalations & clinical AI",
  },
  {
    href: "/admin/settings/location",
    label: "Pharmacy Settings",
    icon: Settings,
    group: "intelligence",
    description: "Store & branch config",
  },
] as const;

type ThemeMode = "light" | "dark" | "system";
const THEME_KEY = "aether-admin-theme";

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function useAdminTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeMode | null) || "system";
    const next = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setMode(next);
    setResolved(resolveTheme(next));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const apply = () => setResolved(resolveTheme(mode));
    apply();
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, hydrated]);

  const setTheme = (next: ThemeMode) => {
    setMode(next);
    localStorage.setItem(THEME_KEY, next);
    setResolved(resolveTheme(next));
  };

  const cycle = () => {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const i = order.indexOf(mode);
    setTheme(order[(i + 1) % order.length]);
  };

  return { mode, resolved, setTheme, cycle, hydrated };
}

export function AdminShell({
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
  const {
    collapsed,
    toggle,
    hydrated,
    width,
    pinned,
    togglePin,
    isPinned,
    startResize,
    isResizing,
    toggleGroup,
    isGroupCollapsed,
  } = useSidebarEnhanced("admin");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const attention = useAttentionCounts();
  const unread = attention.count;
  const feelBadge = attention.feel;
  const pathname = useActivePath();
  const theme = useAdminTheme();

  // Filter links if search is active
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return ADMIN_LINKS;
    const q = searchQuery.toLowerCase().trim();
    return ADMIN_LINKS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        (l as any).description?.toLowerCase().includes(q) ||
        l.group.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Separate pinned and unpinned links
  const pinnedLinks = useMemo(
    () => ADMIN_LINKS.filter((l) => pinned.includes(l.href)),
    [pinned]
  );
  const unpinnedLinks = useMemo(
    () => filteredLinks.filter((l) => !pinned.includes(l.href)),
    [filteredLinks, pinned]
  );

  // Group unpinned links
  const groupedLinks = useMemo(() => {
    const map: Record<string, Array<(typeof ADMIN_LINKS)[number]>> = {};
    unpinnedLinks.forEach((link) => {
      const g = link.group || "main";
      if (!map[g]) map[g] = [];
      map[g].push(link);
    });
    return map;
  }, [unpinnedLinks]);

  const groupOrder = Object.keys(ADMIN_GROUPS);
  const orderedGroups = groupOrder.filter((g) => groupedLinks[g] && groupedLinks[g].length > 0);

  return (
    <div
      className="shell-grid-admin"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
      data-theme={theme.hydrated ? theme.resolved : undefined}
      style={
        hydrated && !collapsed
          ? ({ "--sidebar-width": `${width}px` } as React.CSSProperties)
          : undefined
      }
    >
      {/* ── Desktop Sidebar ── */}
      <aside
        className="shell-sidebar admin-sidebar-surface hidden lg:flex lg:flex-col border-r relative z-30 select-none"
        style={
          hydrated && !collapsed
            ? ({ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } as React.CSSProperties)
            : undefined
        }
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b admin-border">
          <Link href="/admin" className="flex items-center gap-3 min-w-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-extrabold text-sm shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform">
              Rx
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight admin-text">
                  Pharmacy Care
                </p>
                <p className="truncate text-[10px] uppercase tracking-widest font-semibold text-emerald-700 dark:text-emerald-400">
                  {user.role} workspace
                </p>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] transition"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Menu Search (when expanded) */}
        {!collapsed && (
          <div className="px-3 pt-3.5 pb-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to menu..."
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] py-1.5 pl-8 pr-7 text-xs admin-text placeholder:admin-soft focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto scroll-admin px-3 py-3 space-y-4">
          {/* Pinned Quick Links */}
          {!collapsed && pinnedLinks.length > 0 && !searchQuery && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider admin-soft">
                <span className="inline-flex items-center gap-1">
                  <Pin className="h-3 w-3 text-emerald-600" /> Pinned Favorites
                </span>
              </div>
              <ul className="space-y-0.5">
                {pinnedLinks.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  const showFeel = (l as any).badgeKey === "feel" && feelBadge > 0;
                  const badge = showFeel ? formatBadgeCount(feelBadge) : "";

                  return (
                    <li key={l.href} className="relative group">
                      <Link
                        href={l.href}
                        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                          active
                            ? "bg-gradient-to-r from-emerald-600/15 to-teal-600/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-2 border-emerald-600"
                            : "admin-text hover:bg-[var(--admin-hover)]"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="truncate flex-1">{l.label}</span>
                        {badge && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                            {badge}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            togglePin(l.href);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
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

          {/* Collapsed icon-only mode */}
          {collapsed && (
            <ul className="space-y-2 text-center">
              {ADMIN_LINKS.map((l) => {
                const Icon = l.icon;
                const active = isLinkActive(pathname, l.href);
                const showFeel = (l as any).badgeKey === "feel" && feelBadge > 0;

                return (
                  <li key={l.href} className="relative flex justify-center">
                    <Link
                      href={l.href}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                        active
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                          : "admin-text hover:bg-[var(--admin-hover)]"
                      }`}
                      title={`${l.label}${l.description ? ` · ${l.description}` : ""}`}
                    >
                      <Icon className="h-5 w-5" />
                      {showFeel && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Grouped Accordion Navigation (Expanded Mode) */}
          {!collapsed &&
            orderedGroups.map((groupId) => {
              const groupDef = ADMIN_GROUPS[groupId as keyof typeof ADMIN_GROUPS];
              const groupLabel = groupDef?.label || groupId;
              const GroupIcon = groupDef?.icon || FolderKanban;
              const links = groupedLinks[groupId] || [];
              const isCollapsed = isGroupCollapsed(groupId);

              return (
                <div key={groupId} className="space-y-1">
                  {/* Group header toggle */}
                  {groupId !== "main" && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupId)}
                      className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider admin-soft hover:text-[var(--admin-text)] transition group rounded-lg"
                      title={isCollapsed ? `Expand ${groupLabel}` : `Collapse ${groupLabel}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <GroupIcon className="h-3 w-3 text-emerald-600 opacity-80" />
                        <span>{groupLabel}</span>
                      </div>
                      <ChevronDown
                        className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                    </button>
                  )}

                  {/* Group link items */}
                  {(!isCollapsed || groupId === "main") && (
                    <ul className="space-y-0.5">
                      {links.map((l) => {
                        const Icon = l.icon;
                        const active = isLinkActive(pathname, l.href);
                        const isItemPinned = isPinned(l.href);
                        const showFeel = (l as any).badgeKey === "feel" && feelBadge > 0;
                        const badge = showFeel ? formatBadgeCount(feelBadge) : "";

                        return (
                          <li key={l.href} className="relative group">
                            <Link
                              href={l.href}
                              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition ${
                                active
                                  ? "bg-gradient-to-r from-emerald-600/15 to-teal-600/10 text-emerald-800 dark:text-emerald-300 font-bold border-l-2 border-emerald-600 shadow-sm"
                                  : "admin-text hover:bg-[var(--admin-hover)]"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 shrink-0 ${
                                  active ? "text-emerald-600" : "admin-soft group-hover:text-emerald-600"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <span className="truncate block leading-tight">{l.label}</span>
                              </div>

                              {badge && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
                                  {badge}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  togglePin(l.href);
                                }}
                                className={`opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition ${
                                  isItemPinned ? "!opacity-100 text-emerald-600" : ""
                                }`}
                                title={isItemPinned ? "Unpin favorite" : "Pin to favorites"}
                              >
                                {isItemPinned ? (
                                  <Pin className="h-3 w-3 fill-current text-emerald-600" />
                                ) : (
                                  <PinOff className="h-3 w-3" />
                                )}
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

        {/* ── Footer Actions ── */}
        <div className="border-t admin-border p-3 space-y-1.5">
          <Link
            href="/"
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium admin-soft hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] transition ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title="View public patient storefront"
          >
            <Home className="h-4 w-4 shrink-0 text-emerald-600" />
            {!collapsed && <span>Patient Storefront</span>}
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition ${
                collapsed ? "justify-center px-0" : ""
              }`}
              title="Sign out"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>

          {collapsed && (
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] transition"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Drag resize handle */}
        {!collapsed && (
          <div
            className={`sidebar-resize-handle ${isResizing ? "resizing" : ""}`}
            onMouseDown={startResize}
            title="Drag to resize sidebar width"
          />
        )}
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileOpen && (
        <>
          <div className="sidebar-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-drawer admin-sidebar-surface lg:hidden flex flex-col z-50">
            <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b admin-border">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs shadow-md">
                  Rx
                </div>
                <div>
                  <p className="text-sm font-bold admin-text">Pharmacy Care</p>
                  <p className="text-[10px] uppercase tracking-wider admin-soft">{user.role}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-icon-admin"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto scroll-admin px-3 py-4 space-y-4">
              {orderedGroups.map((groupId) => {
                const groupDef = ADMIN_GROUPS[groupId as keyof typeof ADMIN_GROUPS];
                const groupLabel = groupDef?.label || groupId;
                const GroupIcon = groupDef?.icon || FolderKanban;
                const links = groupedLinks[groupId] || [];

                return (
                  <div key={groupId} className="space-y-1">
                    {groupId !== "main" && (
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider admin-soft">
                        <GroupIcon className="h-3 w-3 text-emerald-600" />
                        <span>{groupLabel}</span>
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {links.map((l) => {
                        const Icon = l.icon;
                        const active = isLinkActive(pathname, l.href);
                        const showFeel = (l as any).badgeKey === "feel" && feelBadge > 0;
                        const badge = showFeel ? formatBadgeCount(feelBadge) : "";

                        return (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                active
                                  ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/20"
                                  : "admin-text hover:bg-[var(--admin-hover)]"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex-1">{l.label}</span>
                              {badge && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                                  {badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>

            <div className="border-t admin-border p-3 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium admin-soft hover:bg-[var(--admin-hover)]"
              >
                <Home className="h-4 w-4 text-emerald-600" /> <span>Patient Storefront</span>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" /> <span>Sign Out</span>
                </button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* ── Top Header ── */}
      <header className="shell-header admin-header-surface flex items-center gap-3 border-b px-4 sm:px-6 z-20">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-icon-admin lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs admin-soft">
          <Link href="/admin" className="hover:text-[var(--admin-accent)] transition-colors font-medium">
            Admin
          </Link>
          {pathname !== "/admin" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <span className="admin-text font-bold">{title || pathname.split("/").pop()}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle mode={theme.mode} resolved={theme.resolved} onCycle={theme.cycle} />
          <PushEnableChip audience="admin" />
          <AdminBellButton unread={unread} />
          <AdminUserMenu user={user} />
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="shell-main scroll-admin">
        <div className="page-container-admin">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
              <div>
                {title && (
                  <h1
                    className="text-2xl font-extrabold tracking-tight admin-text sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-xs sm:text-sm admin-muted">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>

      <PushNotificationCenter audience="admin" />
      <LiveAlertCenter audience="admin" />
    </div>
  );
}

function ThemeToggle({
  mode,
  resolved,
  onCycle,
}: {
  mode: ThemeMode;
  resolved: "light" | "dark";
  onCycle: () => void;
}) {
  const label =
    mode === "system"
      ? `Theme: system (${resolved})`
      : mode === "dark"
      ? "Theme: dark"
      : "Theme: light";
  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={onCycle}
      className="btn-icon-admin"
      aria-label={label}
      title={`${label} — click to cycle`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function AdminBellButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/admin/inbox"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl admin-muted transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
      aria-label={`Notifications${unread ? ` · ${unread} unread` : ""}`}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function AdminUserMenu({ user }: { user: SessionUser }) {
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
        className="flex items-center gap-2 rounded-xl p-1 pr-2.5 transition hover:bg-[var(--admin-hover)] border border-[var(--admin-border)] bg-[var(--admin-card)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white text-xs shadow-sm">
          {initials || "S"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-xs font-bold admin-text leading-tight">
            {user.fullName || "Staff"}
          </span>
          <span className="block max-w-[140px] truncate text-[10px] admin-soft leading-tight">
            {user.email}
          </span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="admin-menu absolute right-0 top-full z-40 mt-2 w-64 origin-top-right p-2 animate-scale-in rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl">
            <div className="px-3 py-2.5 border-b admin-border">
              <p className="truncate text-sm font-bold admin-text">{user.fullName || "Staff"}</p>
              <p className="truncate text-xs admin-muted">{user.email}</p>
              <p className="mt-1.5 inline-block rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {user.role} role
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium admin-text hover:bg-[var(--admin-hover)]"
              >
                <Home className="h-4 w-4 text-emerald-600" /> View Patient Storefront
              </Link>
              <Link
                href="/admin/settings/location"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium admin-text hover:bg-[var(--admin-hover)]"
              >
                <Settings className="h-4 w-4 text-emerald-600" /> Pharmacy Settings
              </Link>
            </div>
            <div className="my-1 h-px bg-[var(--admin-border)]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
