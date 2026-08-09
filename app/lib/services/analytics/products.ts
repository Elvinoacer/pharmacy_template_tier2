import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Product profitability analytics (audit §54).
 *
 * For every medicine sold in the date range: units sold, revenue, COGS,
 * gross profit, margin %, discounts, refunds, reservation conversion.
 */

export type ProductRow = {
  inventoryId: string;
  name: string;
  unitsSold: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  refunds: number;
  ordersCount: number;
};

export async function computeProductProfitability(range: DateRange, opts?: { limit?: number }): Promise<ProductRow[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        paidAt: { gte: range.from, lte: range.to },
        status: { notIn: ["cancelled"] },
        waived: false,
      },
      medicationId: { not: null },
    },
    select: {
      medicationId: true,
      name: true,
      quantity: true,
      unitPrice: true,
      unitCostSnapshot: true,
      grossAmount: true,
      netAmount: true,
      discountApplied: true,
      grossProfit: true,
      order: {
        select: {
          id: true,
          amountRefunded: true,
          netTotal: true,
        },
      },
    },
  });

  const byProduct = new Map<string, ProductRow>();
  for (const item of items) {
    if (!item.medicationId) continue;
    const existing = byProduct.get(item.medicationId) ?? {
      inventoryId: item.medicationId,
      name: item.name,
      unitsSold: 0,
      grossSales: 0,
      discounts: 0,
      netSales: 0,
      cogs: 0,
      grossProfit: 0,
      marginPct: 0,
      refunds: 0,
      ordersCount: 0,
    };
    existing.unitsSold += item.quantity;
    existing.grossSales += Number(item.grossAmount || 0);
    existing.discounts += Number(item.discountApplied || 0);
    existing.netSales += Number(item.netAmount || 0);
    existing.cogs += Number(item.unitCostSnapshot || 0) * item.quantity;
    existing.grossProfit += Number(item.grossProfit || 0);
    existing.ordersCount++;
    // Approximate per-item refund proportional to net sales.
    const orderNet = Number(item.order.netTotal || 0);
    if (orderNet > 0) {
      const ratio = Number(item.netAmount || 0) / orderNet;
      existing.refunds += Number(item.order.amountRefunded || 0) * ratio;
    }
    byProduct.set(item.medicationId, existing);
  }

  const rows = Array.from(byProduct.values()).map((r) => ({
    ...r,
    marginPct: r.netSales > 0 ? (r.grossProfit / r.netSales) * 100 : 0,
  }));

  rows.sort((a, b) => b.netSales - a.netSales);
  return opts?.limit ? rows.slice(0, opts.limit) : rows;
}
