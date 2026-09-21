import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getInventoryHealth } from "@/app/lib/services/stock";
import { withPharmacy } from "@/app/lib/tenant-context";
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
  Boxes,
} from "lucide-react";

export const metadata = { title: "Inventory health" };
export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const pharmacyId = user.activePharmacyId;
  const activeMembership = pharmacyId
    ? user.memberships.some(
        (membership) => membership.pharmacyId === pharmacyId && membership.status === "active",
      )
    : false;
  if (!pharmacyId || (!activeMembership && !user.platformAdmin)) {
    redirect("/admin/select");
  }

  const health = await withPharmacy(pharmacyId, () =>
    getInventoryHealth({ expiryDays: 60, salesLookbackDays: 30 }),
  );

  return (
    <AdminShell
      user={user}
      title="Stock & expiry"
      subtitle="Act on stock-outs and expiry pressure first, then use velocity-based suggestions to plan replenishment."
      actions={
        <Link href="/admin/medications" className="btn-admin w-full justify-center sm:w-auto">
          <Package className="h-4 w-4" /> Full catalogue
        </Link>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <AdminCard
          label="Active SKUs"
          value={health.counts.totalActive}
          icon={Package}
          accent="neutral"
        />
        <Link href="#low" className="block min-w-0">
          <AdminCard
            label="Low stock"
            value={health.counts.lowStock}
            hint="At or below threshold"
            icon={AlertTriangle}
            accent={health.counts.lowStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="#out" className="block min-w-0">
          <AdminCard
            label="Out of stock"
            value={health.counts.outOfStock}
            icon={PackageX}
            accent={health.counts.outOfStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="#expiry" className="block min-w-0">
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
        <Link href="#reorder" className="col-span-2 block min-w-0 lg:col-span-1">
          <AdminCard
            label="Reorder now"
            value={health.counts.reorder}
            hint="Velocity + threshold"
            icon={Truck}
            accent={health.counts.reorder > 0 ? "accent" : "neutral"}
          />
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <AdminPanel
          id="low"
          title="Low stock"
          description="Above zero but at or below the configured threshold."
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
                <li key={item.id} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/medications/${item.id}`}
                      className="break-words text-sm font-semibold admin-text hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 break-words text-xs leading-5 admin-soft">
                      {item.currentStock} left · alert ≤ {item.lowStockThreshold}
                      {item.supplier ? ` · ${item.supplier}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/medications/${item.id}`}
                    className="inline-flex min-h-10 items-center justify-between gap-1 rounded-lg bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-accent-text sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-0"
                  >
                    Receive stock <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel id="out" title="Out of stock" description="Zero units — selling and refills are blocked.">
          {health.outOfStock.length === 0 ? (
            <AdminEmptyState
              icon={Package}
              title="Nothing out"
              description="Every active SKU has at least one unit."
            />
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {health.outOfStock.map((item) => (
                <li key={item.id} className="flex min-w-0 flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/medications/${item.id}`}
                      className="break-words text-sm font-semibold text-rose-700 hover:underline dark:text-rose-300"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 break-words text-xs leading-5 admin-soft">
                      Threshold ≤ {item.lowStockThreshold}
                      {item.supplier ? ` · ${item.supplier}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/medications/${item.id}`}
                    className="inline-flex min-h-10 items-center justify-between gap-1 rounded-lg bg-rose-500/10 px-3 text-xs font-semibold text-rose-700 dark:bg-rose-400/10 dark:text-rose-300 sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-0 dark:sm:bg-transparent"
                  >
                    Restock <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          id="expiry"
          title="Expiring & expired lots"
          description="FEFO batches within 60 days or already past expiry."
          className="lg:col-span-2"
        >
          {health.expiredLots.length === 0 && health.expiringLots.length === 0 ? (
            <AdminEmptyState
              icon={CalendarClock}
              title="No expiry pressure"
              description="No active lots are expired or expiring in the next 60 days. Receive stock with batch and expiry to enable this view."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {health.expiredLots.map((lot) => (
                  <article key={lot.lotId} className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 dark:border-rose-400/20 dark:bg-rose-400/[0.04]">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold admin-text">{lot.name}</h3>
                        <p className="mt-1 text-xs admin-muted">Batch {lot.batchNumber}</p>
                      </div>
                      <span className="rounded-full bg-rose-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">Expired</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Expiry</p>
                        <p className="mt-1 font-semibold admin-text">{formatDate(lot.expiryDate)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Quantity</p>
                        <p className="mt-1 font-semibold admin-text">{lot.quantity}</p>
                      </div>
                    </div>
                    <Link href={`/admin/medications/${lot.inventoryId}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-accent-text">
                      Manage lot <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))}

                {health.expiringLots.map((lot) => (
                  <article key={lot.lotId} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5 dark:border-amber-400/20 dark:bg-amber-400/[0.04]">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold admin-text">{lot.name}</h3>
                        <p className="mt-1 text-xs admin-muted">Batch {lot.batchNumber}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20">{lot.daysUntilExpiry}d left</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Expiry</p>
                        <p className="mt-1 font-semibold admin-text">{formatDate(lot.expiryDate)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Quantity</p>
                        <p className="mt-1 font-semibold admin-text">{lot.quantity}</p>
                      </div>
                    </div>
                    <Link href={`/admin/medications/${lot.inventoryId}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-accent-text">
                      Manage lot <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))}
              </div>

              <div tabIndex={0} role="region" aria-label="Expiry records" className="admin-table-region hidden overflow-x-auto md:block">
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
                    {health.expiredLots.map((lot) => (
                      <tr key={lot.lotId} className="border-b border-[var(--admin-border)]">
                        <td className="px-2 py-2 font-medium">{lot.name}</td>
                        <td className="px-2 py-2 tabular-nums">{lot.batchNumber}</td>
                        <td className="px-2 py-2">{formatDate(lot.expiryDate)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{lot.quantity}</td>
                        <td className="px-2 py-2">
                          <span className="rounded-full bg-rose-500/12 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">Expired</span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Link href={`/admin/medications/${lot.inventoryId}`} className="text-xs font-semibold admin-accent-text">Manage</Link>
                        </td>
                      </tr>
                    ))}
                    {health.expiringLots.map((lot) => (
                      <tr key={lot.lotId} className="border-b border-[var(--admin-border)]">
                        <td className="px-2 py-2 font-medium">{lot.name}</td>
                        <td className="px-2 py-2 tabular-nums">{lot.batchNumber}</td>
                        <td className="px-2 py-2">{formatDate(lot.expiryDate)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{lot.quantity}</td>
                        <td className="px-2 py-2">
                          <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">{lot.daysUntilExpiry}d left</span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Link href={`/admin/medications/${lot.inventoryId}`} className="text-xs font-semibold admin-accent-text">Manage</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          id="reorder"
          title="Reorder suggestions"
          description="30-day sales velocity plus low-stock thresholds. Suggested quantity targets roughly 30 days of cover or 2× threshold."
          className="lg:col-span-2"
        >
          {health.reorderSuggestions.length === 0 ? (
            <AdminEmptyState
              icon={Truck}
              title="Nothing to reorder"
              description="Stock levels and recent sales velocity look healthy."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {health.reorderSuggestions.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3.5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold admin-text">{item.name}</h3>
                        <p className="mt-1 break-words text-xs admin-muted">{item.supplier || "No supplier assigned"}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
                        <Boxes className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">On hand</p>
                        <p className="mt-1 font-semibold admin-text">{item.currentStock}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Sold 30d</p>
                        <p className="mt-1 font-semibold admin-text">{item.unitsSold30d}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-inset)] p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.06em] admin-soft">Threshold</p>
                        <p className="mt-1 font-semibold admin-text">{item.lowStockThreshold}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/10 p-2.5 dark:bg-emerald-400/10">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-300">Suggested order</p>
                        <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">{item.suggestedOrderQty}</p>
                      </div>
                    </div>
                    <Link href={`/admin/medications/${item.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-[var(--admin-accent-soft)] px-3 text-xs font-semibold admin-accent-text">
                      Receive stock <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))}
              </div>

              <div tabIndex={0} role="region" aria-label="Reorder records" className="admin-table-region hidden overflow-x-auto md:block">
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
                    {health.reorderSuggestions.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--admin-border)]">
                        <td className="px-2 py-2 font-medium">{item.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{item.currentStock}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{item.lowStockThreshold}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{item.unitsSold30d}</td>
                        <td className="px-2 py-2 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{item.suggestedOrderQty}</td>
                        <td className="px-2 py-2 text-xs admin-soft">{item.supplier || "—"}</td>
                        <td className="px-2 py-2 text-right">
                          <Link href={`/admin/medications/${item.id}`} className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text">
                            Receive <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
