import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/app/lib/types";

const LINKS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/refills", label: "Refills" },
  { href: "/portal/prescriptions", label: "Prescriptions" },
  { href: "/portal/caregivers", label: "Caregivers" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/loyalty", label: "Loyalty" },
  { href: "/portal/preferences", label: "Preferences" },
  { href: "/portal/profile", label: "Profile" },
  { href: "/portal/feedback", label: "Feedback" },
];

export default function PortalShell({
  user,
  children,
  title,
}: {
  user: SessionUser;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f3f6f4]">
      <header className="border-b border-teal-900/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/portal" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white text-sm font-bold">
                A
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#0c1a14]">Customer Portal</span>
                <span className="block text-xs text-[#5a6b62]">{user.fullName || user.email}</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-3 py-1.5 text-sm text-[#5a6b62] hover:bg-teal-50 sm:inline">
              Website
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-teal-900/10 px-3 py-1.5 text-sm font-medium text-[#084c3f] hover:bg-teal-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-3xl border border-teal-900/8 bg-white p-3 shadow-sm">
          <nav className="flex flex-col gap-0.5">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-2xl px-3 py-2.5 text-sm font-medium text-[#3d4f46] transition hover:bg-teal-50 hover:text-[#084c3f]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div>
          {title && (
            <h1
              className="mb-5 text-2xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {title}
            </h1>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-teal-900/8 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[#5a6b62]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#0c1a14]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#5a6b62]">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-teal-900/8 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#0c1a14]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
