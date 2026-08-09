import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Pricing + cost snapshot service (audit §6, §17, §45, §46).
 *
 * Two responsibilities:
 *  1. Compute a final line-item price from (catalogue price, quantity, coupon,
 *     manual override) — and snapshot every component on the OrderItem so
 *     historical revenue / margin never depends on today's price/cost.
 *  2. Maintain a MedicationPriceHistory row whenever a catalogue price changes
 *     so we can answer "what was this medicine selling for on date X?".
 *
 * The functions in here never write to OrderItem directly — they return
 * ready-to-spread `data` payloads so the caller can `tx.orderItem.create`
 * inside its own atomic transaction.
 */

export type PriceComponents = {
  unitPrice: number;            // price per unit charged to customer
  unitCost: number;             // acquisition cost per unit at sale time
  quantity: number;
  discountApplied: number;      // absolute discount applied to this line
  couponId: string | null;
  grossAmount: number;          // unitPrice * quantity
  netAmount: number;            // grossAmount - discountApplied
  taxAmount: number;            // (today: 0 — most OTC sales tax-inclusive)
  grossProfit: number;          // netAmount - (unitCost * quantity)
  currency: string;
  pricingRule: "catalogue" | "manual_override" | "promotion" | "prescription";
};

export type PricingInput = {
  inventoryId: string;
  quantity: number;
  couponCode?: string | null;
  customerId?: string | null;
  /// Optional override (e.g. admin counter sale discount, prescription unitPrice).
  manualUnitPrice?: number | null;
  /// Where the override came from.
  pricingRule?: PriceComponents["pricingRule"];
};

/**
 * Compute and validate a line-item price.
 * Reads current catalogue price + acquisition cost from PharmacyInventory.
 * Validates the coupon (existence, active, validity window, redemption caps,
 * per-customer cap) and returns the discount + couponId, or rejects.
 */
export async function computeLineItemPricing(
  input: PricingInput,
): Promise<
  | { ok: true; pricing: PriceComponents; medicationName: string }
  | { ok: false; error: string }
> {
  if (!input.inventoryId) return { ok: false, error: "Medication is required." };
  if (!Number.isFinite(input.quantity) || input.quantity < 1) {
    return { ok: false, error: "Quantity must be at least 1." };
  }

  const inv = await prisma.pharmacyInventory.findUnique({
    where: { id: input.inventoryId },
    select: {
      id: true,
      price: true,
      purchasePrice: true,
      active: true,
      medicationMaster: { select: { name: true } },
    },
  });
  if (!inv || !inv.active) return { ok: false, error: "Medication not found or inactive." };

  const cataloguePrice = Number(inv.price ?? 0);
  const unitCost = Number(inv.purchasePrice ?? 0);
  const medName = inv.medicationMaster.name;

  // Decide unit price
  let unitPrice = cataloguePrice;
  let pricingRule: PriceComponents["pricingRule"] = input.pricingRule ?? "catalogue";

  if (input.manualUnitPrice != null && Number.isFinite(input.manualUnitPrice) && input.manualUnitPrice >= 0) {
    unitPrice = Number(input.manualUnitPrice);
    pricingRule = input.pricingRule ?? "manual_override";
  }

  // Coupon validation
  let discountApplied = 0;
  let couponId: string | null = null;
  if (input.couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: input.couponCode.toUpperCase() },
    });
    if (!coupon) return { ok: false, error: `Coupon ${input.couponCode.toUpperCase()} does not exist.` };
    if (!coupon.active) return { ok: false, error: `Coupon ${coupon.code} is inactive.` };
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      return { ok: false, error: `Coupon ${coupon.code} is not valid yet.` };
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return { ok: false, error: `Coupon ${coupon.code} expired.` };
    }
    if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) {
      return { ok: false, error: `Coupon ${coupon.code} has reached its redemption limit.` };
    }
    if (input.customerId) {
      const perCustomerLimit = coupon.maxRedemptionsPerCustomer ?? 1;
      const customerRedemptions = await prisma.orderItem.count({
        where: { couponId: coupon.id, order: { customerId: input.customerId } },
      });
      if (customerRedemptions >= perCustomerLimit) {
        return {
          ok: false,
          error: `Customer has already redeemed ${coupon.code} ${customerRedemptions} time(s). Limit: ${perCustomerLimit}.`,
        };
      }
    }
    couponId = coupon.id;
    if (coupon.discountType === "percent") {
      discountApplied = unitPrice * input.quantity * (Number(coupon.discountValue) / 100);
    } else if (coupon.discountType === "fixed") {
      discountApplied = Number(coupon.discountValue) * input.quantity;
    }
  }

  const grossAmount = unitPrice * input.quantity;
  const netAmount = Math.max(0, grossAmount - discountApplied);
  const taxAmount = 0; // today most OTC sales are VAT-inclusive; reserved for future.
  const grossProfit = netAmount - unitCost * input.quantity;

  return {
    ok: true,
    medicationName: medName,
    pricing: {
      unitPrice,
      unitCost,
      quantity: input.quantity,
      discountApplied,
      couponId,
      grossAmount,
      netAmount,
      taxAmount,
      grossProfit,
      currency: "KES",
      pricingRule,
    },
  };
}

