import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";
import { recomputeOrderFinancials } from "@/app/lib/services/commerce/pricing";
import { releaseReservation, convertReservationToSale } from "@/app/lib/services/commerce/reservations";
import type {
  OrderType,
  OrderLifecycleStatus,
  PaymentStage,
  FulfillmentStage,
} from "@/app/generated/prisma/client";

/**
 * Authoritative order settlement service (audit §68).
 *
 * The single place where Order lifecycle / payment / fulfillment stage
 * transitions happen. Wraps every state mutation in:
 *   - an atomic DB transaction (caller passes the tx)
 *   - a CommerceEvent ledger write
 *   - a recompute of Order financials
 *   - the corresponding stock / reservation side-effect
 *
 * Rule (audit §67.4): Payment never touches stock. Only fulfillment does.
 */

export type OrderStageInput = {
  orderId: string;
  actorId?: string | null;
};

/**
 * Mark an order as paid (called when a Payment row transitions to "completed").
 * Side effects:
 *   - paymentStage → paid
 *   - paidAt set
 *   - lifecycle → completed if fulfillment is already fulfilled
 *   - if status was "pending" → flip to "paid" (legacy back-compat)
 *   - CommerceEvent.payment_completed
 *   - DOES NOT touch stock (stock was reserved at order creation; conversion
 *     happens at fulfillment, audit §67.4)
 */
export async function markOrderPaid(
  tx: TxClient,
  opts: OrderStageInput & { amount?: number; currency?: string },
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: opts.orderId },
    select: { id: true, pharmacyId: true, status: true, fulfillmentStage: true, paymentStage: true, customerId: true, paymentInitiatedAt: true, lifecycleStatus: true },
  });
  if (!order) return;
  if (order.paymentStage === "paid" || ["paid", "fulfilled", "waived"].includes(order.status)) return;

  await tx.order.update({
    where: { id: opts.orderId },
    data: {
      paymentStage: "paid",
      paidAt: new Date(),
      paymentInitiatedAt: order.paymentInitiatedAt ?? new Date(),
      // Legacy status mirror: pending → paid (unless already fulfilled/waived).
      status: order.status === "fulfilled" ? "fulfilled" : order.status === "waived" ? "waived" : "paid",
      lifecycleStatus: order.fulfillmentStage === "fulfilled" ? "completed" : (order.lifecycleStatus ?? "active"),
    },
  });

  await recordCommerceEvent(tx, {
    pharmacyId: order.pharmacyId,
    eventType: "payment_completed",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    customerId: order.customerId ?? null,
    actorId: opts.actorId ?? null,
    amount: opts.amount ?? null,
    currency: opts.currency ?? "KES",
    metadata: {},
  });

  await recomputeOrderFinancials(tx, opts.orderId);
}

/**
 * Mark an order as fulfilled (called when stock is handed to the customer /
 * rider leaves). Side effects:
 *   - fulfillmentStage → fulfilled
 *   - fulfilledAt set
 *   - dispatchedAt set (legacy back-compat)
 *   - lifecycle → completed if payment is paid/waived
 *   - convert any active reservations into sales (audit §67.7)
 *   - CommerceEvent.order_fulfilled
 */
export async function markOrderFulfilled(
  tx: TxClient,
  opts: OrderStageInput & { dispatchedById?: string | null },
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: opts.orderId },
    select: { id: true, status: true, paymentStage: true, customerId: true },
  });
  if (!order) return;

  const isPaidOrWaived = order.paymentStage === "paid" || order.paymentStage === "waived" || order.status === "waived" || order.status === "paid";
  const newLifecycle: OrderLifecycleStatus = isPaidOrWaived ? "completed" : (order.status === "cancelled" ? "cancelled" : "active");

  await tx.order.update({
    where: { id: opts.orderId },
    data: {
      fulfillmentStage: "fulfilled",
      fulfilledAt: new Date(),
      dispatchedAt: new Date(),
      dispatchedById: opts.dispatchedById ?? null,
      lifecycleStatus: newLifecycle,
      // Legacy status mirror.
      status: order.status === "waived" ? "waived" : "fulfilled",
    },
  });

  // Convert any active reservation into a sale (zero-delta audit movement).
  await convertReservationToSale(tx, { orderId: opts.orderId, actorId: opts.actorId ?? null, reason: "fulfilled" });

  await recordCommerceEvent(tx, {
    eventType: "order_fulfilled",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    customerId: order.customerId ?? null,
    actorId: opts.actorId ?? null,
    metadata: { dispatchedById: opts.dispatchedById ?? null },
  });

  await recomputeOrderFinancials(tx, opts.orderId);
}

