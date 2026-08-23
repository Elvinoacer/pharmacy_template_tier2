import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";

export const metadata = { title: "Network overview" };

function kes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

export default async function PlatformHomePage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  let pharmacies = 0;
  let pending = 0;
  let live = 0;
  let users = 0;
  let recent: Array<{ id: string; name: string; status: string; city: string | null; createdAt: Date }> = [];

  let orders30d = 0;
  let refills30d = 0;
  let gmv30d = 0;
  let topTenants: Array<{
    id: string;
    name: string;
    status: string;
    orderCount: number;
    revenue: number;
  }> = [];

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

    // ── Cross-tenant analytics (platform bypass) ────────────────
    const [orderAgg, refillAgg, payAgg, perTenant] = await Promise.all([
      prismaUnscoped.order.count({
        where: { createdAt: { gte: since }, status: { not: "cancelled" } },
      }),
      prismaUnscoped.refillRequest.count({
        where: { createdAt: { gte: since }, status: { not: "cancelled" } },
      }),
      prismaUnscoped.payment.aggregate({
        where: { status: "completed", createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      prismaUnscoped.pharmacy.findMany({
        where: { status: "active" },
        select: {
          id: true,
          name: true,
          status: true,
          orders: {
            where: { createdAt: { gte: since }, status: { not: "cancelled" } },
            select: { id: true, netTotal: true },
          },
        },
      }),
    ]);

    orders30d = orderAgg;
    refills30d = refillAgg;
    gmv30d = Number(payAgg._sum.amount ?? 0);
    topTenants = perTenant
      .map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        orderCount: t.orders.length,
        revenue: t.orders.reduce((sum, o) => sum + Number(o.netTotal ?? 0), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  } catch {
    // DB down
  }

  const cards = [
    { label: "Pharmacies", value: pharmacies, href: "/platform/pharmacies" },
    { label: "Awaiting review", value: pending, href: "/platform/applications" },
    { label: "Live in marketplace", value: live, href: "/" },
    { label: "User accounts", value: users, href: "/platform/users" },
  ];

  const activity = [
    { label: "Orders (30d)", value: orders30d.toLocaleString("en-KE") },
    { label: "Refill requests (30d)", value: refills30d.toLocaleString("en-KE") },
    { label: "Collected online (30d)", value: kes(gmv30d) },
  ];

  return (
    <div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
        Network control
      </h1>
      <p className="mt-2 text-sm text-teal-100/70">
        Verify licences, list storefronts, and suspend a tenant without touching another pharmacy&apos;s
        data.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
          >
            <p className="text-xs uppercase tracking-wide text-teal-200/70">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {activity.map((a) => (
          <div key={a.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wide text-teal-200/60">{a.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{a.value}</p>
          </div>
        ))}
      </div>

      {topTenants.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-semibold">Top tenants by order value (30d)</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-teal-100/60">
                <tr>
                  <th className="px-4 py-3">Pharmacy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Order value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {topTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link href={`/platform/pharmacies/${t.id}`} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{kes(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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
