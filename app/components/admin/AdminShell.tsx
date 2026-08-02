"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  Users,
  Pill,
  Mail,
  MessageSquare,
  Megaphone,
  Layers,
  Bell,
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
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";
import { useSidebarCollapsed, useUnreadCount, useActivePath, isLinkActive } from "@/app/components/shell/useShell";
import { PushNotificationCenter } from "@/app/components/PushNotificationCenter";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/refills", label: "Refills", icon: Pill },
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail },
  { href: "/admin/messages", label: "Communication", icon: MessageSquare },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/segments", label: "Segments", icon: Layers },
  { href: "/admin/reminders", label: "Reminders", icon: CalendarClock },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/ai", label: "AI Escalations", icon: Brain },
  { href: "/admin/loyalty", label: "Loyalty", icon: Sparkles },
  { href: "/admin/feedback", label: "Feedback", icon: Star },
  { href: "/admin/knowledge", label: "AI Knowledge", icon: BookOpen },
  { href: "/admin/templates", label: "Templates", icon: FileText },
] as const;

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
  const unread = useUnreadCount();
  const pathname = useActivePath();

  return (
    <div
      className="shell-grid-admin bg-[#0a1612] text-[#ecfdf5]"
      data-collapsed={hydrated && collapsed ? "true" : "false"}
    >
      {/* Desktop sidebar */}
      <aside className="shell-sidebar hidden lg:flex lg:flex-col border-r border-white/[0.06] bg-[#0f1f19]">
        <div className="flex h-16 items-center gap-2.5 px-4 border-b border-white/[0.06]">
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-teal-600 text-sm font-bold text-[#042f2e] shadow-md shadow-teal-500/20">
              A
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-white">Aether CRM</p>
                <p className="truncate text-[10px] uppercase tracking-wider text-teal-200/50">
                  {user.role}
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin-dark px-3 py-4">
          <ul className="space-y-1">
            {ADMIN_LINKS.map((l) => {
              const Icon = l.icon;
              const active = isLinkActive(pathname, l.href);
              return (
                <li key={l.href} className="relative tooltip-host">
                  <Link
                    href={l.href}
                    className={`nav-link-admin ${active ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
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

        <div className="border-t border-white/[0.06] p-3 space-y-1">
          <Link href="/" className={`nav-link-admin ${collapsed ? "justify-center px-2" : ""}`} title={collapsed ? "View website" : undefined}>
            <Home className="h-[18px] w-[18px]" />
            {!collapsed && <span>View website</span>}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className={`nav-link-admin w-full !text-rose-300 hover:!bg-rose-500/10 ${collapsed ? "justify-center px-2" : ""}`}
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
          <aside className="sidebar-drawer lg:hidden flex flex-col bg-[#0f1f19]">
            <div className="flex h-16 items-center justify-between gap-2.5 px-4 border-b border-white/[0.06]">
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-teal-600 text-sm font-bold text-[#042f2e]">
                  A
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight text-white">Aether CRM</p>
                  <p className="text-[10px] uppercase tracking-wider text-teal-200/50">{user.role}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-icon-dark"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto scroll-thin-dark px-3 py-4">
              <ul className="space-y-1">
                {ADMIN_LINKS.map((l) => {
                  const Icon = l.icon;
                  const active = isLinkActive(pathname, l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className={`nav-link-admin ${active ? "active" : ""}`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span>{l.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-t border-white/[0.06] p-3 space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="nav-link-admin">
                <Home className="h-[18px] w-[18px]" /> <span>View website</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="nav-link-admin w-full !text-rose-300 hover:!bg-rose-500/10">
                  <LogOut className="h-[18px] w-[18px]" /> <span>Sign out</span>
                </button>
              </form>
            </div>
          </aside>
        </>
      )}

      {/* Header */}
      <header className="shell-header flex items-center gap-3 border-b border-white/[0.06] bg-[#0a1612]/95 px-4 backdrop-blur sm:px-6 z-20">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-icon-dark lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#ecfdf5]/45">
          <Link href="/admin" className="hover:text-[#2dd4bf]">CRM</Link>
          {pathname !== "/admin" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white font-medium">{title || pathname.split("/").pop()}</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <AdminBellButton unread={unread} />
          <AdminUserMenu user={user} />
        </div>
      </header>

      {/* Main scroll area */}
      <main className="shell-main scroll-thin-dark">
        <div className="page-container-admin">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-up">
              <div>
                {title && (
                  <h1
                    className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-[#ecfdf5]/55">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>

      <PushNotificationCenter />
    </div>
  );
}

function AdminBellButton({ unread }: { unread: number }) {
  return (
    <Link
      href="/admin/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#ecfdf5]/55 transition hover:bg-white/[0.06] hover:text-white"
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
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-white/[0.06]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-teal-600 text-xs font-bold text-[#042f2e]">
          {initials || "S"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-xs font-semibold text-white">
            {user.fullName || "Staff"}
          </span>
          <span className="block max-w-[160px] truncate text-[11px] text-[#ecfdf5]/45">{user.email}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#122620] p-2 shadow-xl animate-scale-in">
            <div className="px-3 py-2 border-b border-white/[0.06]">
              <p className="truncate text-sm font-semibold text-white">{user.fullName || "Staff"}</p>
              <p className="truncate text-xs text-[#ecfdf5]/55">{user.email}</p>
              <p className="mt-1 inline-block rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
                {user.role}
              </p>
            </div>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#ecfdf5]/80 hover:bg-white/[0.06]"
            >
              <Home className="h-4 w-4" /> View website
            </Link>
            <div className="my-1 h-px bg-white/[0.06]" />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
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
   Reusable building blocks
   ============================================================ */

export function AdminCard({
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
  accent?: "ai" | "accent" | "info" | "danger" | "neutral";
}) {
  const accentClass =
    accent === "accent"
      ? "from-amber-400 to-amber-600"
      : accent === "info"
        ? "from-blue-400 to-blue-600"
        : accent === "danger"
          ? "from-rose-400 to-rose-600"
          : accent === "neutral"
            ? "from-slate-400 to-slate-600"
            : "from-[#2dd4bf] to-[#0f766e]";

  return (
    <div className="admin-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ecfdf5]/55">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-[#ecfdf5]/45">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-[#042f2e] shadow-md`}>
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

export function AdminPanel({
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
    <section className={`admin-card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[#ecfdf5]/55">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminBadge({
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

export function AdminEmptyState({
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-[#2dd4bf]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-[#ecfdf5]/55">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