/**
 * Mark an order as cancelled. Side effects:
 *   - lifecycle → cancelled
 *   - cancelledAt set
 *   - status → cancelled (legacy)
 *   - release any active reservations (audit §67.6)
 *   - if order was paid, the caller should also create a Refund separately
 *   - CommerceEvent.order_cancelled
 */
export async function markOrderCancelled(
  tx: TxClient,
  opts: OrderStageInput & { reason?: string; cancelPayment?: boolean },
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: opts.orderId },
    select: { id: true, status: true, paymentStage: true, customerId: true },
  });
  if (!order) return;

  await tx.order.update({
    where: { id: opts.orderId },
    data: {
      lifecycleStatus: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: opts.reason ?? null,
      status: "cancelled",
      fulfillmentStage: "cancelled",
    },
  });

  // Release any active stock reservation.
  await releaseReservation(tx, { orderId: opts.orderId, reason: "cancelled", actorId: opts.actorId ?? null });

  await recordCommerceEvent(tx, {
    eventType: "order_cancelled",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    customerId: order.customerId ?? null,
    actorId: opts.actorId ?? null,
    metadata: { reason: opts.reason ?? null },
  });

  await recomputeOrderFinancials(tx, opts.orderId);
}

/**
 * Mark an order as waived (admin discretion — customer doesn't have to pay).
 * Side effects:
 *   - paymentStage → waived
 *   - status → waived (legacy)
 *   - amountDue → 0
 *   - CommerceEvent.waiver_applied
 */
export async function markOrderWaived(
  tx: TxClient,
  opts: OrderStageInput & { reason?: string | null; scope?: string | null; until?: Date | null },
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: opts.orderId },
    select: { id: true, status: true, customerId: true, netTotal: true, total: true, lifecycleStatus: true },
  });
  if (!order) return;

  await tx.order.update({
    where: { id: opts.orderId },
    data: {
      waived: true,
      waivedReason: opts.reason ?? null,
      waivedScope: opts.scope ?? null,
      waivedUntil: opts.until ?? null,
      paymentStage: "waived",
      status: "waived",
      amountDue: 0,
      lifecycleStatus: order.status === "fulfilled" ? "completed" : (order.lifecycleStatus ?? "active"),
    },
  });

  await recordCommerceEvent(tx, {
    eventType: "waiver_applied",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    customerId: order.customerId ?? null,
    actorId: opts.actorId ?? null,
    amount: Number(order.netTotal || order.total || 0),
    metadata: { reason: opts.reason ?? null, scope: opts.scope ?? null },
  });

  await recomputeOrderFinancials(tx, opts.orderId);
}

/**
 * Initialize a fresh Order's stage fields from its creation context.
 * Called once at Order.create so the new columns are populated consistently.
 */
export function deriveInitialStages(opts: {
  type: OrderType;
  source: string;
  isCounterSale: boolean;
  markPaid: boolean;
  autoDispatch: boolean;
  fulfillment: "immediate" | "reserve" | "delivery";
}): {
  type: OrderType;
  lifecycleStatus: OrderLifecycleStatus;
  paymentStage: PaymentStage;
  fulfillmentStage: FulfillmentStage;
  reservedAt: Date;
  expiresAt: Date | null;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  dispatchedAt: Date | null;
  status: string; // legacy status string for back-compat
} {
  const now = new Date();
  const isReservation = opts.fulfillment === "reserve" || opts.fulfillment === "delivery";
  const lifecycleStatus: OrderLifecycleStatus = "active";
  const paymentStage: PaymentStage = opts.markPaid ? "paid" : "unpaid";
  const fulfillmentStage: FulfillmentStage = opts.markPaid && opts.autoDispatch
    ? "fulfilled"
    : isReservation
      ? "reserved"
      : "unfulfilled";

  let status = "pending";
  if (opts.markPaid && opts.autoDispatch) status = "fulfilled";
  else if (opts.markPaid) status = "paid";

  // Website/portal reservations expire after 48h; counter sales don't.
  const expiresAt =
    isReservation && !opts.markPaid
      ? new Date(now.getTime() + 48 * 3600 * 1000)
      : null;

  return {
    type: opts.type,
    lifecycleStatus,
    paymentStage,
    fulfillmentStage,
    reservedAt: now,
    expiresAt,
    paidAt: opts.markPaid ? now : null,
    fulfilledAt: opts.markPaid && opts.autoDispatch ? now : null,
    dispatchedAt: opts.markPaid && opts.autoDispatch ? now : null,
    status,
  };
}
