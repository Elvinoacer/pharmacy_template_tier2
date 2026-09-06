import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateOrderAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { BarChart3, DollarSign, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import OrderForm from "@/app/components/admin/OrderForm";
import PeriodSelect from "@/app/components/admin/PeriodSelect";
import { OrderSettleActions } from "@/app/components/admin/WaiveOrderForm";

export const metadata = { title: "Orders & Revenue" };

const PAGE_SIZE = 25;

type OrderRow = {
  id: string;
  status: string;
  source: string;
  total: number;
  createdAt: Date;
  guestName: string | null;
  guestPhone: string | null;
  fulfillment: string;
  dispatchedAt: Date | null;
  reason: string | null;
  dispenserNote: string | null;
  hasRxItem: boolean;
  customer: { id: string; fullName: string; phone?: string | null } | null;
  items: { quantity: number; name: string }[];
  payments: { providerRef: string | null; status: string }[];
};

type MedOption = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  overTheCounter: boolean;
  prescriptionRequired?: boolean;
};

type CustomerOption = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
};

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

  const now = new Date();
  let since = new Date();
  if (period === "today") since.setHours(0, 0, 0, 0);
  else if (period === "7d") since.setDate(now.getDate() - 7);
  else if (period === "30d") since.setDate(now.getDate() - 30);
  else if (period === "quarter") since.setMonth(now.getMonth() - 3);
  else if (period === "year") since.setFullYear(now.getFullYear() - 1);

  let allPayments: { amount: unknown; createdAt: Date }[] = [];
  let allOrders: { id: string; total: unknown; status: string; source: string; createdAt: Date }[] = [];
  let recentOrders: OrderRow[] = [];
  let medications: MedOption[] = [];
  let customers: CustomerOption[] = [];
  let total = 0;
  let loadError: string | null = null;

  try {
    const [payments, orders, recent, meds, custs, orderCount] = await Promise.all([
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
          customer: { select: { id: true, fullName: true, phone: true } },
          items: {
            include: {
              medication: {
                select: { prescriptionRequired: true, overTheCounter: true },
              },
            },
          },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
      prisma.pharmacyInventory.findMany({
        where: { active: true },
        include: {
          medicationMaster: { select: { name: true } },
        },
        orderBy: { medicationMaster: { name: "asc" } },
      }),
      prisma.customerProfile.findMany({
        select: { id: true, fullName: true, user: { select: { email: true } }, phone: true },
        orderBy: { fullName: "asc" },
        take: 100,
      }),
      prisma.order.count({ where: status ? { status } : undefined }),
    ]);

    allPayments = payments;
    allOrders = orders;
    total = orderCount;
    recentOrders = recent.map((o) => ({
      id: o.id,
      status: o.status,
      source: o.source,
      total: Number(o.total),
      createdAt: o.createdAt,
      guestName: o.guestName,
      guestPhone: o.guestPhone,
      fulfillment: o.fulfillment,
      dispatchedAt: o.dispatchedAt,
      reason: o.reason ?? null,
      dispenserNote: o.dispenserNote ?? null,
      hasRxItem: o.items.some(
        (i) =>
          i.medication?.prescriptionRequired === true &&
          i.medication?.overTheCounter !== true,
      ),
      customer: o.customer,
      items: o.items.map((i) => ({ quantity: i.quantity, name: i.name })),
      payments: o.payments.map((p) => ({ providerRef: p.providerRef, status: p.status })),
    }));
    medications = meds.map((m) => ({
      id: m.id,
      name: m.medicationMaster.name,
      price: Number(m.price),
      stockQty: m.currentStock,
      overTheCounter: m.overTheCounter,
      prescriptionRequired: m.prescriptionRequired,
    }));
    customers = custs.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.user.email,
      phone: c.phone ?? undefined,
    }));
  } catch (err) {
    console.error("[admin/orders] Failed to load:", err);
    loadError =
      "Could not load orders. If this is a fresh deploy, run `npm run db:migrate` against production.";
  }

  const totalRevenue = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const orderCount = allOrders.length;
  const paidOrders = allOrders.filter((o) => o.status === "paid").length;
  const waivedOrders = allOrders.filter((o) => o.status === "waived").length;
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  const byDay: Record<string, number> = {};
  for (const p of allPayments) {
    const day = formatDate(p.createdAt);
    byDay[day] = (byDay[day] || 0) + Number(p.amount);
  }
  const dayKeys = Object.keys(byDay).sort();
  const maxDay = Math.max(...Object.values(byDay), 1);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  let paged = recentOrders;
  if (!loadError && page > 1) {
    try {
      const extra = await prisma.order.findMany({
        where: status ? { status } : undefined,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          items: {
            include: {
              medication: {
                select: { prescriptionRequired: true, overTheCounter: true },
              },
            },
          },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });
      paged = extra.map((o) => ({
        id: o.id,
        status: o.status,
        source: o.source,
        total: Number(o.total),
        createdAt: o.createdAt,
        guestName: o.guestName,
        guestPhone: o.guestPhone,
        fulfillment: o.fulfillment,
        dispatchedAt: o.dispatchedAt,
        reason: o.reason ?? null,
        dispenserNote: o.dispenserNote ?? null,
        hasRxItem: o.items.some(
          (i) =>
            i.medication?.prescriptionRequired === true &&
            i.medication?.overTheCounter !== true,
        ),
        customer: o.customer,
        items: o.items.map((i) => ({ quantity: i.quantity, name: i.name })),
        payments: o.payments.map((p) => ({ providerRef: p.providerRef, status: p.status })),
      }));
    } catch (err) {
      console.error("[admin/orders] Failed to load page:", err);
      paged = [];
    }
  }

  return (
    <AdminShell
      user={user}
      title="Sales & orders"
      subtitle="Record counter sales, manage reservations, and follow payments and deliveries."
      actions={
        <div className="flex items-center gap-2">
          <PeriodSelect period={period} status={status} />
        </div>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total revenue ({period})</p>
            <DollarSign className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Orders</p>
            <ShoppingCart className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{orderCount}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Avg order value</p>
            <TrendingUp className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Waived</p>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{waivedOrders}</p>
        </div>
      </div>

      {dayKeys.length > 1 && (
        <div className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide admin-muted">Daily revenue</p>
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
          <p className="mt-2 text-xs admin-soft">{dayKeys.length} days with sales</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          id="record-sale"
          title="Record a counter sale"
          description="Accept cash or M-Pesa. Turn off automatic dispatch if the customer will collect later."
        >
          <OrderForm
            action={adminCreateOrderAction}
            medications={medications}
            customers={customers}
          />
        </AdminPanel>

        <AdminPanel title="Recent orders" description={`${total} total`}>
          {paged.length === 0 ? (
            <AdminEmptyState
              icon={BarChart3}
              title="No orders yet"
              description="Record your first sale using the form on the left."
            />
          ) : (
            <ul className="space-y-2">
              {paged.map((o) => {
                const displayName =
                  o.customer?.fullName || o.guestName || "Walk-in customer";
                const isDispatched = Boolean(o.dispatchedAt) || o.status === "fulfilled";
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold admin-text">{displayName}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                            o.status === "paid" ? "bg-emerald-500/15 text-emerald-700"
                            : o.status === "waived" ? "bg-amber-500/15 text-amber-700"
                            : o.status === "fulfilled" ? "bg-blue-500/15 text-blue-700"
                            : o.status === "cancelled" ? "bg-rose-500/15 text-rose-600"
                            : "bg-slate-500/15 text-slate-600"
                          }`}>
                            {o.status}
                          </span>
                          {isDispatched ? (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              dispatched
                            </span>
                          ) : o.status === "paid" ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              await dispatch
                            </span>
                          ) : null}
                          <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs admin-muted">
                            {o.source}
                          </span>
                          {o.fulfillment && o.fulfillment !== "reserve" && (
                            <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs admin-muted">
                              {o.fulfillment}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs admin-muted">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                        {o.reason && (
                          <p className="mt-0.5 text-xs text-amber-800/90">
                            Reason: {o.reason}
                          </p>
                        )}
                        {o.dispenserNote && (
                          <p className="mt-0.5 text-xs text-emerald-800/90">
                            Dispenser: {o.dispenserNote}
                          </p>
                        )}
                        <p className="mt-1 text-xs admin-soft">
                          {formatDateTime(o.createdAt)}
                          {o.guestPhone && <> · {o.guestPhone}</>}
                          {o.payments[0] && o.payments[0].providerRef && (
                            <> · Ref: {o.payments[0].providerRef}</>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold admin-text">KES {o.total.toLocaleString()}</p>
                        <OrderSettleActions
                          orderId={o.id}
                          status={o.status}
                          guestPhone={o.guestPhone}
                          defaultPhone={o.customer?.phone || o.guestPhone}
                          dispatched={isDispatched}
                          hasRxItem={o.hasRxItem}
                          existingDispenserNote={o.dispenserNote}
                          customerReason={o.reason}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
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
