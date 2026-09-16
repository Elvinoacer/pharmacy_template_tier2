import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { applyStockChange } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";
import { recomputeOrderFinancials } from "@/app/lib/services/commerce/pricing";

/**
 * Prescription fill creation (audit §4, §5, §41.A, §68).
 *
 * This is the single entry point for converting a clinical prescription into
 * a commercial fill. One fill = one PrescriptionFill row + one Order +
 * one OrderItem + one stock deduction + one CommerceEvent.
 *
 * Caller wraps the whole thing in a transaction.
 */

export type CreateFillInput = {
  prescriptionId: string;
  refillRequestId?: string | null;
  actorId: string;
  /// Override price (e.g. prescription.unitPrice). Falls back to medication catalogue price.
  manualUnitPrice?: number | null;
  /// Discount amount (e.g. from coupon).
  discountAmount?: number;
  /// If true, the customer has already taken the meds (counter dispatch); mark fill dispatched + order fulfilled.
  markDispatched?: boolean;
  /// If true, the customer has paid cash at counter; create a completed Payment too.
  markPaid?: boolean;
  /// Payment method when markPaid.
  paymentMethod?: "cash" | "daraja" | "card" | "other";
  notes?: string | null;
};

export type CreateFillResult = {
  fillId: string;
  orderId: string;
  orderItemId: string;
  paymentId?: string | null;
};

