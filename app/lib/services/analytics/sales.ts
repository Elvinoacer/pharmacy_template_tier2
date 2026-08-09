import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Sales analytics (audit §25, §31, §50).
 *
 * Sales = orders + units + average order value, broken down by channel
 * (counter / portal / website / refill / staff) and transaction type
 * (OTC_PURCHASE / PRESCRIPTION_FILL / REFILL / RESERVATION / SERVICE).
 */

export type SalesMetrics = {
  totalOrders: number;
  unitsSold: number;
  grossSales: number;
  netSales: number;
  averageOrderValue: number;
  averageBasketSize: number;
  bySource: Record<string, { orders: number; units: number; revenue: number }>;
  byType: Record<string, { orders: number; units: number; revenue: number }>;
  cancelledOrders: number;
  cancelledValue: number;
};

export async function computeSalesMetrics(range: DateRange): Promise<SalesMetrics> {
  const [orders, cancelledAgg] = await Promise.all([
    prisma.order.findMany({
      where: {
        paidAt: { gte: range.from, lte: range.to },
        status: { notIn: ["cancelled"] },
        waived: false,
      },
      select: {
        id: true,
        source: true,
        type: true,
        netTotal: true,
        total: true,
        amountRefunded: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.aggregate({
      where: {
        cancelledAt: { gte: range.from, lte: range.to },
        status: "cancelled",
      },
      _count: { _all: true },
      _sum: { netTotal: true, total: true },
    }),
  ]);

  const bySource: SalesMetrics["bySource"] = {};
  const byType: SalesMetrics["byType"] = {};
  let totalOrders = 0;
  let unitsSold = 0;
  let grossSales = 0;
  let netSales = 0;

  for (const o of orders) {
    totalOrders++;
    const units = o.items.reduce((s, i) => s + (i.quantity || 0), 0);
    unitsSold += units;
    const net = Number(o.netTotal || o.total || 0);
    grossSales += net + Number(o.amountRefunded || 0);
    netSales += net;

    const src = o.source || "counter";
    if (!bySource[src]) bySource[src] = { orders: 0, units: 0, revenue: 0 };
    bySource[src].orders++;
    bySource[src].units += units;
    bySource[src].revenue += net;

    const t = (o.type || "OTHER").toString();
    if (!byType[t]) byType[t] = { orders: 0, units: 0, revenue: 0 };
    byType[t].orders++;
    byType[t].units += units;
    byType[t].revenue += net;
  }

  return {
    totalOrders,
    unitsSold,
    grossSales,
    netSales,
    averageOrderValue: totalOrders > 0 ? netSales / totalOrders : 0,
    averageBasketSize: totalOrders > 0 ? unitsSold / totalOrders : 0,
    bySource,
    byType,
    cancelledOrders: cancelledAgg._count._all ?? 0,
    cancelledValue: Number(cancelledAgg._sum.netTotal || cancelledAgg._sum.total || 0),
  };
}

/** Reservation funnel: views → reservations → payments → collections (audit §32). */
export type ReservationFunnel = {
  reservationsCreated: number;
  reservationsConverted: number;
  reservationsExpired: number;
  reservationsCancelled: number;
  conversionRate: number;
  expiredRate: number;
  cancelledRate: number;
};

export async function computeReservationFunnel(range: DateRange): Promise<ReservationFunnel> {
  const [created, converted, expired, cancelled] = await Promise.all([
    prisma.order.count({
      where: { type: "RESERVATION", createdAt: { gte: range.from, lte: range.to } },
    }),
    prisma.order.count({
      where: {
        type: "RESERVATION",
        fulfilledAt: { gte: range.from, lte: range.to },
      },
    }),
    prisma.order.count({
      where: {
        type: "RESERVATION",
        lifecycleStatus: "expired",
        expiredAt: { gte: range.from, lte: range.to },
      },
    }),
    prisma.order.count({
      where: {
        type: "RESERVATION",
        cancelledAt: { gte: range.from, lte: range.to },
      },
    }),
  ]);

  return {
    reservationsCreated: created,
    reservationsConverted: converted,
    reservationsExpired: expired,
    reservationsCancelled: cancelled,
    conversionRate: created > 0 ? (converted / created) * 100 : 0,
    expiredRate: created > 0 ? (expired / created) * 100 : 0,
    cancelledRate: created > 0 ? (cancelled / created) * 100 : 0,
  };
}
