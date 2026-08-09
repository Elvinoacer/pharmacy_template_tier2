import "server-only";

import { prisma } from "@/app/lib/db";
import { getInventoryHealth } from "@/app/lib/services/stock";
import { reservedQuantityFor } from "@/app/lib/services/commerce/reservations";

/**
 * Revenue analytics (audit §25–§26, §52).
 *
 * Revenue definition (audit §26):
 *   grossSales  = sum of netAmount on fulfilled/paid OrderItems
 *                 (excluding cancelled / refunded / waived)
 *   netSales    = grossSales - refunds
 *   collected   = sum(completed Payment.amount) - sum(completed Refund.amount)
 *   outstanding = sum(Order.amountDue) for non-cancelled orders
 *   cogs        = sum(unitCostSnapshot × quantity) on sold items
 *   grossProfit = netSales - cogs
 *
 * All metrics use explicit timestamps (paidAt / fulfilledAt / occurredAt),
 * never `updatedAt` (audit §62).
 */

export type DateRange = { from: Date; to: Date };

export type RevenueMetrics = {
  grossSales: number;
  discounts: number;
  netSales: number;
  refunds: number;
  waivedAmount: number;
  collected: number;
  outstanding: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function defaultRange(range: "today" | "7d" | "30d" | "quarter" | "year" | { from: Date; to: Date }): DateRange {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (range === "7d") return { from: new Date(now.getTime() - 7 * MS_DAY), to: now };
  if (range === "30d") return { from: new Date(now.getTime() - 30 * MS_DAY), to: now };
  if (range === "quarter") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    return { from: start, to: now };
  }
  if (range === "year") {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    return { from: start, to: now };
  }
  return range;
}

/**
 * Compute revenue metrics for a date range.
 *
 * Date semantics (audit §61):
 *   - grossSales / netSales / cogs → by Order.paidAt (or createdAt fallback)
 *   - collected                    → by Payment.paidAt (or createdAt)
 *   - refunds                      → by Refund.processedAt (or createdAt)
 *   - outstanding                  → point-in-time (no date filter)
 *   - waivedAmount                 → by Order.paidAt (or updatedAt)
 */
export async function computeRevenueMetrics(range: DateRange): Promise<RevenueMetrics> {
  const [soldItems, refundAgg, paymentsCollected, waivedAgg, outstandingAgg] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: {
          paidAt: { gte: range.from, lte: range.to },
          status: { notIn: ["cancelled"] },
        },
      },
      select: {
        grossAmount: true,
        netAmount: true,
        discountApplied: true,
        unitCostSnapshot: true,
        quantity: true,
        order: { select: { status: true, waived: true } },
      },
    }),
    prisma.refund.aggregate({
      where: {
        status: "completed",
        OR: [
          { processedAt: { gte: range.from, lte: range.to } },
          { processedAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "completed",
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: {
        waived: true,
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      _sum: { netTotal: true, total: true },
    }),
    prisma.order.aggregate({
      where: { status: { notIn: ["cancelled"] }, amountDue: { gt: 0 } },
      _sum: { amountDue: true },
    }),
  ]);

  let grossSales = 0;
  let discounts = 0;
  let netSales = 0;
  let cogs = 0;

  for (const item of soldItems) {
    if (item.order.waived) continue; // waived orders are not revenue
    grossSales += Number(item.grossAmount || 0);
    discounts += Number(item.discountApplied || 0);
    netSales += Number(item.netAmount || 0);
    cogs += Number(item.unitCostSnapshot || 0) * item.quantity;
  }

  const refunds = Number(refundAgg._sum.amount ?? 0);
  const collected = Number(paymentsCollected._sum.amount ?? 0) - refunds;
  const outstanding = Number(outstandingAgg._sum.amountDue ?? 0);
  const waivedAmount = Number(waivedAgg._sum.netTotal || waivedAgg._sum.total || 0);
  const finalNetSales = Math.max(0, netSales - refunds);
  const grossProfit = finalNetSales - cogs;
  const grossMarginPct = finalNetSales > 0 ? (grossProfit / finalNetSales) * 100 : 0;

  return {
    grossSales,
    discounts,
    netSales: finalNetSales,
    refunds,
    waivedAmount,
    collected,
    outstanding,
    cogs,
    grossProfit,
    grossMarginPct,
  };
}

/** Revenue grouped by day (or other granularity) — for trend charts (audit §52). */
export async function revenueByDay(range: DateRange): Promise<
  Array<{ date: string; grossSales: number; netSales: number; collected: number; refunds: number; cogs: number; grossProfit: number }>
> {
  // Use Payment.paidAt (or createdAt fallback) as the canonical "revenue recognized" date.
  const rows = await prisma.$queryRaw<
    Array<{
      day: Date;
      gross_sales: bigint | number;
      net_sales: bigint | number;
      collected: bigint | number;
      refunds: bigint | number;
      cogs: bigint | number;
    }>
  >`
    WITH paid_orders AS (
      SELECT o.id, o.customer_id, COALESCE(o.paid_at, o.created_at) AS recognized_at
      FROM orders o
      WHERE o.status NOT IN ('cancelled')
        AND COALESCE(o.paid_at, o.created_at) BETWEEN ${range.from} AND ${range.to}
    ),
    sales_by_day AS (
      SELECT date_trunc('day', po.recognized_at) AS day,
             SUM(oi.gross_amount) AS gross_sales,
             SUM(oi.net_amount)   AS net_sales,
             SUM(oi.unit_cost_snapshot * oi.quantity) AS cogs
      FROM paid_orders po
      JOIN order_items oi ON oi.order_id = po.id
      JOIN orders o ON o.id = po.id
      WHERE o.waived = false
      GROUP BY 1
    ),
    collected_by_day AS (
      SELECT date_trunc('day', COALESCE(p.paid_at, p.created_at)) AS day,
             SUM(p.amount) AS collected
      FROM payments p
      WHERE p.status = 'completed'
        AND COALESCE(p.paid_at, p.created_at) BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1
    ),
    refunds_by_day AS (
      SELECT date_trunc('day', COALESCE(r.processed_at, r.created_at)) AS day,
             SUM(r.amount) AS refunds
      FROM refunds r
      WHERE r.status = 'completed'
        AND COALESCE(r.processed_at, r.created_at) BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1
    )
    SELECT
      COALESCE(s.day, c.day, rf.day) AS day,
      COALESCE(s.gross_sales, 0) AS gross_sales,
      COALESCE(s.net_sales, 0)   AS net_sales,
      COALESCE(c.collected, 0)   AS collected,
      COALESCE(rf.refunds, 0)    AS refunds,
      COALESCE(s.cogs, 0)        AS cogs
    FROM sales_by_day s
    FULL OUTER JOIN collected_by_day c ON c.day = s.day
    FULL OUTER JOIN refunds_by_day rf ON rf.day = COALESCE(s.day, c.day)
    ORDER BY day ASC
  `;

  return rows.map((r) => {
    const gross = Number(r.gross_sales || 0);
    const net = Number(r.net_sales || 0);
    const refunds = Number(r.refunds || 0);
    const cogs = Number(r.cogs || 0);
    return {
      date: r.day.toISOString().slice(0, 10),
      grossSales: gross,
      netSales: Math.max(0, net - refunds),
      collected: Number(r.collected || 0) - refunds,
      refunds,
      cogs,
      grossProfit: Math.max(0, net - refunds) - cogs,
    };
  });
}
