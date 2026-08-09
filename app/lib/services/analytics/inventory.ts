import "server-only";

import { prisma } from "@/app/lib/db";
import { reservedQuantityFor } from "@/app/lib/services/commerce/reservations";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Inventory analytics (audit §55, §56).
 *
 * Wraps the existing `getInventoryHealth` (low stock, expiring lots, etc.)
 * with commerce-aware metrics: reserved vs available stock, turnover,
 * dead stock, shrinkage, expiry exposure value.
 */

export type InventoryMetrics = {
  totalActive: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  expired: number;
  reorder: number;
  reservedUnits: number;
  reservedValue: number;
  inventoryValue: number;
  cogsLast30d: number;
  expiringValue: number;
};

export async function computeInventoryMetrics(_range: DateRange): Promise<InventoryMetrics> {
  // Reuse the existing health scanner so we don't duplicate logic.
  const { getInventoryHealth } = await import("@/app/lib/services/stock");
  const health = await getInventoryHealth({ expiryDays: 60, salesLookbackDays: 30 });

  const inventoryRows = await prisma.pharmacyInventory.findMany({
    where: { active: true },
    select: { id: true, currentStock: true, purchasePrice: true, price: true },
  });

  let inventoryValue = 0;
  let reservedUnits = 0;
  let reservedValue = 0;
  let expiringValue = 0;

  for (const inv of inventoryRows) {
    const cost = Number(inv.purchasePrice ?? 0);
    const price = Number(inv.price ?? 0);
    inventoryValue += cost * inv.currentStock;
    const reserved = await reservedQuantityFor(inv.id);
    reservedUnits += reserved;
    reservedValue += price * reserved;
  }

  // Expiring soon value
  for (const lot of health.expiringLots) {
    const inv = await prisma.pharmacyInventory.findUnique({
      where: { id: lot.inventoryId },
      select: { purchasePrice: true },
    });
    expiringValue += Number(inv?.purchasePrice ?? 0) * lot.quantity;
  }

  // COGS last 30 days
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const cogsAgg = await prisma.orderItem.aggregate({
    where: {
      order: { paidAt: { gte: since30 }, status: { notIn: ["cancelled"] }, waived: false },
    },
    _sum: { grossProfit: true },
  });
  const revenueAgg = await prisma.orderItem.aggregate({
    where: {
      order: { paidAt: { gte: since30 }, status: { notIn: ["cancelled"] }, waived: false },
    },
    _sum: { netAmount: true },
  });
  const cogsLast30d = Number(revenueAgg._sum.netAmount ?? 0) - Number(cogsAgg._sum.grossProfit ?? 0);

  return {
    totalActive: health.counts.totalActive,
    lowStock: health.counts.lowStock,
    outOfStock: health.counts.outOfStock,
    expiringSoon: health.counts.expiringLots,
    expired: health.counts.expiredLots,
    reorder: health.counts.reorder,
    reservedUnits,
    reservedValue,
    inventoryValue,
    cogsLast30d,
    expiringValue,
  };
}
