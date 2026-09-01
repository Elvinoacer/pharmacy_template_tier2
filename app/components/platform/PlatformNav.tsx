"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  { href: "/platform/jobs", label: "Jobs", icon: Activity },
  { href: "/platform/integrations", label: "Integrations", icon: Plug },
  { href: "/platform/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/platform/notifications", label: "Delivery", icon: Bell },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/security", label: "Security", icon: Shield },
  { href: "/platform/feature-flags", label: "Flags", icon: Flag },
  { href: "/platform/audit", label: "Audit log", icon: FileText },
  { href: "/platform/compliance", label: "Compliance", icon: KeyRound },
] as const;

export default function PlatformNav({
  email,
  mobileOnly = false,
}: {
  email: string;
  mobileOnly?: boolean;
}) {
  const pathname = usePathname() || "/platform";
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/platform" ? pathname === "/platform" : pathname.startsWith(href);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileOnly || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mobileOnly]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = (mobile: boolean) =>
    PLATFORM_NAV.map((item) => {
      const Icon = item.icon;
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => mobile && setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c0a] ${
            active
              ? "bg-teal-300/20 text-white shadow-[inset_3px_0_0_#5eead4]"
              : "text-teal-50/90 hover:bg-teal-300/10 hover:text-white"
          }`}
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${active ? "text-teal-200" : "text-teal-100/70 group-hover:text-teal-100"}`}
            aria-hidden
          />
          <span>{item.label}</span>
        </Link>
      );
    });

  if (mobileOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="platform-mobile-nav"
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-200/25 text-teal-50 transition active:scale-95 hover:bg-teal-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f]"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>

        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden
          onClick={() => setOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-teal-200/20 bg-[#040c0a] shadow-2xl transition-transform duration-250 ease-out lg:hidden ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          id="platform-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Platform navigation"
        >
          <div className="flex items-center justify-between border-b border-teal-200/15 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/80">
              Menu
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-teal-50 transition active:scale-95 hover:bg-teal-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain p-3" aria-label="Platform navigation">
            <div className="grid gap-0.5">{links(true)}</div>
          </nav>

          <div className="border-t border-teal-200/15 p-3">
            <p className="truncate px-3 py-2 text-xs text-teal-100/70" title={email}>
              {email}
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-100 transition active:scale-[0.98] hover:bg-rose-400/15 hover:text-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <nav
      aria-label="Platform navigation"
      className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3 xl:p-4"
    >
      {links(false)}
    </nav>
  );
}
