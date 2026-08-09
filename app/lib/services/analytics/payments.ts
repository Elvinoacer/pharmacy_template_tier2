import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Payment analytics (audit §25, §33).
 *
 * Tracks success/failure rates per provider, M-Pesa STK behavior,
 * collected amount by provider, outstanding balances.
 */

export type PaymentMetrics = {
  totalAttempts: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  failureRate: number;
  collectedByProvider: Record<string, number>;
  refundsTotal: number;
  outstanding: number;
  averageAttemptsPerOrder: number;
};

export async function computePaymentMetrics(range: DateRange): Promise<PaymentMetrics> {
  const [payments, refundAgg, outstandingAgg, attemptAgg] = await Promise.all([
    prisma.payment.findMany({
      where: {
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      select: { provider: true, status: true, amount: true, attemptCount: true },
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
      where: { status: { notIn: ["cancelled"] }, amountDue: { gt: 0 } },
      _sum: { amountDue: true },
    }),
    prisma.payment.aggregate({
      _avg: { attemptCount: true },
      where: {
        OR: [
          { paidAt: { gte: range.from, lte: range.to } },
          { paidAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
    }),
  ]);

  const collectedByProvider: Record<string, number> = {};
  let totalAttempts = 0;
  let successful = 0;
  let failed = 0;
  let pending = 0;

  for (const p of payments) {
    totalAttempts++;
    const prov = p.provider;
    if (p.status === "completed") {
      successful++;
      collectedByProvider[prov] = (collectedByProvider[prov] || 0) + Number(p.amount || 0);
    } else if (p.status === "failed") {
      failed++;
    } else if (p.status === "pending") {
      pending++;
    } else if (p.status === "refunded") {
      // Counted as successful then later refunded.
      successful++;
    }
  }

  const refundsTotal = Number(refundAgg._sum.amount ?? 0);
  // Subtract refunds from collected total at the all-providers level.
  const collectedTotal = Object.values(collectedByProvider).reduce((s, v) => s + v, 0) - refundsTotal;

  return {
    totalAttempts,
    successful,
    failed,
    pending,
    successRate: totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0,
    failureRate: totalAttempts > 0 ? (failed / totalAttempts) * 100 : 0,
    collectedByProvider,
    refundsTotal,
    outstanding: Number(outstandingAgg._sum.amountDue ?? 0),
    averageAttemptsPerOrder: Number(attemptAgg._avg.attemptCount ?? 0),
    // Aggregate "collected" alias
    ...(collectedTotal >= 0 ? { collectedByProviderTotal: collectedTotal } : {}),
  } as PaymentMetrics;
}

/** Outstanding receivables with aging buckets (audit §48). */
export type OutstandingAging = {
  total: number;
  buckets: Array<{ label: string; from: number; to: number | null; count: number; amount: number }>;
  topCustomers: Array<{ customerId: string; customerName: string; amount: number; oldestDays: number }>;
};

export async function computeOutstandingAging(): Promise<OutstandingAging> {
  const now = new Date();
  const outstanding = await prisma.order.findMany({
    where: { status: { notIn: ["cancelled"] }, amountDue: { gt: 0 } },
    select: {
      id: true,
      customerId: true,
      amountDue: true,
      createdAt: true,
      customer: { select: { id: true, fullName: true } },
    },
    orderBy: { amountDue: "desc" },
    take: 200,
  });

  const buckets = [
    { label: "0–7 days", from: 0, to: 7 },
    { label: "8–30 days", from: 8, to: 30 },
    { label: "31–60 days", from: 31, to: 60 },
    { label: "61–90 days", from: 61, to: 90 },
    { label: "90+ days", from: 91, to: null },
  ].map((b) => ({ ...b, count: 0, amount: 0 }));

  let total = 0;
  const byCustomer = new Map<string, { customerId: string; customerName: string; amount: number; oldestDays: number }>();

  for (const o of outstanding) {
    const due = Number(o.amountDue || 0);
    if (due <= 0) continue;
    total += due;
    const ageDays = Math.floor((now.getTime() - o.createdAt.getTime()) / (24 * 3600 * 1000));
    const bucket = buckets.find((b) => (b.to == null ? ageDays >= b.from : ageDays >= b.from && ageDays <= b.to));
    if (bucket) {
      bucket.count++;
      bucket.amount += due;
    }
    if (o.customerId) {
      const existing = byCustomer.get(o.customerId);
      if (existing) {
        existing.amount += due;
        existing.oldestDays = Math.max(existing.oldestDays, ageDays);
      } else {
        byCustomer.set(o.customerId, {
          customerId: o.customerId,
          customerName: o.customer?.fullName ?? "—",
          amount: due,
          oldestDays: ageDays,
        });
      }
    }
  }

  return {
    total,
    buckets,
    topCustomers: Array.from(byCustomer.values()).sort((a, b) => b.amount - a.amount).slice(0, 15),
  };
}