/**
 * Recompute Order-level financial totals (subtotal, discountTotal, netTotal,
 * amountPaid, amountRefunded, amountDue) from its OrderItems + Payments + Refunds.
 *
 * Use after any mutation that changes items, payments, or refunds.
 * Mirrors Order.total for back-compat with existing dashboards.
 */
export async function recomputeOrderFinancials(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const [items, payments, refunds] = await Promise.all([
    tx.orderItem.findMany({
      where: { orderId },
      select: {
        unitPrice: true,
        quantity: true,
        discountApplied: true,
        unitCostSnapshot: true,
        netAmount: true,
        grossAmount: true,
        grossProfit: true,
        taxAmount: true,
      },
    }),
    tx.payment.findMany({
      where: { orderId, status: "completed" },
      select: { amount: true },
    }),
    tx.refund.findMany({
      where: { orderId, status: "completed" },
      select: { amount: true },
    }),
  ]);

  const subtotal = items.reduce((s, i) => s + Number(i.grossAmount || Number(i.unitPrice) * i.quantity || 0), 0);
  const discountTotal = items.reduce((s, i) => s + Number(i.discountApplied || 0), 0);
  const taxTotal = items.reduce((s, i) => s + Number(i.taxAmount || 0), 0);
  const netTotal = Math.max(0, subtotal - discountTotal + taxTotal);
  const amountPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const amountRefunded = refunds.reduce((s, r) => s + Number(r.amount || 0), 0);
  const amountDue = Math.max(0, netTotal - amountPaid + amountRefunded);

  // Mirror to `total` for back-compat with legacy dashboards/reports.
  await tx.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountTotal,
      taxTotal,
      netTotal,
      amountPaid,
      amountRefunded,
      amountDue,
      total: netTotal,
    },
  });
}

/**
 * Insert a MedicationPriceHistory row when a catalogue price changes (audit §46).
 * Call from MedicationForm.save after PharmacyInventory.price or purchasePrice changes.
 */
export async function recordPriceChange(opts: {
  inventoryId: string;
  newPrice: number;
  newCostPrice?: number | null;
  reason?: "catalogue" | "manual_override" | "promotion" | "supplier_change" | "stocktake";
  changedById?: string | null;
}): Promise<void> {
  // Close out any prior open-ended history row for this inventory.
  await prisma.medicationPriceHistory.updateMany({
    where: { inventoryId: opts.inventoryId, effectiveTo: null },
    data: { effectiveTo: new Date() },
  });
  await prisma.medicationPriceHistory.create({
    data: {
      inventoryId: opts.inventoryId,
      price: opts.newPrice,
      costPrice: opts.newCostPrice ?? null,
      reason: opts.reason ?? "manual_override",
      changedById: opts.changedById ?? null,
    },
  });
}

/**
 * Find the price that was in effect for an inventory item on a given date.
 * Used by reconciliation / historical re-pricing tools.
 */
export async function priceAtDate(inventoryId: string, date: Date): Promise<{ price: number; costPrice: number | null } | null> {
  const row = await prisma.medicationPriceHistory.findFirst({
    where: {
      inventoryId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    orderBy: { effectiveFrom: "desc" },
    select: { price: true, costPrice: true },
  });
  if (row) return { price: Number(row.price), costPrice: row.costPrice == null ? null : Number(row.costPrice) };
  // Fall back to current price if no history exists yet.
  const inv = await prisma.pharmacyInventory.findUnique({
    where: { id: inventoryId },
    select: { price: true, purchasePrice: true },
  });
  if (!inv) return null;
  return { price: Number(inv.price), costPrice: inv.purchasePrice == null ? null : Number(inv.purchasePrice) };
}
