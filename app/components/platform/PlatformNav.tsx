"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ClipboardCheck, FileText, LayoutDashboard, Menu, Store, Users, X } from "lucide-react";

export const PLATFORM_NAV = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard },
  { href: "/platform/applications", label: "Applications", icon: ClipboardCheck },
  { href: "/platform/pharmacies", label: "Pharmacies", icon: Store },
  { href: "/platform/users", label: "Users", icon: Users },
  { href: "/platform/audit", label: "Audit log", icon: FileText },
] as const;

export default function PlatformNav({ email, mobileOnly = false }: { email: string; mobileOnly?: boolean }) {
  const pathname = usePathname() || "/platform";
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => href === "/platform" ? pathname === "/platform" : pathname.startsWith(href);

  const links = (mobile: boolean) => PLATFORM_NAV.map((item) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => mobile && setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f] ${
          active ? "bg-teal-300/15 text-white shadow-[inset_3px_0_0_#2dd4bf]" : "text-teal-50/80 hover:bg-white/[0.07] hover:text-white"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-teal-200" : "text-teal-50/70 group-hover:text-teal-100"}`} aria-hidden />
        <span>{item.label}</span>
      </Link>
    );
  });

  if (mobileOnly) {
    return (
      <>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="platform-mobile-nav" aria-label={open ? "Close navigation" : "Open navigation"} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-teal-50 transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071512]">
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
        {open && (
          <div className="absolute inset-x-0 top-full border-b border-white/15 bg-[#071512] p-3 shadow-2xl">
            <nav id="platform-mobile-nav" aria-label="Platform navigation" className="grid gap-1">{links(true)}</nav>
            <p className="truncate px-3 py-3 text-xs text-teal-50/70" title={email}>{email}</p>
          </div>
        )}
      </>
    );
  }

  return <nav aria-label="Platform navigation" className="flex flex-1 flex-col gap-1 p-4">{links(false)}</nav>;
}
