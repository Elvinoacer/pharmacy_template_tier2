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
import { ManualRefundList, RefundOrderForm } from "@/app/components/admin/RefundOrderForm";
import { roleHasPermission } from "@/app/lib/platform/permissions";

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
  payments: { id: string; amount: number; provider: string; providerRef: string | null; status: string; createdAt: Date }[];
  refunds: { id: string; paymentId: string; amount: number; provider: string; status: string; providerRef: string | null }[];
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
  const billingMember = user.memberships.find((membership) => membership.pharmacyId === user.activePharmacyId && membership.status === "active");
  const canRefund = Boolean(billingMember && roleHasPermission(billingMember.role, "orders.refund"));
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
          payments: { orderBy: { createdAt: "desc" } },
          refunds: { orderBy: { createdAt: "desc" } },
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
      payments: o.payments.map((p) => ({ id: p.id, amount: Number(p.amount), provider: p.provider, providerRef: p.providerRef, status: p.status, createdAt: p.createdAt })),
      refunds: o.refunds.map((r) => ({ id: r.id, paymentId: r.paymentId, amount: Number(r.amount), provider: r.provider, status: r.status, providerRef: r.providerRef })),
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
          payments: { orderBy: { createdAt: "desc" } },
          refunds: { orderBy: { createdAt: "desc" } },
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
        payments: o.payments.map((p) => ({ id: p.id, amount: Number(p.amount), provider: p.provider, providerRef: p.providerRef, status: p.status, createdAt: p.createdAt })),
        refunds: o.refunds.map((r) => ({ id: r.id, paymentId: r.paymentId, amount: Number(r.amount), provider: r.provider, status: r.status, providerRef: r.providerRef })),
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
        <div className="w-full sm:w-auto [&_select]:w-full [&_select]:text-base sm:[&_select]:w-auto sm:[&_select]:text-sm">
          <PeriodSelect period={period} status={status} />
        </div>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Total revenue ({period})</p>
            <DollarSign className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Orders</p>
            <ShoppingCart className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{orderCount}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Avg order value</p>
            <TrendingUp className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">KES {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Waived</p>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{waivedOrders}</p>
        </div>
      </div>

      {dayKeys.length > 1 && (
        <div className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide admin-muted">Daily revenue</p>
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
          <p className="mt-2 text-sm admin-soft">{dayKeys.length} days with sales</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          id="record-sale"
          title="Record a counter sale"
          description="Accept cash or M-Pesa. Turn off automatic dispatch if the customer will collect later."
        >
          <div className="[&_button]:min-h-11 [&_button]:text-sm [&_label]:text-sm [&_legend]:text-sm [&_p]:text-sm [&_select]:text-base [&_span]:text-sm [&_textarea]:text-base [&_input:not([type='checkbox']):not([type='radio']):not([type='hidden'])]:text-base sm:[&_select]:text-sm sm:[&_textarea]:text-sm sm:[&_input:not([type='checkbox']):not([type='radio']):not([type='hidden'])]:text-sm">
            <OrderForm
              action={adminCreateOrderAction}
              medications={medications}
              customers={customers}
            />
          </div>
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 w-full flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold admin-text">{displayName}</p>
                          <span className={`rounded-full px-2 py-0.5 text-sm font-semibold capitalize ${
                            o.status === "paid" ? "bg-emerald-500/15 text-emerald-700"
                            : o.status === "waived" ? "bg-amber-500/15 text-amber-700"
                            : o.status === "fulfilled" ? "bg-blue-500/15 text-blue-700"
                            : o.status === "cancelled" ? "bg-rose-500/15 text-rose-600"
                            : "bg-slate-500/15 text-slate-600"
                          }`}>
                            {o.status}
                          </span>
                          {isDispatched ? (
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-sm font-semibold text-blue-700">
                              dispatched
                            </span>
                          ) : o.status === "paid" ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-sm font-semibold text-amber-700">
                              await dispatch
                            </span>
                          ) : null}
                          <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-sm admin-muted">
                            {o.source}
                          </span>
                          {o.fulfillment && o.fulfillment !== "reserve" && (
                            <span className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-sm admin-muted">
                              {o.fulfillment}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-words text-sm admin-muted">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                        {o.reason && (
                          <p className="mt-0.5 text-sm text-amber-800/90">
                            Reason: {o.reason}
                          </p>
                        )}
                        {o.dispenserNote && (
                          <p className="mt-0.5 text-sm text-emerald-800/90">
                            Dispenser: {o.dispenserNote}
                          </p>
                        )}
                        <p className="mt-1 text-sm admin-soft">
                          {formatDateTime(o.createdAt)}
                          {o.guestPhone && <> · {o.guestPhone}</>}
                          {o.payments[0] && o.payments[0].providerRef && (
                            <> · Ref: {o.payments[0].providerRef}</>
                          )}
                        </p>
                        {o.refunds.some((refund) => refund.status === "pending" || refund.status === "approved") ? (
                          <p role="status" className="mt-2 text-sm font-semibold text-amber-700">Refund awaiting confirmed payout</p>
                        ) : null}
                        {canRefund && (o.payments.some((payment) => payment.status === "completed") || o.refunds.some((refund) => refund.status === "pending" || refund.status === "approved")) ? (
                          <details className="mt-3 rounded-xl border border-[var(--admin-border)] p-3">
                            <summary className="cursor-pointer text-sm font-semibold admin-text">Manage refunds</summary>
                            <div className="mt-3 space-y-4">
                              <ManualRefundList orderId={o.id} refunds={o.refunds} />
                              <RefundOrderForm orderId={o.id} payments={o.payments} refunds={o.refunds} />
                            </div>
                          </details>
                        ) : null}
                      </div>
                      <div className="w-full text-left lg:w-auto lg:min-w-[12rem] lg:text-right">
                        <p className="font-bold admin-text">KES {o.total.toLocaleString()}</p>
                        <div className="mt-3 w-full text-left [&_button]:min-h-11 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:min-h-11 [&_textarea]:text-base lg:mt-1 lg:text-right sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm">
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className="[&_a]:min-h-11 [&_a]:min-w-11 [&_a]:text-sm [&_span]:min-h-11 [&_span]:min-w-11 [&_span]:text-sm">
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/orders"
          queryParams={{ status, period }}
          variant="admin"
        />
      </div>
    </AdminShell>
  );
}
