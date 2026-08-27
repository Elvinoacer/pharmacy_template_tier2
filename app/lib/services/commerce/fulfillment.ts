import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { applyStockChange } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";
import { markOrderFulfilled, markOrderCancelled } from "@/app/lib/services/commerce/orders";
import { releaseReservation } from "@/app/lib/services/commerce/reservations";

/**
 * Fulfillment service (audit §68).
 *
 * Handles the physical handoff of an order: dispatch / collection / delivery.
 * Distinct from payment settlement (handled in orders.ts).
 *
 * Stock rule (audit §67.4): only fulfillment changes physical stock.
 *   - Counter sale (immediate): stock deducted once at sale time (no reservation).
 *   - Reserve / website / portal: stock reserved at order creation; converted to
 *     a real sale (zero-delta audit movement) when the order is fulfilled.
 */

export type DispatchInput = {
  orderId: string;
  actorId: string;
  dispenserNote?: string | null;
};

/**
 * Dispatch an order: mark fulfilled, set dispatchedAt/ById, convert reservations.
 * For orders with `fulfillment = immediate` (counter), stock was already
 * deducted at sale — this is just the lifecycle stamp.
 *
 * For reservations (website / portal / refill), the units were held via
 * InventoryReservation. We convert them to a real sale (zero-delta audit
 * movement) — the physical stock was already decremented at reservation_create.
 */
export async function dispatchOrder(opts: DispatchInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      items: { select: { id: true, medicationId: true, name: true, quantity: true } },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled") return { ok: false, error: "Cannot dispatch a cancelled order." };
  if (order.status === "fulfilled") return { ok: true }; // idempotent

  await prisma.$transaction(async (tx) => {
    // Optional dispenser note update.
    if (opts.dispenserNote) {
      await tx.order.update({
        where: { id: opts.orderId },
        data: {
          dispenserNote: opts.dispenserNote,
          dispenserNoteAt: new Date(),
          dispenserNoteById: opts.actorId,
        },
      });
    }
    await markOrderFulfilled(tx, {
      orderId: opts.orderId,
      actorId: opts.actorId,
      dispatchedById: opts.actorId,
    });
  });

  return { ok: true };
}

export type CancelInput = {
  orderId: string;
  actorId: string;
  reason?: string;
  /// If true, automatically create a Refund for any completed payments.
  autoRefund?: boolean;
  refundReason?: string;
};

/**
 * Cancel an order: release reservations, mark cancelled, optionally auto-refund.
 * Idempotent: no-op if already cancelled.
 */
export async function cancelOrder(opts: CancelInput): Promise<{ ok: true; refundId?: string } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { payments: { where: { status: "completed" } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled") return { ok: true };

  let refundId: string | undefined;

  await prisma.$transaction(async (tx) => {
    await markOrderCancelled(tx, {
      orderId: opts.orderId,
      actorId: opts.actorId,
      reason: opts.reason,
    });

    if (opts.autoRefund && order.payments.length > 0) {
      // Import lazily to avoid circular dependency at module-load.
      const { createRefund } = await import("@/app/lib/services/commerce/refunds");
      // Refund the first completed payment in full (covers single-payment case).
      const first = order.payments[0];
      const result = await createRefund({
        paymentId: first.id,
        amount: Number(first.amount),
        reason: opts.refundReason ?? opts.reason ?? "order_cancelled",
        provider: first.provider === "daraja" ? "daraja" : first.provider === "card" ? "card" : "cash",
        createdById: opts.actorId,
        markCompleted: first.provider !== "daraja", // cash/card can complete immediately; daraja needs B2C
      });
      if (result.ok) refundId = result.refundId;
    }
  });

  return { ok: true, refundId };
}

/**
 * Reverse a dispatch (undo) — used by admin "Undispatch" action.
 * Restocks the items and clears fulfilledAt/dispatchedAt.
 *
 * For reservations: convert the sale back to active reservation by re-creating
 * the reservation row (stock not restored because the unit is already gone).
 *
 * For immediate (counter) sales: physically restock the units.
 */
export async function undispatchOrder(opts: {
  orderId: string;
  actorId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: { items: { select: { id: true, medicationId: true, name: true, quantity: true } } },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "fulfilled") return { ok: false, error: "Only fulfilled orders can be undispatched." };

  await prisma.$transaction(async (tx) => {
    // For immediate/counter sales: physically restock.
    if (order.fulfillment === "immediate") {
      for (const item of order.items) {
        if (!item.medicationId) continue;
        await applyStockChange(tx, {
          inventoryId: item.medicationId,
          quantityDelta: item.quantity,
          reason: "return_customer",
          notes: `Undispatch order ${order.id.slice(0, 8)}`,
          relatedType: "order",
          relatedId: order.id,
          actorId: opts.actorId,
          skipLots: true, // aggregate restore
        });
      }
    } else {
      // For reservations: just clear fulfilled flags; reservation was already converted.
      // No physical stock change needed (units never left the shelf until customer collected).
    }

    await tx.order.update({
      where: { id: opts.orderId },
      data: {
        dispatchedAt: null,
        dispatchedById: null,
        fulfilledAt: null,
        outForDeliveryAt: null,
        fulfillmentStage: order.fulfillment === "reserve" ? "reserved" : "unfulfilled",
        // Back-compat: keep status as paid (if was fulfilled) or pending.
        status: order.paymentStage === "paid" || order.status === "waived" ? (order.status === "waived" ? "waived" : "paid") : "pending",
        lifecycleStatus: "active",
      },
    });

    await recordCommerceEvent(tx, {
      eventType: "order_cancelled",
      entityType: "order",
      entityId: opts.orderId,
      orderId: opts.orderId,
      actorId: opts.actorId,
      metadata: { action: "undispatch" },
    });
  });

  return { ok: true };
}
