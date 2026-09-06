"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Activity, Bell, ClipboardCheck, CreditCard, FileText, Flag, KeyRound, LayoutDashboard, LogOut, Menu, Plug, Shield, Store, Users, Webhook, X } from "lucide-react";
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
  useEffect(() => { drawer.current?.close(); }, [pathname]);

  const navigation = <nav aria-label="Platform navigation" className="space-y-5 p-3">
    {groups.map(group => <section key={group.label}>
      <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-teal-100/60">{group.label}</h2>
      {group.paths.map(path => {
        const item = PLATFORM_NAV.find(link => link.href === path)!;
        const active = path === "/platform" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
        const Icon = item.icon;
        return <Link key={path} href={path} onClick={() => drawer.current?.close()} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-teal-300 ${active ? "bg-teal-300/20 text-white" : "text-teal-50/90 hover:bg-teal-300/10"}`}><Icon className="h-4 w-4 shrink-0" aria-hidden /><span>{item.label}</span></Link>;
      })}
    </section>)}
  </nav>;

  if (!mobileOnly) return navigation;
  return <>
    <button type="button" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="platform-mobile-nav" onClick={() => drawer.current?.showModal()} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-teal-200/25 text-teal-50"><Menu className="h-5 w-5" aria-hidden /></button>
    <dialog ref={drawer} id="platform-mobile-nav" aria-label="Platform navigation" className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(100vw-2rem,22rem)] max-w-none border-l border-teal-200/20 bg-[#040c0a] p-0 text-white shadow-2xl backdrop:bg-black/60" onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left) drawer.current?.close(); } }}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-teal-200/15 px-4 py-3"><p className="font-semibold">Platform menu</p><button type="button" aria-label="Close navigation" onClick={() => drawer.current?.close()} className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-teal-300/10"><X className="h-5 w-5" aria-hidden /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{navigation}</div>
        <div className="border-t border-teal-200/15 p-3"><p className="truncate px-3 py-2 text-xs text-teal-100/70">{email}</p><Link href="/" className="flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-teal-300/10">View marketplace</Link><form action={logoutAction}><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-100 hover:bg-rose-400/15"><LogOut className="h-4 w-4" aria-hidden />Sign out</button></form></div>
      </div>
    </dialog>
  </>;
}
