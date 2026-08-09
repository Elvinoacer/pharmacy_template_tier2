import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Staff analytics (audit §36).
 *
 * Per-staff: sales, orders, dispatches, prescription fills, cash collected,
 * average fulfillment time, adjustments, write-offs, refunds approved.
 */

export type StaffRow = {
  userId: string;
  email: string;
  ordersCreated: number;
  salesValue: number;
  cashCollected: number;
  mpesaCollected: number;
  dispatches: number;
  prescriptionFills: number;
  refundsApproved: number;
  adjustments: number;
  writeOffs: number;
};

export async function computeStaffMetrics(range: DateRange): Promise<StaffRow[]> {
  // Orders created by staff (servedById).
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
      servedById: { not: null },
    },
    select: {
      servedById: true,
      netTotal: true,
      total: true,
      amountPaid: true,
      dispatchedAt: true,
      dispatchedById: true,
      payments: {
        where: { status: "completed" },
        select: { provider: true, amount: true },
      },
    },
  });

  const fills = await prisma.prescriptionFill.findMany({
    where: {
      dispensedById: { not: null },
      OR: [
        { dispatchedAt: { gte: range.from, lte: range.to } },
        { dispatchedAt: null, createdAt: { gte: range.from, lte: range.to } },
      ],
    },
    select: { dispensedById: true },
  });

  const refunds = await prisma.refund.findMany({
    where: {
      approvedById: { not: null },
      createdAt: { gte: range.from, lte: range.to },
    },
    select: { approvedById: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: {
      actorId: { not: null },
      createdAt: { gte: range.from, lte: range.to },
      reason: { in: ["adjust", "stocktake_adjustment", "write_off"] },
    },
    select: { actorId: true, reason: true },
  });

  const userMap = new Map<string, StaffRow>();

  function rowFor(userId: string): StaffRow {
    let r = userMap.get(userId);
    if (!r) {
      r = {
        userId,
        email: "—",
        ordersCreated: 0,
        salesValue: 0,
        cashCollected: 0,
        mpesaCollected: 0,
        dispatches: 0,
        prescriptionFills: 0,
        refundsApproved: 0,
        adjustments: 0,
        writeOffs: 0,
      };
      userMap.set(userId, r);
    }
    return r;
  }

  for (const o of orders) {
    if (!o.servedById) continue;
    const r = rowFor(o.servedById);
    r.ordersCreated++;
    r.salesValue += Number(o.netTotal || o.total || 0);
    for (const p of o.payments) {
      if (p.provider === "cash") r.cashCollected += Number(p.amount || 0);
      else if (p.provider === "daraja") r.mpesaCollected += Number(p.amount || 0);
    }
    if (o.dispatchedAt && o.dispatchedById === o.servedById) r.dispatches++;
  }

  for (const f of fills) {
    if (!f.dispensedById) continue;
    rowFor(f.dispensedById).prescriptionFills++;
  }
  for (const r of refunds) {
    if (!r.approvedById) continue;
    rowFor(r.approvedById).refundsApproved++;
  }
  for (const m of movements) {
    if (!m.actorId) continue;
    const r = rowFor(m.actorId);
    if (m.reason === "write_off") r.writeOffs++;
    else r.adjustments++;
  }

  // Look up emails
  const userIds = Array.from(userMap.keys());
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    for (const u of users) {
      const r = userMap.get(u.id);
      if (r) r.email = u.email;
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.salesValue - a.salesValue);
}
