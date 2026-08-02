import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";

const LINKS = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/refills", label: "Refills" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/messages", label: "Communication" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/segments", label: "Segments" },
  { href: "/admin/reminders", label: "Reminders" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/ai", label: "AI Escalations" },
  { href: "/admin/loyalty", label: "Loyalty" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/knowledge", label: "AI Knowledge" },
  { href: "/admin/templates", label: "Templates" },
];

export default function AdminShell({
  user,
  children,
  title,
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#0b1612] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 border-r border-white/10 bg-[#0f1f19] p-4 md:block">
          <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 text-sm font-bold text-[#042f2e]">
              A
            </span>
            <div>
              <div className="text-sm font-semibold">Aether CRM</div>
              <div className="text-[10px] uppercase tracking-wider text-teal-200/60">{user.role}</div>
            </div>
          </Link>
          <nav className="flex flex-col gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-2 text-sm text-teal-50/80 transition hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 space-y-2 border-t border-white/10 pt-4 px-2">
            <p className="truncate text-xs text-teal-200/50">{user.email}</p>
            <Link href="/" className="block text-xs text-teal-300 hover:underline">
              View website
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-xs text-rose-300 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1612]/90 px-4 py-3 backdrop-blur sm:px-6 md:hidden">
            <span className="font-semibold">Aether CRM</span>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-teal-200">
                Sign out
              </button>
            </form>
          </header>

          <div className="border-b border-white/5 px-4 py-3 md:hidden overflow-x-auto">
            <div className="flex gap-2">
              {LINKS.slice(0, 6).map((l) => (
                <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full bg-white/5 px-3 py-1 text-xs text-teal-100">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-8">
            {title && (
              <h1 className="mb-6 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-teal-200/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-teal-100/50">{hint}</p>}
    </div>
  );
}

export function AdminPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-teal-50">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
