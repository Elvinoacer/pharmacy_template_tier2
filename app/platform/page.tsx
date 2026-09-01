import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  ShoppingBag,
  Users,
} from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import {
  daysSince,
  formatStatus,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  verificationPriority,
} from "@/app/components/platform/status";

export const metadata = { title: "Network overview" };

function kes(n: number): string {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

const cardLinkClass =
  "group block rounded-2xl border border-teal-200/20 bg-teal-950/40 p-4 sm:p-5 transition duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:border-teal-300/45 hover:bg-teal-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f]";

export default async function PlatformHomePage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  let pharmacies = 0,
    pending = 0,
    live = 0,
    users = 0,
    orders30d = 0,
    refills30d = 0,
    gmv30d = 0;
  let queue: Array<{
    id: string;
    name: string;
    status: string;
    city: string | null;
    submittedAt: Date | null;
    createdAt: Date;
  }> = [];
  let topTenants: Array<{
    id: string;
    name: string;
    status: string;
    orderCount: number;
    revenue: number;
  }> = [];

  try {
    [pharmacies, pending, live, users, queue] = await Promise.all([
      prismaUnscoped.pharmacy.count(),
      prismaUnscoped.pharmacy.count({
        where: { status: { in: ["submitted", "under_review", "needs_info"] } },
      }),
      prismaUnscoped.pharmacy.count({ where: { status: "active", listed: true } }),
      prismaUnscoped.user.count(),
      prismaUnscoped.pharmacy.findMany({
        where: { status: { in: ["submitted", "under_review", "needs_info"] } },
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          status: true,
          city: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
    ]);
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
      .map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        orderCount: tenant.orders.length,
        revenue: tenant.orders.reduce((sum, order) => sum + Number(order.netTotal ?? 0), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  } catch {}

  const attention = [...queue].sort((a, b) => {
    const pa = verificationPriority(a.status, a.submittedAt, a.createdAt);
    const pb = verificationPriority(b.status, b.submittedAt, b.createdAt);
    const rank = { critical: 0, high: 1, normal: 2, low: 3 } as const;
    return rank[pa] - rank[pb];
  });

  const stats = [
    {
      label: "Pharmacies",
      value: pharmacies,
      detail: "Total tenant accounts",
      href: "/platform/pharmacies",
      icon: Building2,
    },
    {
      label: "Needs attention",
      value: pending,
      detail: "Applications awaiting review",
      href: "/platform/applications",
      icon: Clock3,
      highlight: pending > 0,
    },
    {
      label: "Live storefronts",
      value: live,
      detail: "Visible in the marketplace",
      href: "/platform/pharmacies?status=active",
      icon: ShoppingBag,
    },
    {
      label: "User accounts",
      value: users,
      detail: "Across the whole network",
      href: "/platform/users",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <section
        aria-labelledby="platform-overview-title"
        className="rounded-2xl border border-teal-300/25 bg-[linear-gradient(145deg,rgba(20,120,100,.32),rgba(6,17,15,.72)_50%,rgba(255,255,255,.04))] px-4 py-5 sm:rounded-3xl sm:px-6 sm:py-7 md:px-8"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-200 sm:text-xs">
          Platform overview
        </p>
        <div className="mt-2.5 flex flex-col gap-4 sm:mt-3 sm:gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1
              id="platform-overview-title"
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Network control
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/90">
              Review pharmacy applications by priority, monitor network activity, and manage platform
              access from one place.
            </p>
          </div>
          <Link
            href="/platform/applications"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-100 px-4 py-2.5 text-sm font-semibold text-[#06110f] transition active:scale-[0.98] hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f]"
          >
            Open verification queue <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section aria-labelledby="network-statistics-title">
        <h2 id="network-statistics-title" className="sr-only">
          Network statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className={`${cardLinkClass} ${
                  "highlight" in stat && stat.highlight
                    ? "border-amber-400/50 bg-amber-500/15"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-100/85 sm:text-xs">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-white sm:mt-3 sm:text-3xl">
                      {stat.value.toLocaleString("en-KE")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-xl border border-teal-200/20 bg-teal-300/15 p-2 text-teal-100 sm:p-2.5">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-teal-100/80 sm:mt-3 sm:text-xs">
                  {stat.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Attention board */}
      <section
        aria-labelledby="attention-title"
        className="overflow-hidden rounded-2xl border border-teal-200/20 bg-teal-950/35"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/15 px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id="attention-title"
              className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300 sm:h-5 sm:w-5" aria-hidden />
              Needs verification
            </h2>
            <p className="mt-0.5 text-[11px] text-teal-100/75 sm:text-xs">
              Sorted by urgency — aging submissions and needs-info first
            </p>
          </div>
          <Link
            href="/platform/applications"
            className="text-xs font-semibold text-teal-200 underline-offset-4 transition hover:text-teal-100 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded"
          >
            Full queue
          </Link>
        </div>
        {attention.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-teal-100/75 sm:px-5 sm:py-10">
            No applications waiting. Queue is clear.
          </p>
        ) : (
          <ul className="divide-y divide-teal-200/10">
            {attention.map((item) => {
              const priority = verificationPriority(
                item.status,
                item.submittedAt,
                item.createdAt,
              );
              const age = daysSince(item.submittedAt ?? item.createdAt);
              return (
                <li key={item.id}>
                  <Link
                    href={`/platform/pharmacies/${item.id}`}
                    className="flex min-h-[3.75rem] flex-col gap-2 px-4 py-3.5 transition active:bg-teal-300/10 hover:bg-teal-300/8 focus:outline-none focus-visible:bg-teal-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityBadgeClass(priority)}`}
                        >
                          {priorityLabel(priority)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-teal-100/75">
                        {item.city || "Location not set"}
                        {age != null ? ` · ${age === 0 ? "today" : `${age}d waiting`}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(item.status)}`}
                      >
                        {formatStatus(item.status)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-teal-200/60" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Activity + Quick actions */}
      <section
        className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"
        aria-label="Network activity and quick actions"
      >
        <div className="rounded-2xl border border-teal-200/20 bg-teal-950/35 p-4 sm:p-5 md:p-6">
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">Network activity</h2>
            <p className="mt-1 text-xs text-teal-100/75">Last 30 days across all pharmacies</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 xs:grid-cols-3 sm:mt-6 sm:grid-cols-3">
            {[
              { label: "Orders", value: orders30d.toLocaleString("en-KE") },
              { label: "Refill requests", value: refills30d.toLocaleString("en-KE") },
              { label: "Collected online", value: kes(gmv30d) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-teal-200/15 bg-black/25 p-3.5 sm:p-4"
              >
                <p className="text-xs font-medium text-teal-100/80">{item.label}</p>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-white sm:mt-2 sm:text-xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200/20 bg-teal-950/35 p-4 sm:p-5 md:p-6">
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">Quick actions</h2>
            <p className="mt-1 text-xs text-teal-100/75">Most common platform tasks</p>
          </div>
          <nav aria-label="Quick actions" className="mt-3 grid gap-1.5 sm:mt-4 sm:gap-2">
            {[
              ["Review applications", "/platform/applications"],
              ["Manage pharmacies", "/platform/pharmacies"],
              ["Manage users", "/platform/users"],
              ["View audit trail", "/platform/audit"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center justify-between rounded-xl border border-teal-200/15 px-3 py-2.5 text-sm font-medium text-teal-50/95 transition active:scale-[0.98] hover:bg-teal-300/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              >
                {label}
                <ArrowRight className="h-4 w-4 text-teal-200/70" aria-hidden />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Top tenants */}
      <section className="overflow-hidden rounded-2xl border border-teal-200/20 bg-teal-950/35">
        <div className="border-b border-teal-200/15 px-4 py-3.5 sm:px-5 sm:py-4">
          <h2 className="font-semibold text-white">Top tenants</h2>
          <p className="mt-0.5 text-xs text-teal-100/75">By order value in the last 30 days</p>
        </div>
        {topTenants.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-teal-100/75 sm:px-5 sm:py-10">
            No completed activity yet.
          </p>
        ) : (
          <div className="divide-y divide-teal-200/10">
            {topTenants.map((tenant, index) => (
              <Link
                key={tenant.id}
                href={`/platform/pharmacies/${tenant.id}`}
                className="flex min-h-[3.5rem] items-center gap-3 px-4 py-3 transition active:bg-teal-300/10 hover:bg-teal-300/8 focus:outline-none focus-visible:bg-teal-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300 sm:min-h-16 sm:px-5 sm:py-3.5"
              >
                <span
                  aria-label={`Rank ${index + 1}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-teal-200/20 bg-teal-300/10 text-xs font-medium text-teal-100"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{tenant.name}</p>
                  <p className="mt-0.5 text-xs text-teal-100/75">{tenant.orderCount} orders</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-teal-50">{kes(tenant.revenue)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
