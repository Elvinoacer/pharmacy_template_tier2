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
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import { useSidebarCollapsed, useUnreadCount, useActivePath, isLinkActive } from "@/app/components/shell/useShell";
import { PushEnableChip, PushNotificationCenter } from "@/app/components/PushNotificationCenter";

export const PORTAL_LINKS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/refills", label: "Refills", icon: Pill },
  { href: "/portal/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/portal/caregivers", label: "Caregivers", icon: HeartHandshake },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
  { href: "/portal/loyalty", label: "Loyalty", icon: Sparkles },
  { href: "/portal/preferences", label: "Preferences", icon: Settings },
  { href: "/portal/profile", label: "Profile", icon: User },
  { href: "/portal/feedback", label: "Feedback", icon: Star },
] as const;

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
  const { collapsed, toggle, hydrated } = useSidebarCollapsed("portal");
  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = useUnreadCount();
  const pathname = useActivePath();

  return (
    <div
      className="shell-grid bg-[#f4f7f4] text-[#0c1a14]"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
    >
      {/* Desktop sidebar */}
      <aside className="shell-sidebar hidden lg:flex lg:flex-col border-r border-[#e3ebe6] bg-white">
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-[#e3ebe6]">
          <Link href="/portal" className="flex items-center gap-2.5 min-w-0">
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

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
          <ul className="space-y-1">
            {PORTAL_LINKS.map((l) => {
              const Icon = l.icon;
              const active = isLinkActive(pathname, l.href);
              return (
                <li key={l.href} className="relative tooltip-host">
                  <Link
                    href={l.href}
                    className={`nav-link-portal ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                    title={collapsed ? l.label : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{l.label}</span>}
                  </Link>
                  {collapsed && (
                    <span className="tooltip-right hidden lg:block">{l.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
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
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar-drawer lg:hidden flex flex-col bg-white">
            <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b border-[#e3ebe6]">
              <Link href="/portal" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
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
            <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
              <ul className="space-y-1">
                {PORTAL_LINKS.map((l) => {
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
          <Link href="/portal" className="hover:text-[#0d6e5a]">Portal</Link>
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

      <PushNotificationCenter audience="portal" />
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
   ============================================================ */

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "brand" | "accent" | "info" | "neutral";
}) {
  const accentClass =
    accent === "accent"
      ? "from-amber-400 to-amber-600"
      : accent === "info"
        ? "from-blue-400 to-blue-600"
        : accent === "neutral"
          ? "from-slate-400 to-slate-600"
          : "from-[#0d6e5a] to-[#084c3f]";

  return (
    <div className="card-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5a6b62]">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#0c1a14]">{value}</p>
          {hint && <p className="mt-1 text-xs text-[#5a6b62]">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white shadow-md`}>
            {(() => {
              const Icon = icon;
              return <Icon className="h-5 w-5" />;
            })()}
          </span>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-premium p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-[#0c1a14]">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[#5a6b62]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  className = "",
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const Icon = icon;
  return (
    <span className={`badge ${className}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e3ebe6] px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ef] text-[#0d6e5a]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#0c1a14]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-[#5a6b62]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
