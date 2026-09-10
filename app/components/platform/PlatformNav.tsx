"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Activity,
  Bell,
  ClipboardCheck,
  CreditCard,
  FileText,
  Flag,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Shield,
  Store,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export const PLATFORM_NAV = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/applications", label: "Applications", icon: ClipboardCheck },
  { href: "/platform/pharmacies", label: "Pharmacies", icon: Store },
  { href: "/platform/billing", label: "Billing", icon: CreditCard },
  { href: "/platform/jobs", label: "Background tasks", icon: Activity },
  { href: "/platform/integrations", label: "Integrations", icon: Plug },
  { href: "/platform/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/platform/notifications", label: "Message delivery", icon: Bell },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/security", label: "Security", icon: Shield },
  { href: "/platform/feature-flags", label: "Feature settings", icon: Flag },
  { href: "/platform/audit", label: "Audit log", icon: FileText },
  { href: "/platform/compliance", label: "Compliance", icon: KeyRound },
] as const;

const groups = [
  { label: "Daily work", paths: ["/platform", "/platform/applications", "/platform/pharmacies", "/platform/users"] },
  { label: "Operations", paths: ["/platform/billing", "/platform/jobs", "/platform/notifications", "/platform/integrations", "/platform/webhooks"] },
  { label: "Security & settings", paths: ["/platform/security", "/platform/audit", "/platform/compliance", "/platform/feature-flags"] },
];

export default function PlatformNav({ email, mobileOnly = false }: { email: string; mobileOnly?: boolean }) {
  const pathname = usePathname() || "/platform";
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  const navigation = (
    <nav aria-label="Platform navigation" className="space-y-5 p-3">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-soft)]">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.paths.map((path) => {
              const item = PLATFORM_NAV.find((link) => link.href === path)!;
              const active = path === "/platform" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => drawer.current?.close()}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${
                    active
                      ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent-text)] shadow-sm"
                      : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                      active ? "bg-[var(--admin-card)] text-[var(--admin-accent)]" : "text-[var(--admin-text-soft)] group-hover:text-[var(--admin-accent)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  if (!mobileOnly) return navigation;

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-controls="platform-mobile-nav"
        onClick={() => drawer.current?.showModal()}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] text-[var(--admin-text)] shadow-sm transition hover:bg-[var(--admin-hover)] active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <dialog
        ref={drawer}
        id="platform-mobile-nav"
        aria-label="Platform navigation"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(100vw-1rem,22rem)] max-w-none border-l border-[var(--admin-border)] bg-[var(--admin-panel)] p-0 text-[var(--admin-text)] shadow-2xl backdrop:bg-black/45"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left) drawer.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col bg-[var(--admin-panel)] text-[var(--admin-text)]">
          <div className="flex min-h-16 items-center justify-between border-b border-[var(--admin-border)] px-4 py-2.5">
            <div>
              <p className="font-semibold">Platform menu</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--admin-text-soft)]">Navigation</p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => drawer.current?.close()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{navigation}</div>

          <div className="border-t border-[var(--admin-border)] bg-[var(--admin-card-2)] p-3">
            <p className="truncate px-3 py-2 text-xs text-[var(--admin-text-soft)]" title={email}>{email}</p>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50">
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