export async function createPrescriptionFill(
  tx: TxClient,
  input: CreateFillInput,
): Promise<CreateFillResult> {
  const rx = await tx.prescription.findUnique({
    where: { id: input.prescriptionId },
    include: {
      medication: {
        include: { medicationMaster: { select: { name: true } } },
      },
      fills: { select: { fillNumber: true }, orderBy: { fillNumber: "desc" }, take: 1 },
    },
  });
  if (!rx) throw new Error("Prescription not found.");

  const nextFillNumber = (rx.fills[0]?.fillNumber ?? 0) + 1;
  const qty = rx.quantity ?? 1;
  const med = rx.medication;
  const medName = med?.medicationMaster?.name ?? rx.medicineName;

  // Pricing snapshots
  const unitPrice =
    input.manualUnitPrice != null
      ? Number(input.manualUnitPrice)
      : rx.unitPrice != null
        ? Number(rx.unitPrice)
        : Number(med?.price ?? 0);
  const unitCost = Number(med?.purchasePrice ?? 0);
  const discount = Number(input.discountAmount ?? 0);
  const grossAmount = unitPrice * qty;
  const netAmount = Math.max(0, grossAmount - discount);
  const grossProfit = netAmount - unitCost * qty;
  const currency = "KES";
  // Prescription is the schema-backed source of truth for the dispensing unit.
  const billingUnit: Prisma.OrderItemUncheckedCreateInput["billingUnit"] =
    rx.billingUnit ?? "UNIT";

  // 1) Create the Order (commercial transaction for this fill).
  const order = await tx.order.create({
    data: {
      customerId: rx.customerId,
      source: "refill",
      refillId: input.refillRequestId ?? null,
      type: input.refillRequestId ? "REFILL" : "PRESCRIPTION_FILL",
      lifecycleStatus: "active",
      paymentStage: input.markPaid ? "paid" : "unpaid",
      fulfillmentStage: input.markDispatched ? "fulfilled" : "reserved",
      currency,
      subtotal: grossAmount,
      discountTotal: discount,
      taxTotal: 0,
      netTotal: netAmount,
      amountPaid: input.markPaid ? netAmount : 0,
      amountRefunded: 0,
      amountDue: input.markPaid ? 0 : netAmount,
      total: netAmount,
      // Back-compat legacy status string.
      status: input.markDispatched && input.markPaid ? "fulfilled" : input.markPaid ? "paid" : "pending",
      fulfillment: "immediate",
      dispatchedAt: input.markDispatched ? new Date() : null,
      dispatchedById: input.markDispatched ? input.actorId : null,
      servedById: input.actorId,
      paidAt: input.markPaid ? new Date() : null,
      fulfilledAt: input.markDispatched && input.markPaid ? new Date() : null,
      reservedAt: new Date(),
      notes: input.notes ?? null,
    },
  });

  // 2) Create the OrderItem with full price + cost snapshots (audit §17).
  const orderItem = await tx.orderItem.create({
    data: {
      orderId: order.id,
      medicationId: med?.id ?? null,
      name: medName,
      quantity: qty,
      billingUnit,
      unitPrice,
      discountApplied: discount,
      unitCostSnapshot: unitCost,
      grossAmount,
      netAmount,
      grossProfit,
      taxAmount: 0,
      currency,
      pricingRule: input.manualUnitPrice != null ? "manual_override" : "prescription",
      prescriptionFillId: null, // updated below after the fill row is created
      refillRequestId: input.refillRequestId ?? null,
    },
  });

  // 3) Create the PrescriptionFill row (audit §41.A).
  const fill = await tx.prescriptionFill.create({
    data: {
      prescriptionId: rx.id,
      orderId: order.id,
      refillRequestId: input.refillRequestId ?? null,
      fillNumber: nextFillNumber,
      quantity: qty,
      billingUnit,
      unitPriceSnapshot: unitPrice,
      discountAmount: discount,
      netAmount,
      costPriceSnapshot: unitCost,
      status: input.markDispatched ? "dispatched" : "pending",
      filledAt: new Date(),
      dispatchedAt: input.markDispatched ? new Date() : null,
      dispensedById: input.markDispatched ? input.actorId : null,
      medicationId: med?.id ?? null,
      medicationName: medName,
      lotIds: [],
      notes: input.notes ?? null,
    },
  });

  // Back-link the OrderItem to the fill.
  await tx.orderItem.update({
    where: { id: orderItem.id },
    data: { prescriptionFillId: fill.id },
  });

  // 4) Deduct stock (FEFO) — prescription_fill reason (audit §19).
  if (med) {
    // Idempotency: skip if this specific fill already deducted stock.
    // Note: We check by fill ID, NOT prescription ID, to allow multiple fills
    // for the same prescription (Fill #1, Fill #2, etc.) to each deduct stock.
    const priorMovement = await tx.stockMovement.findFirst({
      where: {
        pharmacyInventoryId: med.id,
        relatedType: "prescription_fill",
        relatedId: fill.id,
        reason: { in: ["dispatch", "refill", "prescription_fill"] },
        quantityDelta: { lt: 0 },
      },
      select: { id: true },
    });
    if (!priorMovement) {
      const result = await applyStockChange(tx, {
        inventoryId: med.id,
        quantityDelta: -qty,
        reason: "prescription_fill",
        notes: `Prescription fill #${nextFillNumber} (${medName})`,
        relatedType: "prescription_fill",
        relatedId: fill.id,
        actorId: input.actorId,
      });
      // Capture lot ids consumed (audit §18) on the fill row.
      if (result.lotIds.length > 0) {
        await tx.prescriptionFill.update({
          where: { id: fill.id },
          data: { lotIds: result.lotIds as unknown as Prisma.InputJsonValue },
        });
        // Also write InventoryAllocation rows per lot for full traceability.
        // Each allocation records the exact quantity from that specific lot.
        for (const lotDetail of result.lotDetails ?? []) {
          await tx.inventoryAllocation.create({
            data: {
              orderItemId: orderItem.id,
              inventoryLotId: lotDetail.lotId,
              quantity: lotDetail.quantity,
              unitCost: lotDetail.unitCost ?? unitCost,
            },
          });
        }
      }
    }
  }

  // 5) If markPaid: create a completed Payment.
  let paymentId: string | null = null;
  if (input.markPaid && netAmount > 0) {
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        customerId: rx.customerId,
        amount: netAmount,
        provider: input.paymentMethod ?? "cash",
        status: "completed",
        providerRef:
          input.paymentMethod === "cash"
            ? `CASH-${order.id.slice(0, 8).toUpperCase()}`
            : input.paymentMethod === "card"
              ? `CARD-${order.id.slice(0, 8).toUpperCase()}`
              : null,
        initiatedById: input.actorId,
        paidAt: new Date(),
      },
    });
    paymentId = payment.id;
  }

  // 6) Decrement refillsRemaining (audit §5).
  const shouldDecrementRefills = (rx.refillsRemaining ?? 0) > 0;
  if (shouldDecrementRefills) {
    await tx.prescription.update({
      where: { id: rx.id },
      data: {
        refillsRemaining: { decrement: 1 },
        lastFilledAt: new Date(),
        // Mirror dispatchedAt for back-compat with existing UI that reads prescription.dispatchedAt.
        dispatchedAt: input.markDispatched ? new Date() : rx.dispatchedAt,
        dispatchedById: input.markDispatched ? input.actorId : rx.dispatchedById,
      },
    });
  } else {
    await tx.prescription.update({
      where: { id: rx.id },
      data: {
        lastFilledAt: new Date(),
        dispatchedAt: input.markDispatched ? new Date() : rx.dispatchedAt,
        dispatchedById: input.markDispatched ? input.actorId : rx.dispatchedById,
      },
    });
  }

  // 7) CommerceEvent ledger entries (audit §38).
  await recordCommerceEvent(tx, {
    eventType: "prescription_filled",
    entityType: "prescription",
    entityId: rx.id,
    orderId: order.id,
    customerId: rx.customerId,
    actorId: input.actorId,
    amount: netAmount,
    metadata: { fillId: fill.id, fillNumber: nextFillNumber, medicationId: med?.id ?? null, quantity: qty },
  });
  if (input.markPaid) {
    await recordCommerceEvent(tx, {
      eventType: "payment_completed",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      customerId: rx.customerId,
      actorId: input.actorId,
      amount: netAmount,
      metadata: { paymentId, provider: input.paymentMethod ?? "cash" },
    });
  }
  if (input.markDispatched) {
    await recordCommerceEvent(tx, {
      eventType: "order_fulfilled",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      customerId: rx.customerId,
      actorId: input.actorId,
      metadata: { fillId: fill.id },
    });
  }

  // 8) Recompute order financials.
  await recomputeOrderFinancials(tx, order.id);

  return { fillId: fill.id, orderId: order.id, orderItemId: orderItem.id, paymentId };
}
