import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Refill analytics (audit §30).
 *
 * Tracks the refill funnel: submitted → approved → preparing → ready → collected.
 * Plus turnaround times and revenue per refill.
 */

export type RefillMetrics = {
  totalRequests: number;
  approved: number;
  preparing: number;
  ready: number;
  collected: number;
  cancelled: number;
  paid: number;
  unpaid: number;
  revenue: number;
  averageTurnaroundMinutes: number;
  conversionRate: number;
  bySource: Record<string, number>;
};

export async function computeRefillMetrics(range: DateRange): Promise<RefillMetrics> {
  const refills = await prisma.refillRequest.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    select: {
      id: true,
      status: true,
      source: true,
      createdAt: true,
      statusUpdatedAt: true,
      prescriptionId: true,
      prescriptionFill: {
        select: {
          orderId: true,
          order: {
            select: { amountPaid: true, amountDue: true, status: true, netTotal: true, total: true },
          },
        },
      },
    },
  });

  let approved = 0;
  let preparing = 0;
  let ready = 0;
  let collected = 0;
  let cancelled = 0;
  let paid = 0;
  let unpaid = 0;
  let revenue = 0;
  let totalTurnaroundMs = 0;
  let turnaroundCount = 0;
  const bySource: Record<string, number> = {};

  for (const r of refills) {
    const src = r.source || "website";
    bySource[src] = (bySource[src] || 0) + 1;
    if (r.status === "approved") approved++;
    if (r.status === "preparing") preparing++;
    if (r.status === "ready_for_pickup") ready++;
    if (r.status === "collected") {
      collected++;
      const ms = r.statusUpdatedAt.getTime() - r.createdAt.getTime();
      if (ms > 0) {
        totalTurnaroundMs += ms;
        turnaroundCount++;
      }
    }
    if (r.status === "cancelled") cancelled++;
    const fill = r.prescriptionFill;
    if (fill?.order) {
      const paidAmt = Number(fill.order.amountPaid || 0);
      const dueAmt = Number(fill.order.amountDue || 0);
      if (paidAmt > 0) {
        paid++;
        revenue += paidAmt;
      } else if (dueAmt > 0) {
        unpaid++;
      }
    }
  }

  return {
    totalRequests: refills.length,
    approved,
    preparing,
    ready,
    collected,
    cancelled,
    paid,
    unpaid,
    revenue,
    averageTurnaroundMinutes: turnaroundCount > 0 ? totalTurnaroundMs / turnaroundCount / 60000 : 0,
    conversionRate: refills.length > 0 ? (collected / refills.length) * 100 : 0,
    bySource,
  };
}
