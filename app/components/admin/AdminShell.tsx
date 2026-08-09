"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
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
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import {
  useSidebarCollapsed,
  useAttentionCounts,
  useActivePath,
  isLinkActive,
  formatBadgeCount,
} from "@/app/components/shell/useShell";
import { PushEnableChip, PushNotificationCenter } from "@/app/components/PushNotificationCenter";
import { LiveAlertCenter } from "@/app/components/LiveAlertCenter";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  // ── Analytics section (audit §73) ───────────────────────────
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/analytics/overview", label: "Overview", icon: BarChart3 },
  { href: "/admin/analytics/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/analytics/sales", label: "Sales", icon: ShoppingCart },
  { href: "/admin/analytics/payments", label: "Payments", icon: Wallet },
  { href: "/admin/analytics/prescriptions", label: "Rx Analytics", icon: Pill },
  { href: "/admin/analytics/refills", label: "Refill Analytics", icon: RefreshCw },
  { href: "/admin/analytics/inventory", label: "Inventory Analytics", icon: Package },
  { href: "/admin/analytics/products", label: "Products", icon: TrendingUp },
  { href: "/admin/analytics/customers", label: "Customers", icon: Users },
  { href: "/admin/analytics/staff", label: "Staff", icon: UserCheck },
  { href: "/admin/analytics/reconciliation", label: "Reconciliation", icon: Scale },
  // ── Operations ────────────────────────────────────────────────
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/refills", label: "Refills", icon: Pill },
  { href: "/admin/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail },
  { href: "/admin/messages", label: "Communication", icon: MessageSquare },
  { href: "/admin/feel", label: "How do you feel", icon: HeartPulse },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/segments", label: "Segments", icon: Layers },
  { href: "/admin/reminders", label: "Reminders", icon: CalendarClock },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/notifications", label: "Outbound Log", icon: Bell },
  { href: "/admin/ai", label: "AI Escalations", icon: Brain },
  { href: "/admin/loyalty", label: "Loyalty", icon: Sparkles },
  { href: "/admin/feedback", label: "Feedback", icon: Star },
  { href: "/admin/knowledge", label: "AI Knowledge", icon: BookOpen },
  { href: "/admin/templates", label: "Templates", icon: FileText },
  { href: "/admin/medications", label: "Medications", icon: Pill },
  { href: "/admin/services", label: "Services", icon: Stethoscope },
  { href: "/admin/inventory", label: "Inventory health", icon: Package },
  { href: "/admin/orders", label: "Orders & Revenue", icon: BarChart3 },
  { href: "/admin/settings/location", label: "Location", icon: MapPin },
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
  const { collapsed, toggle, hydrated } = useSidebarCollapsed("admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const attention = useAttentionCounts();
  const unread = attention.count;
  const feelBadge = attention.feel;
  const pathname = useActivePath();
  const theme = useAdminTheme();

  return (
    <div
      className="shell-grid-admin"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
      data-theme={theme.hydrated ? theme.resolved : undefined}
    >
      {/* Desktop sidebar */}
      <aside className="shell-sidebar admin-sidebar-surface hidden lg:flex lg:flex-col border-r">
        <div className="flex h-16 items-center gap-2.5 px-4 border-b admin-border">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <span className="admin-brand-mark">A</span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight admin-text">Aether CRM</p>
                <p className="truncate text-[10px] uppercase tracking-wider admin-soft">
                  {user.role}
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-admin px-3 py-4">
          <ul className="space-y-1">
            {ADMIN_LINKS.map((l) => {
              const Icon = l.icon;
              const active = isLinkActive(pathname, l.href);
              const showFeel = l.href === "/admin/feel" && feelBadge > 0;
              const badge = showFeel ? formatBadgeCount(feelBadge) : "";
              return (
                <li key={l.href} className="relative tooltip-host">
                  <Link
                    href={l.href}
                    className={`nav-link-admin ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : ""} ${
                      showFeel ? "!text-rose-600" : ""
                    }`}
                    title={
                      collapsed
                        ? showFeel
                          ? `${l.label} · ${feelBadge} new`
                          : l.label
                        : undefined
                    }
                  >
                    <span className="relative shrink-0">
                      <Icon className="h-[18px] w-[18px]" />
                      {collapsed && badge && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white">
                          {badge}
                        </span>
                      )}
                    </span>
                    {!collapsed && <span className="truncate">{l.label}</span>}
                    {!collapsed && badge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </Link>
                  {collapsed && (
                    <span className="tooltip-right hidden lg:block">
                      {showFeel ? `${l.label} · ${feelBadge} new` : l.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t admin-border p-3 space-y-1">
          <Link href="/" className={`nav-link-admin ${collapsed ? "justify-center px-2" : ""}`} title={collapsed ? "View website" : undefined}>
            <Home className="h-[18px] w-[18px]" />
            {!collapsed && <span>View website</span>}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className={`nav-link-admin w-full !text-rose-500 hover:!bg-rose-500/10 ${collapsed ? "justify-center px-2" : ""}`}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </form>
          <button
            type="button"
            onClick={toggle}
            className={`nav-link-admin w-full ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-drawer admin-sidebar-surface lg:hidden flex flex-col">
            <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b admin-border">
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <span className="admin-brand-mark">A</span>
                <div>
                  <p className="text-sm font-semibold leading-tight admin-text">Aether CRM</p>
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
            <nav className="flex-1 overflow-y-auto scroll-admin px-3 py-4">
              <ul className="space-y-1">
                {ADMIN_LINKS.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  const showFeel = l.href === "/admin/feel" && feelBadge > 0;
                  const badge = showFeel ? formatBadgeCount(feelBadge) : "";
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-link-admin ${active ? "active" : ""} ${
                          showFeel ? "!text-rose-600" : ""
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
            <div className="border-t admin-border p-3 space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="nav-link-admin">
                <Home className="h-[18px] w-[18px]" /> <span>View website</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="nav-link-admin w-full !text-rose-500 hover:!bg-rose-500/10">
                  <LogOut className="h-[18px] w-[18px]" /> <span>Sign out</span>
                </button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* Header */}
      <header className="shell-header admin-header-surface flex items-center gap-3 border-b px-4 sm:px-6 z-20">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-icon-admin lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-xs admin-soft">
          <Link href="/admin" className="hover:text-[var(--admin-accent)] transition-colors">CRM</Link>
          {pathname !== "/admin" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="admin-text font-medium">{title || pathname.split("/").pop()}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle mode={theme.mode} resolved={theme.resolved} onCycle={theme.cycle} />
          <PushEnableChip audience="admin" />
          <AdminBellButton unread={unread} />
          <AdminUserMenu user={user} />
        </div>
      </header>

      {/* Main scroll area */}
      <main className="shell-main scroll-admin">
        <div className="page-container-admin">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
              <div>
                {title && (
                  <h1
                    className="text-2xl font-bold tracking-tight admin-text sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-sm admin-muted">{subtitle}</p>}
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
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function AdminBellButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/admin/inbox"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full admin-muted transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
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
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-[var(--admin-hover)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="admin-brand-mark !h-8 !w-8 text-xs">{initials || "S"}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-xs font-semibold admin-text">
            {user.fullName || "Staff"}
          </span>
          <span className="block max-w-[160px] truncate text-[11px] admin-soft">{user.email}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="admin-menu absolute right-0 top-full z-40 mt-2 w-64 origin-top-right p-2 animate-scale-in">
            <div className="px-3 py-2 border-b admin-border">
              <p className="truncate text-sm font-semibold admin-text">{user.fullName || "Staff"}</p>
              <p className="truncate text-xs admin-muted">{user.email}</p>
              <p className="mt-1 inline-block rounded-full admin-chip-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {user.role}
              </p>
            </div>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm admin-muted hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              <Home className="h-4 w-4" /> View website
            </Link>
            <div className="my-1 h-px bg-[var(--admin-border)]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10"
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
