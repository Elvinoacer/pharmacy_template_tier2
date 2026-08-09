import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { applyStockChange } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";

/**
 * Inventory reservation lifecycle (audit §8, §9, §10).
 * 
 * CONCEPTUAL MODEL (Option A from audit):
 *   - currentStock = physical stock on hand (unchanged by reservation)
 *   - reserved = stock committed to unpaid orders (separate counter)
 *   - available = currentStock - reserved
 * 
 * Creating a reservation does NOT decrement currentStock. Instead, it
 * records the reserved quantity separately. This keeps the accounting clear:
 *   Physical stock = 100
 *   Reserved = 10
 *   Available = 90
 * 
 * Lifecycle:
 *   active       → converted  (paid + collected → reserved cleared, stock becomes a real sale)
 *   active       → released   (cancelled before payment → reserved cleared)
 *   active       → expired    (auto-release after expiresAt → reserved cleared)
 * 
 * Key invariant: a single InventoryReservation row per (order, inventory)
 * so we never double-hold stock for the same order.
 */

export const DEFAULT_RESERVATION_TTL_HOURS = 48; // 2 days before auto-expiry

export type ReservationCreateInput = {
  orderId: string;
  orderItemId?: string | null;
  inventoryId: string;
  quantity: number;
  expiresAt?: Date | null;
  createdById?: string | null;
  lotId?: string | null;
};

/**
 * Create a reservation AND record the reserved quantity in one atomic operation.
 * Caller wraps both in a single transaction.
 * 
 * NOTE: This does NOT decrement currentStock. Reservations are tracked separately
 * so that physical stock remains unchanged until the order is actually fulfilled.
 */
export async function createReservation(
  tx: TxClient,
  input: ReservationCreateInput,
): Promise<{ reservationId: string }> {
  // Idempotency: skip if an active reservation already exists for this order + inventory.
  const existing = await tx.inventoryReservation.findFirst({
    where: { orderId: input.orderId, inventoryId: input.inventoryId, status: "active" },
    select: { id: true },
  });
  if (existing) {
    // Already reserved — don't double-hold. Caller should treat as no-op.
    throw new Error("reservation_already_exists");
  }

  // Create the reservation row (no stock movement — reserved is tracked separately).
  const reservation = await tx.inventoryReservation.create({
    data: {
      orderId: input.orderId,
      orderItemId: input.orderItemId ?? null,
      inventoryId: input.inventoryId,
      inventoryLotId: input.lotId ?? null,
      quantity: input.quantity,
      status: "active",
      expiresAt: input.expiresAt ?? new Date(Date.now() + DEFAULT_RESERVATION_TTL_HOURS * 3600 * 1000),
      createdById: input.createdById ?? null,
    },
  });

  // Audit ledger
  await recordCommerceEvent(tx, {
    eventType: "stock_reserved",
    entityType: "order",
    entityId: input.orderId,
    orderId: input.orderId,
    actorId: input.createdById ?? null,
    amount: null,
    metadata: { reservationId: reservation.id, inventoryId: input.inventoryId, quantity: input.quantity },
  });

  return { reservationId: reservation.id };
}

/**
 * Convert an active reservation into a real sale (audit §67, Rule 7).
 * Caller has just received payment / dispatched the order.
 * 
 * This decrements currentStock (because the reserved units are now actually sold)
 * and marks the reservation as converted. The stock movement reason is `sale`.
 */
export async function convertReservationToSale(
  tx: TxClient,
  opts: { orderId: string; actorId?: string | null; reason?: string },
): Promise<{ converted: number }> {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId: opts.orderId, status: "active" },
  });
  if (reservations.length === 0) return { converted: 0 };

  for (const r of reservations) {
    // Mark reservation converted.
    await tx.inventoryReservation.update({
      where: { id: r.id },
      data: { status: "converted", releasedAt: new Date(), releasedReason: opts.reason ?? "converted_to_sale" },
    });
    // Decrement stock now that the reservation becomes a real sale.
    await applyStockChange(tx, {
      inventoryId: r.inventoryId,
      quantityDelta: -r.quantity,
      reason: "sale",
      notes: `Reservation converted to sale (order ${opts.orderId.slice(0, 8)})`,
      relatedType: "order",
      relatedId: opts.orderId,
      actorId: opts.actorId ?? null,
      inventoryLotId: r.inventoryLotId ?? undefined,
    });
  }

  await recordCommerceEvent(tx, {
    eventType: "stock_sold",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    actorId: opts.actorId ?? null,
    metadata: { convertedReservations: reservations.length, reason: opts.reason ?? "converted_to_sale" },
  });

  return { converted: reservations.length };
}

