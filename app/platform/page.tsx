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
  "group block rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.025] transition duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:border-teal-200 hover:bg-[#fbfdfc] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none dark:hover:border-teal-300/35 dark:hover:bg-teal-900/35 dark:focus-visible:ring-teal-300 sm:p-5";

const panelClass =
  "rounded-2xl border border-[#dce7e1] bg-white shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none";

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
    <div className="space-y-5 sm:space-y-7">
      <section
        aria-labelledby="platform-overview-title"
        className="overflow-hidden rounded-2xl border border-[#d4e4dc] bg-[linear-gradient(145deg,#ffffff_0%,#f3fbf7_56%,#e7f6ef_100%)] px-4 py-5 shadow-sm shadow-black/[0.025] dark:border-teal-300/20 dark:bg-[linear-gradient(145deg,rgba(20,120,100,.28),rgba(6,17,15,.74)_55%,rgba(255,255,255,.035))] dark:shadow-none sm:rounded-3xl sm:px-6 sm:py-7 md:px-8"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700/80 dark:text-teal-200/80 sm:text-xs">
          Platform overview
        </p>
        <div className="mt-2.5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1
              id="platform-overview-title"
              className="text-2xl font-semibold tracking-tight text-[#14211d] dark:text-white sm:text-3xl md:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Network control
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b6d64] dark:text-teal-50/85">
              Review urgent pharmacy applications, monitor network activity and move directly into the
              most common platform operations.
            </p>
          </div>
          <Link
            href="/platform/applications"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-100 dark:text-[#06110f] dark:hover:bg-teal-50 dark:focus-visible:ring-teal-200 dark:focus-visible:ring-offset-[#06110f] sm:w-auto"
          >
            Open verification queue <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section aria-labelledby="network-statistics-title">
        <h2 id="network-statistics-title" className="sr-only">
          Network statistics
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const highlighted = "highlight" in stat && stat.highlight;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className={`${cardLinkClass} ${
                  highlighted
                    ? "border-amber-200 bg-amber-50/75 hover:border-amber-300 dark:border-amber-400/35 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className={`text-[9px] font-semibold uppercase tracking-[0.1em] sm:text-[11px] ${highlighted ? "text-amber-800 dark:text-amber-200/80" : "text-[#708079] dark:text-teal-100/70"}`}>
                      {stat.label}
                    </p>
                    <p className={`mt-2 text-2xl font-semibold tabular-nums sm:mt-3 sm:text-3xl ${highlighted ? "text-amber-950 dark:text-amber-50" : "text-[#14211d] dark:text-white"}`}>
                      {stat.value.toLocaleString("en-KE")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-xl border p-2 sm:p-2.5 ${highlighted ? "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200" : "border-[#dce7e1] bg-[#f4f7f5] text-teal-700 dark:border-teal-200/15 dark:bg-teal-300/10 dark:text-teal-100"}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </span>
                </div>
                <p className={`mt-2 text-[10px] leading-4 sm:mt-3 sm:text-xs ${highlighted ? "text-amber-800/75 dark:text-amber-100/65" : "text-[#6c7a73] dark:text-teal-100/65"}`}>
                  {stat.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="attention-title" className={`overflow-hidden ${panelClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8efeb] px-4 py-3.5 dark:border-teal-200/10 sm:gap-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="attention-title" className="flex items-center gap-2 text-base font-semibold text-[#1b2d25] dark:text-white sm:text-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300 sm:h-5 sm:w-5" aria-hidden />
              Needs verification
            </h2>
            <p className="mt-0.5 text-[11px] text-[#74817b] dark:text-teal-100/60 sm:text-xs">
              Aging submissions and needs-info cases surface first
            </p>
          </div>
          <Link
            href="/platform/applications"
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-teal-700 underline-offset-4 transition hover:bg-teal-50 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200 dark:hover:bg-teal-300/10 dark:hover:text-teal-100 dark:focus-visible:ring-teal-300"
          >
            Full queue
          </Link>
        </div>

        {attention.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#6e7c75] dark:text-teal-100/65 sm:px-5 sm:py-10">
            No applications waiting. Queue is clear.
          </p>
        ) : (
          <ul className="divide-y divide-[#edf2ef] dark:divide-teal-200/10">
            {attention.map((item) => {
              const priority = verificationPriority(item.status, item.submittedAt, item.createdAt);
              const age = daysSince(item.submittedAt ?? item.createdAt);
              return (
                <li key={item.id}>
                  <Link
                    href={`/platform/pharmacies/${item.id}`}
                    className="flex min-h-[4rem] flex-col gap-2 px-4 py-3.5 transition active:bg-teal-50 hover:bg-[#f8fbf9] focus:outline-none focus-visible:bg-teal-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:active:bg-teal-300/10 dark:hover:bg-teal-300/[0.06] dark:focus-visible:bg-teal-300/10 dark:focus-visible:ring-teal-300 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#1b2d25] dark:text-white">{item.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityBadgeClass(priority)}`}>
                          {priorityLabel(priority)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#718078] dark:text-teal-100/65">
                        {item.city || "Location not set"}
                        {age != null ? ` · ${age === 0 ? "today" : `${age}d waiting`}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${statusBadgeClass(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#9aa59f] dark:text-teal-200/45" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]" aria-label="Network activity and quick actions">
        <div className={`${panelClass} p-4 sm:p-5 md:p-6`}>
          <h2 className="text-base font-semibold text-[#1b2d25] dark:text-white sm:text-lg">Network activity</h2>
          <p className="mt-1 text-xs text-[#74817b] dark:text-teal-100/60">Last 30 days across all pharmacies</p>
          <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            {[
              { label: "Orders", value: orders30d.toLocaleString("en-KE") },
              { label: "Refill requests", value: refills30d.toLocaleString("en-KE") },
              { label: "Collected online", value: kes(gmv30d) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#e0e9e4] bg-[#f7faf8] p-3.5 dark:border-teal-200/10 dark:bg-black/20 sm:p-4">
                <p className="text-xs font-medium text-[#6b7a73] dark:text-teal-100/65">{item.label}</p>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#14211d] dark:text-white sm:mt-2 sm:text-xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelClass} p-4 sm:p-5 md:p-6`}>
          <h2 className="text-base font-semibold text-[#1b2d25] dark:text-white sm:text-lg">Quick actions</h2>
          <p className="mt-1 text-xs text-[#74817b] dark:text-teal-100/60">Most common control-center tasks</p>
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
                className="flex min-h-11 items-center justify-between rounded-xl border border-[#e0e9e4] bg-[#fbfdfc] px-3 py-2.5 text-sm font-medium text-[#354a40] transition active:scale-[0.98] hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-200/10 dark:bg-white/[0.025] dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:hover:text-white dark:focus-visible:ring-teal-300"
              >
                {label}
                <ArrowRight className="h-4 w-4 text-[#99a49f] dark:text-teal-200/50" aria-hidden />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className={`overflow-hidden ${panelClass}`}>
        <div className="border-b border-[#e8efeb] px-4 py-3.5 dark:border-teal-200/10 sm:px-5 sm:py-4">
          <h2 className="font-semibold text-[#1b2d25] dark:text-white">Top tenants</h2>
          <p className="mt-0.5 text-xs text-[#74817b] dark:text-teal-100/60">By order value in the last 30 days</p>
        </div>
        {topTenants.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[#6e7c75] dark:text-teal-100/65 sm:px-5 sm:py-10">
            No completed activity yet.
          </p>
        ) : (
          <div className="divide-y divide-[#edf2ef] dark:divide-teal-200/10">
            {topTenants.map((tenant, index) => (
              <Link
                key={tenant.id}
                href={`/platform/pharmacies/${tenant.id}`}
                className="flex min-h-[3.75rem] flex-wrap items-center gap-3 px-4 py-3 transition active:bg-teal-50 hover:bg-[#f8fbf9] focus:outline-none focus-visible:bg-teal-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:active:bg-teal-300/10 dark:hover:bg-teal-300/[0.06] dark:focus-visible:bg-teal-300/10 dark:focus-visible:ring-teal-300 sm:min-h-16 sm:flex-nowrap sm:px-5 sm:py-3.5"
              >
                <span aria-label={`Rank ${index + 1}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#d9e5df] bg-[#f2f7f4] text-xs font-semibold text-teal-700 dark:border-teal-200/15 dark:bg-teal-300/10 dark:text-teal-100">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1c2c26] dark:text-white">{tenant.name}</p>
                  <p className="mt-0.5 text-xs text-[#74817b] dark:text-teal-100/60">{tenant.orderCount} orders</p>
                </div>
                <p className="ml-10 text-sm font-semibold tabular-nums text-[#263c32] dark:text-teal-50 sm:ml-0">{kes(tenant.revenue)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
