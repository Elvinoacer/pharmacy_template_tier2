"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export const PLATFORM_NAV = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/applications", label: "Applications" },
  { href: "/platform/pharmacies", label: "Pharmacies" },
  { href: "/platform/users", label: "Users" },
  { href: "/platform/audit", label: "Audit log" },
] as const;

export default function PlatformNav({ email }: { email: string }) {
  const pathname = usePathname() || "/platform";
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/platform" ? pathname === "/platform" : pathname.startsWith(href);

  return (
    <>
      <nav aria-label="Platform" className="hidden items-center gap-1 text-sm sm:flex">
        {PLATFORM_NAV.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 transition ${
              isActive(l.href)
                ? "bg-white/15 text-white"
                : "text-teal-100/75 hover:bg-white/5 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-teal-100 sm:hidden"
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-white/10 bg-[#071512] px-4 py-3 sm:hidden">
          <nav aria-label="Platform mobile" className="grid gap-1 text-sm">
            {PLATFORM_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={`rounded-xl px-3 py-2.5 ${
                  isActive(l.href) ? "bg-white/15 text-white" : "text-teal-100/80 hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <span className="px-3 pb-1 pt-2 text-[11px] text-teal-100/50">{email}</span>
          </nav>
        </div>
      )}
    </>
  );
}
