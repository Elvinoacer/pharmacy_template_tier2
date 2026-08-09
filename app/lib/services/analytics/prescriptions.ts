import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Prescription analytics (audit §28, §29).
 *
 * Per-prescription financial summary + fill history. Mirrors the audit's
 * requirement that "every prescription detail page should have a financial
 * timeline" — paid vs outstanding vs refunded per fill.
 */

export type PrescriptionSummary = {
  totalPrescriptions: number;
  active: number;
  fillsTotal: number;
  fillsDispatched: number;
  fillsCollected: number;
  fillsPending: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  totalRefunded: number;
  averageFillValue: number;
  cogsTotal: number;
  grossProfit: number;
};

export async function computePrescriptionSummary(range: DateRange): Promise<PrescriptionSummary> {
  const [fills, rxCount, activeRxCount] = await Promise.all([
    prisma.prescriptionFill.findMany({
      where: {
        OR: [
          { dispatchedAt: { gte: range.from, lte: range.to } },
          { dispatchedAt: null, createdAt: { gte: range.from, lte: range.to } },
        ],
      },
      select: {
        id: true,
        status: true,
        netAmount: true,
        costPriceSnapshot: true,
        quantity: true,
        orderId: true,
        dispatchedAt: true,
        collectedAt: true,
      },
    }),
    prisma.prescription.count(),
    prisma.prescription.count({ where: { status: "active" } }),
  ]);

  let totalBilled = 0;
  let totalCollected = 0;
  let totalRefunded = 0;
  let cogsTotal = 0;
  let fillsDispatched = 0;
  let fillsCollected = 0;
  let fillsPending = 0;

  // Collect order financials for each fill.
  const orderIds = fills.map((f) => f.orderId).filter(Boolean) as string[];
  const orders = orderIds.length
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, amountPaid: true, amountRefunded: true, amountDue: true },
      })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  for (const fill of fills) {
    const billed = Number(fill.netAmount || 0);
    totalBilled += billed;
    cogsTotal += Number(fill.costPriceSnapshot || 0) * fill.quantity;
    if (fill.status === "dispatched") fillsDispatched++;
    if (fill.status === "collected") fillsCollected++;
    if (fill.status === "pending" || fill.status === "preparing" || fill.status === "ready") fillsPending++;
    if (fill.orderId) {
      const o = orderMap.get(fill.orderId);
      if (o) {
        totalCollected += Number(o.amountPaid || 0);
        totalRefunded += Number(o.amountRefunded || 0);
      }
    }
  }

  const totalOutstanding = Math.max(0, totalBilled - totalCollected + totalRefunded);
  const grossProfit = totalBilled - cogsTotal;

  return {
    totalPrescriptions: rxCount,
    active: activeRxCount,
    fillsTotal: fills.length,
    fillsDispatched,
    fillsCollected,
    fillsPending,
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalRefunded,
    averageFillValue: fills.length > 0 ? totalBilled / fills.length : 0,
    cogsTotal,
    grossProfit,
  };
}

/** Per-prescription fill history with financials (audit §29). */
export type PrescriptionFillHistoryRow = {
  id: string;
  fillNumber: number;
  status: string;
  quantity: number;
  unitPriceSnapshot: number;
  discountAmount: number;
  netAmount: number;
  costPriceSnapshot: number;
  grossProfit: number;
  filledAt: Date | null;
  dispatchedAt: Date | null;
  collectedAt: Date | null;
  dispensedByName: string | null;
  orderId: string | null;
  paymentStatus: string | null;
  paymentProvider: string | null;
  providerRef: string | null;
  amountPaid: number;
  amountRefunded: number;
  amountDue: number;
  lotIds: string[];
};

export async function getPrescriptionFillHistory(prescriptionId: string): Promise<PrescriptionFillHistoryRow[]> {
  const fills = await prisma.prescriptionFill.findMany({
    where: { prescriptionId },
    orderBy: { fillNumber: "asc" },
    include: {
      dispensedBy: { select: { email: true } },
      order: {
        select: {
          id: true,
          amountPaid: true,
          amountRefunded: true,
          amountDue: true,
          paymentStage: true,
          status: true,
          payments: {
            where: { status: "completed" },
            select: { provider: true, providerRef: true },
            take: 1,
          },
        },
      },
    },
  });

  return fills.map((f) => {
    const net = Number(f.netAmount || 0);
    const cogs = Number(f.costPriceSnapshot || 0) * f.quantity;
    return {
      id: f.id,
      fillNumber: f.fillNumber,
      status: f.status,
      quantity: f.quantity,
      unitPriceSnapshot: Number(f.unitPriceSnapshot || 0),
      discountAmount: Number(f.discountAmount || 0),
      netAmount: net,
      costPriceSnapshot: Number(f.costPriceSnapshot || 0),
      grossProfit: net - cogs,
      filledAt: f.filledAt,
      dispatchedAt: f.dispatchedAt,
      collectedAt: f.collectedAt,
      dispensedByName: f.dispensedBy?.email ?? null,
      orderId: f.orderId ?? null,
      paymentStatus: f.order?.paymentStage ?? null,
      paymentProvider: f.order?.payments?.[0]?.provider ?? null,
      providerRef: f.order?.payments?.[0]?.providerRef ?? null,
      amountPaid: Number(f.order?.amountPaid ?? 0),
      amountRefunded: Number(f.order?.amountRefunded ?? 0),
      amountDue: Number(f.order?.amountDue ?? 0),
      lotIds: Array.isArray(f.lotIds) ? (f.lotIds as unknown as string[]) : [],
    };
  });
}
