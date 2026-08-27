import "server-only";

import { prisma } from "@/app/lib/db";
import type { DateRange } from "@/app/lib/services/analytics/revenue";

/**
 * Customer analytics (audit §59, §60).
 *
 * Lifetime value, repeat-purchase rate, average customer value, and
 * per-customer commerce history (orders, fills, refills, outstanding).
 */

export type CustomerCommerceRow = {
  customerId: string;
  fullName: string;
  email: string;
  totalOrders: number;
  lifetimeSpend: number;
  outstandingBalance: number;
  refundedTotal: number;
  prescriptionFills: number;
  refills: number;
  reservations: number;
  averageOrderValue: number;
  lastPurchaseAt: Date | null;
  lastRefillAt: Date | null;
};

export async function computeCustomerAnalytics(range: DateRange, opts?: { limit?: number }): Promise<{
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageLifetimeValue: number;
  topCustomers: CustomerCommerceRow[];
}> {
  const totalCustomers = await prisma.customerProfile.count();
  const newCustomers = await prisma.customerProfile.count({
    where: { createdAt: { gte: range.from, lte: range.to } },
  });

  // Top customers by spend in the range.
  const customers = await prisma.customerProfile.findMany({
    where: {
      orders: {
        some: {
          paidAt: { gte: range.from, lte: range.to },
          status: { notIn: ["cancelled"] },
          waived: false,
        },
      },
    },
    include: {
      user: { select: { email: true } },
      orders: {
        where: { status: { notIn: ["cancelled"] } },
        select: {
          id: true,
          netTotal: true,
          total: true,
          amountPaid: true,
          amountRefunded: true,
          amountDue: true,
          type: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { paidAt: "desc" },
      },
      prescriptions: {
        select: {
          id: true,
          fills: { select: { id: true, dispatchedAt: true, createdAt: true } },
        },
      },
      refillRequests: {
        select: { id: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const rows: CustomerCommerceRow[] = customers.map((c) => {
    let lifetimeSpend = 0;
    let outstandingBalance = 0;
    let refundedTotal = 0;
    let reservations = 0;
    let prescriptionFills = 0;
    let lastPurchaseAt: Date | null = null;

    for (const o of c.orders) {
      lifetimeSpend += Number(o.amountPaid || 0);
      outstandingBalance += Number(o.amountDue || 0);
      refundedTotal += Number(o.amountRefunded || 0);
      if (o.type === "RESERVATION") reservations++;
      if (o.paidAt && (!lastPurchaseAt || o.paidAt > lastPurchaseAt)) lastPurchaseAt = o.paidAt;
    }
    for (const p of c.prescriptions) {
      prescriptionFills += p.fills.length;
    }
    const refills = c.refillRequests.length;
    const lastRefillAt = c.refillRequests[0]?.createdAt ?? null;

    return {
      customerId: c.id,
      fullName: c.fullName,
      email: c.user?.email ?? "—",
      totalOrders: c.orders.length,
      lifetimeSpend,
      outstandingBalance,
      refundedTotal,
      prescriptionFills,
      refills,
      reservations,
      averageOrderValue: c.orders.length > 0 ? lifetimeSpend / c.orders.length : 0,
      lastPurchaseAt,
      lastRefillAt,
    };
  });

  rows.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);

  // Returning customers = customers with >1 order across all time.
  const returningCustomers = rows.filter((r) => r.totalOrders > 1).length;

  const averageLifetimeValue =
    rows.length > 0 ? rows.reduce((s, r) => s + r.lifetimeSpend, 0) / rows.length : 0;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    averageLifetimeValue,
    topCustomers: opts?.limit ? rows.slice(0, opts.limit) : rows,
  };
}
