import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { ensureDefaultPlans } from "@/app/lib/platform/billing";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function PlatformBillingPage() {
  await ensureDefaultPlans().catch(() => {});
  const [plans, subs, invoices, dunning] = await Promise.all([
    prismaUnscoped.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: true } } } }).catch(() => []),
    prismaUnscoped.subscription.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { plan: true, pharmacy: { select: { name: true, slug: true } } } }).catch(() => []),
    prismaUnscoped.invoice.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.dunningCase.count({ where: { status: { notIn: ["resolved", "written_off"] } } }).catch(() => 0),
  ]);

  return (
    <PlatformPage
      title="SaaS billing"
      description="Plans, subscriptions, invoices and dunning for pharmacies paying the platform — separate from customer M-Pesa orders."
    >
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/platform/plans" className="rounded-xl border border-white/15 px-3 py-2 hover:bg-white/5">Plans</Link>
        <Link href="/platform/subscriptions" className="rounded-xl border border-white/15 px-3 py-2 hover:bg-white/5">Subscriptions</Link>
        <Link href="/platform/invoices" className="rounded-xl border border-white/15 px-3 py-2 hover:bg-white/5">Invoices</Link>
        <Link href="/platform/usage" className="rounded-xl border border-white/15 px-3 py-2 hover:bg-white/5">Usage</Link>
        <span className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-100">{dunning} open dunning cases</span>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Plans</h2>
      <PlatformTable
        headers={["Plan", "Price / month", "Tenants"]}
        empty="No plans yet — they are created on first billing run."
        rows={plans.map((p) => [p.name, `KES ${Number(p.priceKes).toLocaleString("en-KE")}`, String(p._count.subscriptions)])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent subscriptions</h2>
      <PlatformTable
        headers={["Pharmacy", "Plan", "Status", "Period end"]}
        empty="No subscriptions."
        rows={subs.map((s) => [
          s.pharmacy.name,
          s.plan.name,
          s.status,
          s.currentPeriodEnd.toISOString().slice(0, 10),
        ])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent invoices</h2>
      <PlatformTable
        headers={["Number", "Pharmacy", "Total", "Status"]}
        empty="No invoices."
        rows={invoices.map((i) => [
          i.number,
          i.pharmacy.name,
          `KES ${Number(i.totalKes).toLocaleString("en-KE")}`,
          i.status,
        ])}
      />
    </PlatformPage>
  );
}
