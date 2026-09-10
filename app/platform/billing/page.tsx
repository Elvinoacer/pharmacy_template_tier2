import Link from "next/link";
import { AlertCircle, ArrowRight, FileText, Layers3, ReceiptText, UsersRound } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { ensureDefaultPlans } from "@/app/lib/platform/billing";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function PlatformBillingPage() {
  await ensureDefaultPlans().catch(() => {});

  const [plans, subs, invoices, dunning] = await Promise.all([
    prismaUnscoped.plan
      .findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { subscriptions: true } } },
      })
      .catch(() => []),
    prismaUnscoped.subscription
      .findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { plan: true, pharmacy: { select: { name: true, slug: true } } },
      })
      .catch(() => []),
    prismaUnscoped.invoice
      .findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { pharmacy: { select: { name: true } } },
      })
      .catch(() => []),
    prismaUnscoped.dunningCase
      .count({ where: { status: { notIn: ["resolved", "written_off"] } } })
      .catch(() => 0),
  ]);

  const totalMonthlyPlanValue = plans.reduce(
    (sum, plan) => sum + Number(plan.priceKes) * plan._count.subscriptions,
    0,
  );

  const shortcuts = [
    { label: "Plans", href: "/platform/plans", icon: Layers3 },
    { label: "Subscriptions", href: "/platform/subscriptions", icon: UsersRound },
    { label: "Invoices", href: "/platform/invoices", icon: ReceiptText },
    { label: "Usage", href: "/platform/usage", icon: FileText },
  ];

  return (
    <PlatformPage
      eyebrow="Revenue operations"
      title="SaaS billing"
      description="Manage pharmacy plans, subscriptions, invoices and dunning separately from customer M-Pesa transactions."
    >
      <section aria-label="Billing summary" className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78857f] dark:text-teal-100/55">Plans</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#14211d] dark:text-white">{plans.length}</p>
          <p className="mt-1 text-xs text-[#6a7972] dark:text-teal-100/60">Available tiers</p>
        </div>
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78857f] dark:text-teal-100/55">Recent subs</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#14211d] dark:text-white">{subs.length}</p>
          <p className="mt-1 text-xs text-[#6a7972] dark:text-teal-100/60">Latest records</p>
        </div>
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78857f] dark:text-teal-100/55">Plan value</p>
          <p className="mt-2 text-lg font-semibold tabular-nums text-[#14211d] dark:text-white sm:text-xl">
            KES {Math.round(totalMonthlyPlanValue).toLocaleString("en-KE")}
          </p>
          <p className="mt-1 text-xs text-[#6a7972] dark:text-teal-100/60">Monthly list value</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm shadow-black/[0.02] dark:shadow-none ${dunning > 0 ? "border-amber-200 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/10" : "border-[#dce7e1] bg-white dark:border-teal-200/15 dark:bg-teal-950/30"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${dunning > 0 ? "text-amber-700 dark:text-amber-200/70" : "text-[#78857f] dark:text-teal-100/55"}`}>Dunning</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${dunning > 0 ? "text-amber-950 dark:text-amber-100" : "text-[#14211d] dark:text-white"}`}>{dunning}</p>
          <p className={`mt-1 text-xs ${dunning > 0 ? "text-amber-800/80 dark:text-amber-200/65" : "text-[#6a7972] dark:text-teal-100/60"}`}>Open cases</p>
        </div>
      </section>

      {dunning > 0 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p><strong>{dunning} dunning {dunning === 1 ? "case needs" : "cases need"} attention.</strong> Review unpaid or failed subscription collections before they age further.</p>
        </div>
      )}

      <nav aria-label="Billing sections" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-[#dce7e1] bg-white px-3.5 py-3 text-sm font-semibold text-[#31463d] shadow-sm shadow-black/[0.02] transition active:scale-[0.98] hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-white/10 dark:bg-white/[0.035] dark:text-teal-50/90 dark:shadow-none dark:hover:border-teal-300/25 dark:hover:bg-teal-300/10 dark:hover:text-white dark:focus-visible:ring-teal-300"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200" aria-hidden />
                <span className="truncate">{item.label}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#93a099] transition group-hover:translate-x-0.5 dark:text-teal-100/40" aria-hidden />
            </Link>
          );
        })}
      </nav>

      <section className="mt-7 sm:mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1c2c26] dark:text-white">Plans</h2>
            <p className="mt-0.5 text-xs text-[#6f7d76] dark:text-teal-100/60">Current subscription tiers and tenant adoption</p>
          </div>
        </div>
        <PlatformTable
          headers={["Plan", "Price / month", "Tenants"]}
          empty="No plans yet — they are created on first billing run."
          rows={plans.map((plan) => [
            plan.name,
            `KES ${Number(plan.priceKes).toLocaleString("en-KE")}`,
            String(plan._count.subscriptions),
          ])}
        />
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Recent subscriptions</h2>
        <PlatformTable
          headers={["Pharmacy", "Plan", "Status", "Period end"]}
          empty="No subscriptions."
          rows={subs.map((subscription) => [
            subscription.pharmacy.name,
            subscription.plan.name,
            subscription.status,
            subscription.currentPeriodEnd.toISOString().slice(0, 10),
          ])}
        />
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Recent invoices</h2>
        <PlatformTable
          headers={["Number", "Pharmacy", "Total", "Status"]}
          empty="No invoices."
          rows={invoices.map((invoice) => [
            invoice.number,
            invoice.pharmacy.name,
            `KES ${Number(invoice.totalKes).toLocaleString("en-KE")}`,
            invoice.status,
          ])}
        />
      </section>
    </PlatformPage>
  );
}
