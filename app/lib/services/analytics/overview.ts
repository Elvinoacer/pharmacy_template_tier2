import "server-only";

import { computeRevenueMetrics, defaultRange, type DateRange } from "@/app/lib/services/analytics/revenue";
import { computeSalesMetrics, computeReservationFunnel } from "@/app/lib/services/analytics/sales";
import { computePaymentMetrics, computeOutstandingAging } from "@/app/lib/services/analytics/payments";
import { computePrescriptionSummary } from "@/app/lib/services/analytics/prescriptions";
import { computeRefillMetrics } from "@/app/lib/services/analytics/refills";
import { computeInventoryMetrics } from "@/app/lib/services/analytics/inventory";

/**
 * Overview aggregator (audit §25, §66).
 *
 * Single API call that returns all top-line numbers for the admin
 * analytics dashboard. Each sub-section is independently computable
 * (see the per-domain analytics routes) for charts that drill in.
 */

export type OverviewPeriod = "today" | "7d" | "30d" | "quarter" | "year";

export type OverviewResponse = {
  period: { from: string; to: string };
  financial: {
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
  sales: {
    orders: number;
    units: number;
    averageOrderValue: number;
    averageBasketSize: number;
    cancelledOrders: number;
    cancelledValue: number;
    bySource: Record<string, { orders: number; units: number; revenue: number }>;
    byType: Record<string, { orders: number; units: number; revenue: number }>;
  };
  fulfillment: {
    reservationsCreated: number;
    reservationsConverted: number;
    reservationsExpired: number;
    reservationsCancelled: number;
    conversionRate: number;
    expiredRate: number;
    cancelledRate: number;
  };
  payments: {
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
  prescriptions: {
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
  refills: {
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
  inventory: {
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
  outstandingAging: {
    total: number;
    buckets: Array<{ label: string; count: number; amount: number }>;
  };
};

export async function getAnalyticsOverview(period: OverviewPeriod | { from: Date; to: Date }): Promise<OverviewResponse> {
  const range: DateRange = defaultRange(period as "today" | "7d" | "30d" | "quarter" | "year" | { from: Date; to: Date });

  const [financial, sales, fulfillment, payments, prescriptions, refills, inventory, aging] = await Promise.all([
    computeRevenueMetrics(range),
    computeSalesMetrics(range),
    computeReservationFunnel(range),
    computePaymentMetrics(range),
    computePrescriptionSummary(range),
    computeRefillMetrics(range),
    computeInventoryMetrics(range),
    computeOutstandingAging(),
  ]);

  return {
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
    financial,
    sales: {
      orders: sales.totalOrders,
      units: sales.unitsSold,
      averageOrderValue: sales.averageOrderValue,
      averageBasketSize: sales.averageBasketSize,
      cancelledOrders: sales.cancelledOrders,
      cancelledValue: sales.cancelledValue,
      bySource: sales.bySource,
      byType: sales.byType,
    },
    fulfillment,
    payments,
    prescriptions,
    refills,
    inventory,
    outstandingAging: {
      total: aging.total,
      buckets: aging.buckets.map((b) => ({ label: b.label, count: b.count, amount: b.amount })),
    },
  };
}
