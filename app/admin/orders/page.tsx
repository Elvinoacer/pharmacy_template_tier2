import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateOrderAction, adminWaiveOrderAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination, parsePageParam } from "@/app/components/Pagination";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { BarChart3, DollarSign, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import OrderForm from "@/app/components/admin/OrderForm";

export const metadata = { title: "Orders & Revenue" };

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
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
  let since = new Date();
  if (period === "today") since.setHours(0, 0, 0, 0);
  else if (period === "7d") since.setDate(now.getDate() - 7);
  else if (period === "30d") since.setDate(now.getDate() - 30);
  else if (period === "quarter") since.setMonth(now.getMonth() - 3);
  else if (period === "year") since.setFullYear(now.getFullYear() - 1);

  const [allPayments, allOrders, recentOrders, medications, customers] = await Promise.all([
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
      include: {
        customer: { select: { id: true, fullName: true } },
        items: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.medication.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true, stockQty: true, overTheCounter: true },
      orderBy: { name: "asc" },
    }),
    prisma.customerProfile.findMany({
      select: { id: true, fullName: true, user: { select: { email: true } }, phone: true },
      orderBy: { fullName: "asc" },
      take: 100,
    }),
  ]);

  const totalRevenue = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const orderCount = allOrders.length;
  const paidOrders = allOrders.filter((o) => o.status === "paid").length;
  const waivedOrders = allOrders.filter((o) => o.status === "waived").length;
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  // Daily revenue series for sparkline.
  const byDay: Record<string, number> = {};
  for (const p of allPayments) {
    const day = formatDate(p.createdAt);
    byDay[day] = (byDay[day] || 0) + Number(p.amount);
  }
  const dayKeys = Object.keys(byDay).sort();
  const maxDay = Math.max(...Object.values(byDay), 1);

  const total = await prisma.order.count({ where: status ? { status } : undefined });
  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged = page === 1
    ? recentOrders
    : await prisma.order.findMany({
        where: status ? { status } : undefined,
        include: {
          customer: { select: { id: true, fullName: true } },
          items: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });

  return (
    <AdminShell
      user={user}
      title="Orders & Revenue"
      subtitle="OTC counter sales, refill payments, and revenue analytics"
      actions={
        <form className="flex items-center gap-2">
          <select
            name="period"
            defaultValue={period}
            onChange={(e) => {
              window.location.href = `/admin/orders?period=${e.target.value}${status ? `&status=${status}` : ""}`;
            }}
            className="input-admin !w-auto"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="quarter">This quarter</option>
            <option value="year">Last year</option>
          </select>
        </form>
      }
    >
      {/* Revenue stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Total revenue ({period})</p>
            <DollarSign className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Orders</p>
            <ShoppingCart className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{orderCount}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Avg order value</p>
            <TrendingUp className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Waived</p>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{waivedOrders}</p>
        </div>
      </div>

      {/* Revenue sparkline */}
      {dayKeys.length > 1 && (
        <div className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide admin-muted">Daily revenue</p>
          <div className="flex h-20 items-end gap-1">
            {dayKeys.slice(-30).map((d) => {
              const v = byDay[d];
              const h = Math.max(2, Math.round((v / maxDay) * 80));
              return (
                <div
                  key={d}
                  className="flex-1 rounded-t bg-gradient-to-t from-[#0d6e5a] to-[#2dd4bf]"
                  style={{ height: `${h}px` }}
                  title={`${d}: KES ${v.toLocaleString()}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[10px] admin-soft">{dayKeys.length} days with sales</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Record OTC sale form */}
        <AdminPanel
          title="Record OTC sale"
          description="Sell a medication over the counter — customer is created on the fly if email is given"
        >
          <OrderForm
            action={adminCreateOrderAction}
            medications={medications.map((m) => ({
              id: m.id,
              name: m.name,
              price: Number(m.price),
              stockQty: m.stockQty,
              overTheCounter: m.overTheCounter,
            }))}
            customers={customers.map((c) => ({
              id: c.id,
              fullName: c.fullName,
              email: c.user.email,
              phone: c.phone ?? undefined,
            }))}
          />
        </AdminPanel>

        {/* Recent orders */}
        <AdminPanel title="Recent orders" description={`${total} total`}>
          {paged.length === 0 ? (
            <AdminEmptyState
              icon={BarChart3}
              title="No orders yet"
              description="Record your first sale using the form on the left."
            />
          ) : (
            <ul className="space-y-2">
              {paged.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold admin-text">
                          {o.customer?.fullName || "Walk-in customer"}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          o.status === "paid" ? "bg-emerald-500/15 text-emerald-700"
                          : o.status === "waived" ? "bg-amber-500/15 text-amber-700"
                          : o.status === "fulfilled" ? "bg-blue-500/15 text-blue-700"
                          : o.status === "cancelled" ? "bg-rose-500/15 text-rose-600"
                          : "bg-slate-500/15 text-slate-600"
                        }`}>
                          {o.status}
                        </span>
                        <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-[10px] admin-muted">
                          {o.source}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs admin-muted">
                        {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </p>
                      <p className="mt-1 text-[10px] admin-soft">
                        {formatDateTime(o.createdAt)}
                        {o.payments[0] && o.payments[0].providerRef && (
                          <> · Ref: {o.payments[0].providerRef}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold admin-text">KES {Number(o.total).toLocaleString()}</p>
                      {o.status === "pending" && (
                        <form action={adminWaiveOrderAction} className="mt-1">
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="scope" value="one_time" />
                          <button
                            type="submit"
                            className="text-[10px] font-semibold text-amber-700 hover:underline"
                            onClick={(e) => {
                              if (!confirm("Waive this payment?")) e.preventDefault();
                            }}
                          >
                            Waive
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/orders"
        queryParams={{ status, period }}
        variant="admin"
      />
    </AdminShell>
  );
}

