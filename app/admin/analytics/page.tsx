import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Wallet,
  Package,
  Pill,
  RefreshCw,
  Users,
  UserCheck,
  Scale,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export const metadata = { title: "Analytics" };

export default async function AnalyticsIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const priorityReports = [
    { href: "/admin/analytics/overview", title: "Overview", desc: "See the pharmacy’s top-line operational picture before drilling down.", icon: BarChart3, label: "Start here" },
    { href: "/admin/analytics/payments", title: "Payments", desc: "Check collections, failures and outstanding receivables before balancing the day.", icon: Wallet, label: "Cash control" },
    { href: "/admin/analytics/reconciliation", title: "Reconciliation", desc: "Compare expected versus collected amounts and surface any difference quickly.", icon: Scale, label: "Close the day" },
  ];

  const reportGroups = [
    {
      title: "Revenue & growth",
      description: "Understand sales performance, profitability and customer value.",
      icon: TrendingUp,
      reports: [
        { href: "/admin/analytics/revenue", title: "Revenue", desc: "Gross and net sales, refunds, COGS, gross profit and daily trend.", icon: DollarSign },
        { href: "/admin/analytics/sales", title: "Sales", desc: "Orders, units, average order value, source mix and reservation funnel.", icon: ShoppingCart },
        { href: "/admin/analytics/products", title: "Products", desc: "Per-medicine revenue, COGS, profit, margin, discounts and refunds.", icon: TrendingUp },
        { href: "/admin/analytics/customers", title: "Customers", desc: "Lifetime value, repeat purchase rate and top customers by spend.", icon: Users },
      ],
    },
    {
      title: "Clinical & operations",
      description: "Follow patient-care throughput and stock health.",
      icon: Stethoscope,
      reports: [
        { href: "/admin/analytics/prescriptions", title: "Prescriptions", desc: "Prescription fills, collections, billing, COGS and gross profit.", icon: Pill },
        { href: "/admin/analytics/refills", title: "Refills", desc: "Refill funnel, turnaround time and revenue per refill.", icon: RefreshCw },
        { href: "/admin/analytics/inventory", title: "Inventory", desc: "Stock value, expiry exposure, write-offs and reorder suggestions.", icon: Package },
        { href: "/admin/analytics/staff", title: "Staff", desc: "Sales, dispatches, fills, cash collections, refunds and adjustments.", icon: UserCheck },
      ],
    },
  ];

  return (
    <AdminShell
      user={user}
      title="Analytics & reports"
      subtitle="Start with today’s controls, then drill into growth, clinical performance and operations."
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-4 sm:space-y-6">
        <section aria-labelledby="priority-reports-heading">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 admin-accent-text" />
            <h2 id="priority-reports-heading" className="text-sm font-semibold admin-text">Recommended first</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {priorityReports.map((report, index) => {
              const Icon = report.icon;
              return (
                <Link
                  key={report.href}
                  href={report.href}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-accent)] hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-sm font-bold uppercase tracking-wide admin-accent-text">{report.label}</span>
                      <h3 className="mt-3 text-base font-semibold admin-text">{report.title}</h3>
                      <p className="mt-1 text-base leading-6 admin-muted">{report.desc}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold admin-accent-text">
                    <span>Open report</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                  <span className="pointer-events-none absolute -bottom-10 -right-8 text-[96px] font-black leading-none text-[var(--admin-accent)] opacity-[0.035]">{index + 1}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {reportGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <AdminPanel
              key={group.title}
              title={group.title}
              description={group.description}
              action={<GroupIcon className="hidden h-5 w-5 admin-accent-text sm:block" />}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.reports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <Link
                      key={report.href}
                      href={report.href}
                      className="group flex min-h-36 flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,background-color] duration-200 hover:border-[var(--admin-accent)] hover:bg-[var(--admin-card)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold admin-text">{report.title}</h3>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-2 text-base leading-6 admin-muted">{report.desc}</p>
                      <span className="mt-auto pt-3 text-sm font-semibold admin-accent-text">Open <ArrowRight className="ml-1 inline h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" /></span>
                    </Link>
                  );
                })}
              </div>
            </AdminPanel>
          );
        })}

        <AdminPanel title="Decision guide" description="Use the same date range when comparing reports.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-[var(--admin-inset)] p-4"><div className="flex items-center gap-2 text-sm font-semibold admin-text"><ShieldCheck className="h-4 w-4 admin-accent-text" /> Balance the day</div><p className="mt-2 text-sm leading-5 admin-muted">Payments → reconciliation → investigate any gap before close.</p></div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-4"><div className="flex items-center gap-2 text-sm font-semibold admin-text"><Package className="h-4 w-4 admin-accent-text" /> Plan purchases</div><p className="mt-2 text-sm leading-5 admin-muted">Inventory → products → prioritize stock with demand and margin.</p></div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-4"><div className="flex items-center gap-2 text-sm font-semibold admin-text"><Users className="h-4 w-4 admin-accent-text" /> Improve retention</div><p className="mt-2 text-sm leading-5 admin-muted">Customers → refills → identify repeat patients and follow-up gaps.</p></div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