/**
 * Release an active reservation: clear the reserved status (no stock change needed).
 * Used by: cancellation, expiry cron, manual release.
 * 
 * Since reservations don't decrement currentStock (they only track reserved separately),
 * releasing a reservation simply marks it as released/expired without touching stock.
 *
 * Idempotent: if no active reservation exists, no-op.
 */
export async function releaseReservation(
  tx: TxClient,
  opts: {
    orderId: string;
    reason: "cancelled" | "expired" | "manual_release" | "payment_failed";
    actorId?: string | null;
  },
): Promise<{ released: number }> {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId: opts.orderId, status: "active" },
  });
  if (reservations.length === 0) return { released: 0 };

  for (const r of reservations) {
    // Mark reservation released (no stock change — stock was never decremented).
    await tx.inventoryReservation.update({
      where: { id: r.id },
      data: {
        status: opts.reason === "expired" ? "expired" : "released",
        releasedAt: new Date(),
        releasedReason: opts.reason,
      },
    });
  }

  await recordCommerceEvent(tx, {
    eventType: opts.reason === "expired" ? "reservation_expired" : "stock_released",
    entityType: "order",
    entityId: opts.orderId,
    orderId: opts.orderId,
    actorId: opts.actorId ?? null,
    metadata: { releasedReservations: reservations.length, reason: opts.reason },
  });

  return { released: reservations.length };
}

/**
 * Cron-friendly: find all active reservations whose expiresAt has passed
 * and release them. Returns count of released reservations.
 */
export async function releaseExpiredReservations(opts?: { actorId?: string | null }): Promise<{
  releasedCount: number;
  ordersAffected: string[];
}> {
  const now = new Date();
  const expired = await prisma.inventoryReservation.findMany({
    where: { status: "active", expiresAt: { lt: now } },
    select: { id: true, orderId: true, inventoryId: true, quantity: true, inventoryLotId: true },
    take: 200,
  });
  if (expired.length === 0) return { releasedCount: 0, ordersAffected: [] };

  const orderIds = Array.from(new Set(expired.map((r) => r.orderId)));
  for (const orderId of orderIds) {
    await prisma.$transaction(async (tx) => {
      await releaseReservation(tx, { orderId, reason: "expired", actorId: opts?.actorId ?? null });
      // Mark the order expired/cancelled if it was still pending.
      await tx.order.updateMany({
        where: { id: orderId, status: "pending" },
        data: { status: "cancelled", lifecycleStatus: "expired", cancelledAt: new Date(), expiredAt: now, cancellationReason: "reservation_expired" },
      });
    });
  }
  return { releasedCount: expired.length, ordersAffected: orderIds };
}

/**
 * How much stock is currently held by active (unpaid) reservations for an inventory item.
 * Used by availability calculations and inventory analytics.
 */
export async function reservedQuantityFor(inventoryId: string): Promise<number> {
  const rows = await prisma.inventoryReservation.aggregate({
    where: { inventoryId, status: "active" },
    _sum: { quantity: true },
  });
  return rows._sum.quantity ?? 0;
}

/** Available = currentStock − reserved. Used everywhere stock availability matters. */
export async function availableQuantity(inventoryId: string): Promise<{
  currentStock: number;
  reserved: number;
  available: number;
}> {
  const [inv, reserved] = await Promise.all([
    prisma.pharmacyInventory.findUnique({
      where: { id: inventoryId },
      select: { currentStock: true },
    }),
    reservedQuantityFor(inventoryId),
  ]);
  const currentStock = inv?.currentStock ?? 0;
  return { currentStock, reserved, available: Math.max(0, currentStock - reserved) };
}
