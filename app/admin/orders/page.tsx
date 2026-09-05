import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel, AdminCard } from "@/app/components/admin/AdminUI";
import OrderForm from "@/app/components/admin/OrderForm";
import { OrderSettleActions } from "@/app/components/admin/WaiveOrderForm";
import { Pagination } from "@/app/components/Pagination";
import Link from "next/link";
import { formatDateTime } from "@/app/lib/time";
import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  Clock,
  CheckCircle2,
  Banknote,
  Package,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: unknown;
  source: string;
  createdAt: Date;
  customer?: { fullName: string | null } | null;
};

const money = (value: unknown) => Number(value || 0).toLocaleString("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  preparing: { label: "Preparing", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  ready: { label: "Ready", className: "bg-teal-500/10 text-teal-700 dark:text-teal-400" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const status = sp.status || undefined;
  const period = sp.period || "30d";

  // Compute revenue stats for the selected period.
  const now = new Date();
  const since = new Date();
  if (period === "today") since.setHours(0, 0, 0, 0);
  else if (period === "7d") since.setDate(now.getDate() - 7);
  else if (period === "30d") since.setDate(now.getDate() - 30);
  else if (period === "quarter") since.setMonth(now.getMonth() - 3);
  else if (period === "year") since.setFullYear(now.getFullYear() - 1);

  let allPayments: { amount: unknown; createdAt: Date }[] = [];
  let allOrders: { id: string; total: unknown; status: string; source: string; createdAt: Date }[] = [];
  let recentOrders: OrderRow[] = [];
  let total = 0;

  const page = Math.max(1, Number.parseInt(sp.page || "1", 10) || 1);

  try {
    [allPayments, allOrders, recentOrders, total] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "completed", createdAt: { gte: since } },
        select: { amount: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, total: true, status: true, source: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: status ? { status } : undefined,
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }) as Promise<OrderRow[]>,
      prisma.order.count({ where: status ? { status } : undefined }),
    ]);
  } catch (error) {
    console.error("[admin/orders] Failed to load orders:", error);
  }

  const revenue = allPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const orderValue = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const completedOrders = allOrders.filter((order) => order.status === "completed").length;
  const avgOrder = completedOrders > 0 ? orderValue / allOrders.length : 0;
  const pendingOrders = allOrders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;

  return (
    <AdminShell
      user={user}
      title="Orders & POS"
      subtitle="Counter sales, online orders, payments, and fulfilment in one workspace."
      actions={
        <Link href="/admin/analytics/sales" className="btn-secondary-admin">
          <TrendingUp className="h-4 w-4" /> Sales analytics
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] admin-soft">Revenue</p>
              <p className="mt-2 text-2xl font-bold admin-text">{money(revenue)}</p>
            </div>
            <Banknote className="h-6 w-6 admin-accent-text" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] admin-soft">Orders</p>
              <p className="mt-2 text-2xl font-bold admin-text">{allOrders.length}</p>
            </div>
            <ShoppingCart className="h-6 w-6 admin-accent-text" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] admin-soft">Pending</p>
              <p className="mt-2 text-2xl font-bold admin-text">{pendingOrders}</p>
            </div>
            <Clock className="h-6 w-6 text-amber-500" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] admin-soft">Avg. order</p>
              <p className="mt-2 text-2xl font-bold admin-text">{money(avgOrder)}</p>
            </div>
            <Receipt className="h-6 w-6 admin-accent-text" />
          </div>
        </AdminCard>
      </div>

      <AdminPanel title="Record a counter sale" subtitle="Create an OTC or prescription-linked order and collect payment.">
        <OrderForm />
      </AdminPanel>

      <AdminPanel title="Recent orders" subtitle={`${total.toLocaleString()} orders in this view`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"].map((value) => {
            const active = (status || "") === value;
            return (
              <Link
                key={value || "all"}
                href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--admin-accent)] text-white"
                    : "bg-[var(--admin-inset)] admin-muted hover:text-[var(--admin-text)]"
                }`}
              >
                {value ? statusMeta[value]?.label || value : "All"}
              </Link>
            );
          })}
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] p-8 text-center admin-muted">
            <Package className="mx-auto mb-3 h-8 w-8 opacity-60" />
            <p className="font-semibold admin-text">No orders found</p>
            <p className="mt-1 text-sm">Try another status filter or create a counter sale above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] text-xs uppercase tracking-[0.08em] admin-soft">
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const meta = statusMeta[order.status] || { label: order.status, className: "bg-slate-500/10 admin-muted" };
                  return (
                    <tr key={order.id} className="border-b border-[var(--admin-border)] last:border-0">
                      <td className="px-3 py-3 font-semibold admin-text">{order.orderNumber}</td>
                      <td className="px-3 py-3 admin-muted">{order.customer?.fullName || "Walk-in"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs admin-muted">
                          {order.paymentStatus === "paid" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold admin-text">{money(order.total)}</td>
                      <td className="px-3 py-3 text-xs admin-muted">{formatDateTime(order.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text">
                          Open <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <OrderSettleActions orderId={order.id} status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination currentPage={page} totalItems={total} pageSize={PAGE_SIZE} />
      </AdminPanel>
    </AdminShell>
  );
}
