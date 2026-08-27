import Link from "next/link";
import { ArrowRight, Building2, Clock3, ShoppingBag, Users } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";

export const metadata = { title: "Network overview" };

function kes(n: number): string { return `KES ${Math.round(n).toLocaleString("en-KE")}`; }

const cardLinkClass = "group block rounded-2xl border border-white/15 bg-white/[0.05] p-5 transition hover:-translate-y-0.5 hover:border-teal-300/40 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071512]";
const textMuted = "text-teal-50/75";

export default async function PlatformHomePage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  let pharmacies = 0, pending = 0, live = 0, users = 0, orders30d = 0, refills30d = 0, gmv30d = 0;
  let recent: Array<{ id: string; name: string; status: string; city: string | null; createdAt: Date }> = [];
  let topTenants: Array<{ id: string; name: string; status: string; orderCount: number; revenue: number }> = [];

  try {
    [pharmacies, pending, live, users, recent] = await Promise.all([
      prismaUnscoped.pharmacy.count(),
      prismaUnscoped.pharmacy.count({ where: { status: { in: ["submitted", "under_review", "needs_info"] } } }),
      prismaUnscoped.pharmacy.count({ where: { status: "active", listed: true } }),
      prismaUnscoped.user.count(),
      prismaUnscoped.pharmacy.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, status: true, city: true, createdAt: true } }),
    ]);
    const [orderAgg, refillAgg, payAgg, perTenant] = await Promise.all([
      prismaUnscoped.order.count({ where: { createdAt: { gte: since }, status: { not: "cancelled" } } }),
      prismaUnscoped.refillRequest.count({ where: { createdAt: { gte: since }, status: { not: "cancelled" } } }),
      prismaUnscoped.payment.aggregate({ where: { status: "completed", createdAt: { gte: since } }, _sum: { amount: true } }),
      prismaUnscoped.pharmacy.findMany({ where: { status: "active" }, select: { id: true, name: true, status: true, orders: { where: { createdAt: { gte: since }, status: { not: "cancelled" } }, select: { id: true, netTotal: true } } } }),
    ]);
    orders30d = orderAgg; refills30d = refillAgg; gmv30d = Number(payAgg._sum.amount ?? 0);
    topTenants = perTenant.map((tenant) => ({ id: tenant.id, name: tenant.name, status: tenant.status, orderCount: tenant.orders.length, revenue: tenant.orders.reduce((sum, order) => sum + Number(order.netTotal ?? 0), 0) })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  } catch {}

  const stats = [
    { label: "Pharmacies", value: pharmacies, detail: "Total tenant accounts", href: "/platform/pharmacies", icon: Building2 },
    { label: "Needs attention", value: pending, detail: "Applications awaiting review", href: "/platform/applications", icon: Clock3 },
    { label: "Live storefronts", value: live, detail: "Visible in the marketplace", href: "/platform/pharmacies?status=active", icon: ShoppingBag },
    { label: "User accounts", value: users, detail: "Across the whole network", href: "/platform/users", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="platform-overview-title" className="rounded-3xl border border-teal-200/20 bg-[linear-gradient(135deg,rgba(13,110,90,.28),rgba(7,21,18,.55)_55%,rgba(255,255,255,.05))] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">Platform overview</p>
        <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 id="platform-overview-title" className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>Network control</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/80">Review pharmacy applications, monitor network activity, and manage platform access from one place.</p>
          </div>
          <Link href="/platform/applications" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#071512] transition hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071512]">Review queue <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>

      <section aria-labelledby="network-statistics-title">
        <h2 id="network-statistics-title" className="sr-only">Network statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => { const Icon = stat.icon; return <Link key={stat.label} href={stat.href} className={cardLinkClass}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-teal-50/75">{stat.label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{stat.value.toLocaleString("en-KE")}</p></div>
              <span className="rounded-xl border border-teal-200/15 bg-teal-300/15 p-2.5 text-teal-100"><Icon className="h-5 w-5" aria-hidden /></span>
            </div>
            <p className={`mt-3 text-xs ${textMuted}`}>{stat.detail}</p>
          </Link>; })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]" aria-label="Network activity and quick actions">
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold">Network activity</h2><p className={`mt-1 text-xs ${textMuted}`}>Last 30 days across all pharmacies</p></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[{label:"Orders",value:orders30d.toLocaleString("en-KE")},{label:"Refill requests",value:refills30d.toLocaleString("en-KE")},{label:"Collected online",value:kes(gmv30d)}].map((item)=><div key={item.label} className="rounded-xl border border-white/15 bg-black/15 p-4"><p className="text-xs font-medium text-teal-50/75">{item.label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{item.value}</p></div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
          <div><h2 className="text-lg font-semibold">Quick actions</h2><p className={`mt-1 text-xs ${textMuted}`}>Most common platform tasks</p></div>
          <nav aria-label="Quick actions" className="mt-4 grid gap-2">
            {[["Review applications","/platform/applications"],["Manage pharmacies","/platform/pharmacies"],["Manage users","/platform/users"],["View audit trail","/platform/audit"]].map(([label,href])=><Link key={href} href={href} className="flex min-h-11 items-center justify-between rounded-xl border border-white/15 px-3 py-3 text-sm font-medium text-teal-50/85 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">{label}<ArrowRight className="h-4 w-4 text-teal-100/70" aria-hidden /></Link>)}
          </nav>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="Recent applications and top tenants">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4 border-b border-white/15 px-5 py-4"><div><h2 className="font-semibold">Recent applications</h2><p className={`mt-0.5 text-xs ${textMuted}`}>Newest pharmacy records</p></div><Link href="/platform/applications" className="min-h-11 inline-flex items-center rounded-lg px-2 text-xs font-semibold text-teal-100 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">View queue</Link></div>
          <div className="divide-y divide-white/10">{recent.length === 0 ? <p className="px-5 py-10 text-center text-sm text-teal-50/70">No pharmacy records yet.</p> : recent.map((item)=><Link key={item.id} href={`/platform/pharmacies/${item.id}`} className="flex min-h-16 items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.05] focus:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className={`mt-1 text-xs ${textMuted}`}>{item.city || "Location not set"}</p></div><span className="shrink-0 rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-50/80">{item.status.replace("_", " ")}</span></Link>)}</div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04]">
          <div className="border-b border-white/15 px-5 py-4"><h2 className="font-semibold">Top tenants</h2><p className={`mt-0.5 text-xs ${textMuted}`}>By order value in the last 30 days</p></div>
          {topTenants.length === 0 ? <p className="px-5 py-10 text-center text-sm text-teal-50/70">No completed activity yet.</p> : <div className="divide-y divide-white/10">{topTenants.map((tenant,index)=><Link key={tenant.id} href={`/platform/pharmacies/${tenant.id}`} className="flex min-h-16 items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.05] focus:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"><span aria-label={`Rank ${index + 1}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-xs text-teal-50/70">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{tenant.name}</p><p className={`mt-0.5 text-xs ${textMuted}`}>{tenant.orderCount} orders</p></div><p className="text-sm font-semibold tabular-nums">{kes(tenant.revenue)}</p></Link>)}</div>}
        </div>
      </section>
    </div>
  );
}
