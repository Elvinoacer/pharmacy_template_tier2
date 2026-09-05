import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getInventoryHealth } from "@/app/lib/services/stock";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminCard, AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { formatDate } from "@/app/lib/time";
import {
  Package,
  AlertTriangle,
  PackageX,
  CalendarClock,
  Truck,
  ArrowRight,
} from "lucide-react";

export const metadata = { title: "Inventory health" };
export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const health = await getInventoryHealth({ expiryDays: 60, salesLookbackDays: 30 });

  return (
    <AdminShell
      user={user}
      title="Stock & expiry"
      subtitle="Review low stock, expired batches, and reorder suggestions."
      actions={
        <Link href="/admin/medications" className="btn-admin">
          <Package className="h-4 w-4" /> Full catalogue
        </Link>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminCard
          label="Active SKUs"
          value={health.counts.totalActive}
          icon={Package}
          accent="neutral"
        />
        <Link href="#low" className="block">
          <AdminCard
            label="Low stock"
            value={health.counts.lowStock}
            hint="At or below threshold"
            icon={AlertTriangle}
            accent={health.counts.lowStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="#out" className="block">
          <AdminCard
            label="Out of stock"
            value={health.counts.outOfStock}
            icon={PackageX}
            accent={health.counts.outOfStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="#expiry" className="block">
          <AdminCard
            label="Expiring ≤60d"
            value={health.counts.expiringLots}
            hint={`${health.counts.expiredLots} already expired`}
            icon={CalendarClock}
            accent={
              health.counts.expiredLots > 0 || health.counts.expiringLots > 0 ? "danger" : "neutral"
            }
          />
        </Link>
        <Link href="#reorder" className="block">
          <AdminCard
            label="Reorder now"
            value={health.counts.reorder}
            hint="Velocity + threshold"
            icon={Truck}
            accent={health.counts.reorder > 0 ? "accent" : "neutral"}
          />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          id="low"
          title="Low stock"
          description="Above zero but at or below threshold"
        >
          {health.lowStock.length === 0 ? (
            <AdminEmptyState
              icon={Package}
              title="All healthy"
              description="No active items are below their low-stock threshold."
            />
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {health.lowStock.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/medications/${item.id}`}
                      className="font-semibold admin-text hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs admin-soft">
                      {item.currentStock} left · alert ≤ {item.lowStockThreshold}
                      {item.supplier ? ` · ${item.supplier}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/medications/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text"
                  >
                    Receive <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel id="out" title="Out of stock" description="Zero units — sell/refill blocked">
          {health.outOfStock.length === 0 ? (
            <AdminEmptyState
              icon={Package}
              title="Nothing out"
              description="Every active SKU has at least one unit."
            />
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {health.outOfStock.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/medications/${item.id}`}
                      className="font-semibold text-rose-700 hover:underline dark:text-rose-400"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs admin-soft">
                      Threshold ≤ {item.lowStockThreshold}
                      {item.supplier ? ` · ${item.supplier}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/medications/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                  >
                    Restock <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          id="expiry"
          title="Expiring & expired lots"
          description="FEFO batches within 60 days or already past expiry"
          className="lg:col-span-2"
        >
          {health.expiredLots.length === 0 && health.expiringLots.length === 0 ? (
            <AdminEmptyState
              icon={CalendarClock}
              title="No expiry pressure"
              description="No active lots are expired or expiring in the next 60 days. Receive stock with batch + expiry to enable this."
            />
          ) : (
            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide admin-soft">
                    <th className="px-2 py-2">Medicine</th>
                    <th className="px-2 py-2">Batch</th>
                    <th className="px-2 py-2">Expiry</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {health.expiredLots.map((l) => (
                    <tr key={l.lotId} className="border-b border-[var(--admin-border)]">
                      <td className="px-2 py-2 font-medium">{l.name}</td>
                      <td className="px-2 py-2 tabular-nums">{l.batchNumber}</td>
                      <td className="px-2 py-2">{formatDate(l.expiryDate)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{l.quantity}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                          Expired
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Link
                          href={`/admin/medications/${l.inventoryId}`}
                          className="text-xs font-semibold admin-accent-text"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {health.expiringLots.map((l) => (
                    <tr key={l.lotId} className="border-b border-[var(--admin-border)]">
                      <td className="px-2 py-2 font-medium">{l.name}</td>
                      <td className="px-2 py-2 tabular-nums">{l.batchNumber}</td>
                      <td className="px-2 py-2">{formatDate(l.expiryDate)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{l.quantity}</td>
                      <td className="px-2 py-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          {l.daysUntilExpiry}d left
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Link
                          href={`/admin/medications/${l.inventoryId}`}
                          className="text-xs font-semibold admin-accent-text"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          id="reorder"
          title="Reorder suggestions"
          description="Based on 30-day sales velocity and low-stock thresholds. Suggested qty aims for ~30 days cover or 2× threshold."
          className="lg:col-span-2"
        >
          {health.reorderSuggestions.length === 0 ? (
            <AdminEmptyState
              icon={Truck}
              title="Nothing to reorder"
              description="Stock levels and recent velocity look fine."
            />
          ) : (
            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-wide admin-soft">
                    <th className="px-2 py-2">Medicine</th>
                    <th className="px-2 py-2 text-right">On hand</th>
                    <th className="px-2 py-2 text-right">Threshold</th>
                    <th className="px-2 py-2 text-right">Sold 30d</th>
                    <th className="px-2 py-2 text-right">Suggest order</th>
                    <th className="px-2 py-2">Supplier</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {health.reorderSuggestions.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--admin-border)]">
                      <td className="px-2 py-2 font-medium">{r.name}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.currentStock}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.lowStockThreshold}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{r.unitsSold30d}</td>
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {r.suggestedOrderQty}
                      </td>
                      <td className="px-2 py-2 text-xs admin-soft">{r.supplier || "—"}</td>
                      <td className="px-2 py-2 text-right">
                        <Link
                          href={`/admin/medications/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text"
                        >
                          Receive <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
