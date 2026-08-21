import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";

export const metadata = { title: "Network overview" };

export default async function PlatformHomePage() {
  let pharmacies = 0;
  let pending = 0;
  let live = 0;
  let users = 0;
  let recent: Array<{ id: string; name: string; status: string; city: string | null; createdAt: Date }> = [];
  try {
    [pharmacies, pending, live, users, recent] = await Promise.all([
      prismaUnscoped.pharmacy.count(),
      prismaUnscoped.pharmacy.count({
        where: { status: { in: ["submitted", "under_review", "needs_info"] } },
      }),
      prismaUnscoped.pharmacy.count({ where: { status: "active", listed: true } }),
      prismaUnscoped.user.count(),
      prismaUnscoped.pharmacy.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, status: true, city: true, createdAt: true },
      }),
    ]);
  } catch {
    // DB down
  }

  const cards = [
    { label: "Pharmacies", value: pharmacies, href: "/platform/pharmacies" },
    { label: "Awaiting review", value: pending, href: "/platform/applications" },
    { label: "Live in marketplace", value: live, href: "/" },
    { label: "User accounts", value: users, href: "/platform/pharmacies" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        Network control
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Verify licences, list storefronts, and suspend a tenant without touching another pharmacy's data.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/8"
          >
            <p className="text-xs uppercase tracking-wide text-teal-200/70">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>
      <h2 className="mt-12 text-lg font-semibold">Recent applications</h2>
      <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
        {recent.length === 0 && <p className="px-4 py-8 text-sm text-teal-100/60">No pharmacies yet.</p>}
        {recent.map((p) => (
          <Link
            key={p.id}
            href={`/platform/pharmacies/${p.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-white/5"
          >
            <span>
              {p.name}
              <span className="ml-2 text-teal-100/50">{p.city}</span>
            </span>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wide">
              {p.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
