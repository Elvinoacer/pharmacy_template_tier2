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
  Layers3,
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
  { href: "/platform/plans", label: "Plans", icon: Layers3 },
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
      "/platform/plans",
      "/platform/jobs",
      "/platform/notifications",
      "/platform/integrations",
      "/platform/webhooks",
    ],
  },
  {
    label: "Security & settings",
    paths: ["/platform/security", "/platform/audit", "/platform/compliance", "/platform/feature-flags"],
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
    <nav aria-label="Platform navigation" className="space-y-5 p-3 sm:p-4 lg:p-3">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#718078] dark:text-teal-100/55">
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
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-500 dark:focus-visible:outline-teal-300 ${
                    active
                      ? "bg-teal-100 text-teal-950 shadow-sm dark:bg-teal-300/20 dark:text-white dark:shadow-none"
                      : "text-[#35453c] hover:bg-[#eef5f1] hover:text-teal-900 dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active
                        ? "bg-white/70 text-teal-700 dark:bg-teal-300/10 dark:text-teal-200"
                        : "bg-[#f4f7f5] text-[#6b7a71] group-hover:text-teal-700 dark:bg-white/5 dark:text-teal-100/60 dark:group-hover:text-teal-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#cfdcd4] bg-white/80 text-[#26352d] shadow-sm transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-200/25 dark:bg-white/5 dark:text-teal-50 dark:shadow-none dark:focus-visible:ring-teal-300"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <dialog
        ref={drawer}
        id="platform-mobile-nav"
        aria-label="Platform navigation"
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(100vw-1rem,23rem)] max-w-none border-l border-[#dfe8e2] bg-white p-0 text-[#17231d] shadow-2xl backdrop:bg-black/45 dark:border-teal-200/20 dark:bg-[#040c0a] dark:text-white dark:backdrop:bg-black/65"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left) drawer.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#dfe8e2] px-4 py-3 dark:border-teal-200/15">
            <div>
              <p className="font-semibold">Platform menu</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#74837a] dark:text-teal-100/50">
                Operations & control
              </p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => drawer.current?.close()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-[#eef5f1] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-teal-300/10 dark:focus-visible:ring-teal-300"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{navigation}</div>

          <div className="border-t border-[#dfe8e2] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-teal-200/15">
            <p className="truncate px-3 py-2 text-xs text-[#718078] dark:text-teal-100/65">{email}</p>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#35453c] transition hover:bg-[#eef5f1] dark:text-teal-50/90 dark:hover:bg-teal-300/10"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-100 dark:hover:bg-rose-400/15">
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
