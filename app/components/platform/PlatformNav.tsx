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
  {
    label: "Daily work",
    paths: ["/platform", "/platform/applications", "/platform/pharmacies", "/platform/users"],
  },
  {
    label: "Operations",
    paths: [
      "/platform/billing",
      "/platform/jobs",
      "/platform/notifications",
      "/platform/integrations",
      "/platform/webhooks",
    ],
  },
  {
    label: "Security & settings",
    paths: [
      "/platform/security",
      "/platform/audit",
      "/platform/compliance",
      "/platform/feature-flags",
    ],
  },
];

export default function PlatformNav({
  email,
  mobileOnly = false,
}: {
  email: string;
  mobileOnly?: boolean;
}) {
  const pathname = usePathname() || "/platform";
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  const navigation = (
    <nav aria-label="Platform navigation" className="space-y-5 p-3">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#75827c] dark:text-teal-100/60">
            {group.label}
          </h2>
          <div className="space-y-1">
            {group.paths.map((path) => {
              const item = PLATFORM_NAV.find((link) => link.href === path)!;
              const active =
                path === "/platform"
                  ? pathname === path
                  : pathname === path || pathname.startsWith(`${path}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => drawer.current?.close()}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-teal-300 ${
                    active
                      ? "bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-100 dark:bg-teal-300/20 dark:text-white dark:ring-teal-300/10"
                      : "text-[#3e5048] hover:bg-[#eef5f1] hover:text-teal-900 dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
                      active
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-300/15 dark:text-teal-100"
                        : "bg-[#f4f7f5] text-[#64736c] group-hover:bg-white group-hover:text-teal-700 dark:bg-white/[0.04] dark:text-teal-100/70 dark:group-hover:bg-white/[0.06] dark:group-hover:text-teal-100"
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
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d4e2db] bg-white text-[#294239] shadow-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-200/25 dark:bg-white/[0.03] dark:text-teal-50 dark:shadow-none dark:focus-visible:ring-teal-300"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <dialog
        ref={drawer}
        id="platform-mobile-nav"
        aria-label="Platform navigation"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(calc(100vw-1rem),22rem)] max-w-none border-l border-[#dce7e1] bg-white p-0 text-[#14211d] shadow-2xl backdrop:bg-black/45 dark:border-teal-200/20 dark:bg-[#040c0a] dark:text-white dark:backdrop:bg-black/70"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left) drawer.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#dce7e1] px-4 py-3 dark:border-teal-200/15">
            <div>
              <p className="font-semibold">Platform menu</p>
              <p className="mt-0.5 text-[11px] text-[#75827c] dark:text-teal-100/60">
                Control center navigation
              </p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => drawer.current?.close()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-[#f0f5f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-teal-300/10 dark:focus-visible:ring-teal-300"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{navigation}</div>

          <div className="border-t border-[#dce7e1] p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] dark:border-teal-200/15">
            <p className="truncate px-3 py-2 text-xs text-[#75827c] dark:text-teal-100/70">{email}</p>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#3e5048] transition hover:bg-[#eef5f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:focus-visible:ring-teal-300"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-100 dark:hover:bg-rose-400/15 dark:focus-visible:ring-rose-300">
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
