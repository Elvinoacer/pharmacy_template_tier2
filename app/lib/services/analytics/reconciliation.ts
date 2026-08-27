import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Reconciliation report (audit §34).
 *
 * For a date range, compares expected sales (sum of order.netTotal) against
 * actual collected amounts by provider (M-Pesa, cash, card) + waived + refunds.
 * Surfaces the difference so staff can investigate discrepancies.
 */

export type ReconciliationReport = {
  range: DateRange;
  expectedSales: number;     // sum(netTotal) of paid/fulfilled non-cancelled, non-waived orders
  mpesaCollected: number;
  cashCollected: number;
  cardCollected: number;
  otherCollected: number;
  totalCollected: number;
  waivedAmount: number;
  refundsTotal: number;
  difference: number;        // totalCollected + waived - refunds - expectedSales
};

export async function computeReconciliation(range: DateRange): Promise<ReconciliationReport> {
  const [orders, payments, refundsAgg, waivedAgg] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
        status: { notIn: ["cancelled"] },
      },
      select: { netTotal: true, total: true, waived: true },
    }),
    prisma.payment.findMany({
      where: {
        status: "completed",
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      select: { provider: true, amount: true },
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
  ]);

  let expectedSales = 0;
  for (const o of orders) {
    if (o.waived) continue;
    expectedSales += Number(o.netTotal || o.total || 0);
  }

  let mpesa = 0;
  let cash = 0;
  let card = 0;
  let other = 0;
  for (const p of payments) {
    const amt = Number(p.amount || 0);
    if (p.provider === "daraja") mpesa += amt;
    else if (p.provider === "cash") cash += amt;
    else if (p.provider === "card") card += amt;
    else other += amt;
  }

  const totalCollected = mpesa + cash + card + other;
  const refundsTotal = Number(refundsAgg._sum.amount ?? 0);
  const waivedAmount = Number(waivedAgg._sum.netTotal || waivedAgg._sum.total || 0);
  const difference = totalCollected + waivedAmount - refundsTotal - expectedSales;

  return {
    range,
    expectedSales,
    mpesaCollected: mpesa,
    cashCollected: cash,
    cardCollected: card,
    otherCollected: other,
    totalCollected,
    waivedAmount,
    refundsTotal,
    difference,
  };
}
