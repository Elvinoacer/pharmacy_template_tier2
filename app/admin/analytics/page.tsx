import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel, AdminCard, AdminEmptyState } from "@/app/components/admin/AdminUI";
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
  Activity,
  ArrowRight,
} from "lucide-react";

export const metadata = { title: "Analytics" };

/**
 * Analytics landing page (audit §73).
 * Lists every analytics dashboard so staff can drill into each domain.
 */
export default async function AnalyticsIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const cards = [
    { href: "/admin/analytics/overview", title: "Overview", desc: "Top-line numbers across the whole pharmacy: revenue, sales, payments, fulfillment, inventory, customers.", icon: BarChart3, accent: "accent" as const },
    { href: "/admin/analytics/revenue", title: "Revenue", desc: "Gross sales, net sales, collections, refunds, COGS, gross profit, gross margin. Daily trend chart.", icon: DollarSign, accent: "accent" as const },
    { href: "/admin/analytics/sales", title: "Sales", desc: "Orders, units, average order value, basket size, by source/type, reservation funnel.", icon: ShoppingCart, accent: "info" as const },
    { href: "/admin/analytics/payments", title: "Payments", desc: "M-Pesa, cash, card collections. Success rate, failures, outstanding receivables with aging buckets.", icon: Wallet, accent: "info" as const },
    { href: "/admin/analytics/prescriptions", title: "Prescriptions", desc: "Prescription fills, dispatched, collected, billed, collected, outstanding, COGS, gross profit.", icon: Pill, accent: "neutral" as const },
    { href: "/admin/analytics/refills", title: "Refills", desc: "Refill funnel: submitted → approved → preparing → ready → collected. Turnaround time, revenue per refill.", icon: RefreshCw, accent: "neutral" as const },
    { href: "/admin/analytics/inventory", title: "Inventory", desc: "Stock value, reserved units, expiring value, write-offs, low/out of stock, reorder suggestions.", icon: Package, accent: "neutral" as const },
    { href: "/admin/analytics/products", title: "Products", desc: "Per-medicine profitability: units sold, revenue, COGS, gross profit, margin %, discounts, refunds.", icon: TrendingUp, accent: "accent" as const },
    { href: "/admin/analytics/customers", title: "Customers", desc: "Lifetime value, repeat-purchase rate, average customer value, top customers by spend.", icon: Users, accent: "info" as const },
    { href: "/admin/analytics/staff", title: "Staff", desc: "Sales by staff, dispatches, prescription fills, cash collected, refunds approved, adjustments.", icon: UserCheck, accent: "info" as const },
    { href: "/admin/analytics/reconciliation", title: "Reconciliation", desc: "Expected vs collected by provider, waivers, refunds, and the difference for the selected period.", icon: Scale, accent: "danger" as const },
  ];

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <AdminPanel
          title="Analytics"
          description="Commerce-grade analytics for the whole pharmacy. Drill into each domain for charts and breakdowns."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className="admin-card group p-4 transition hover:border-[var(--admin-accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold admin-text">{c.title}</p>
                      <p className="mt-1 text-xs admin-muted line-clamp-3">{c.desc}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)] shadow">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--admin-accent)] opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </AdminPanel>

        <AdminPanel
          title="What changed"
          description="Summary of the commerce-ledger rebuild that powers these dashboards."
        >
          <ul className="space-y-2 text-xs admin-muted">
            <li>• Added <strong>PrescriptionFill</strong>, <strong>InventoryReservation</strong>, <strong>Refund</strong>, <strong>InventoryAllocation</strong>, <strong>CommerceEvent</strong>, <strong>MedicationPriceHistory</strong>, <strong>CashierSession</strong> as first-class models.</li>
            <li>• Order now tracks <strong>lifecycle / payment / fulfillment stages</strong> separately (audit §15) — no more mixing them in a single status string.</li>
            <li>• OrderItem snapshots <strong>cost price + gross/net/profit</strong> at sale time (audit §17) so historical margin never depends on today&apos;s price.</li>
            <li>• Reservation lifecycle: stock held as <strong>reservation_create</strong>, converted to <strong>sale</strong> on fulfillment, released on cancel/expire (audit §8, §9, §10).</li>
            <li>• New <code>/api/cron/reservations</code> cron auto-releases expired reservations every 15 minutes.</li>
            <li>• Loyalty cron now keys off <strong>Payment.status = completed</strong> instead of Order.status (audit §23, §62).</li>
            <li>• All financial analytics use explicit <code>paidAt</code> / <code>fulfilledAt</code> / <code>processedAt</code> timestamps — never <code>updatedAt</code> (audit §62).</li>
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
