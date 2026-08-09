import "server-only";

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TxClient } from "@/app/lib/services/stock";
import { applyStockChange } from "@/app/lib/services/stock";
import { recordCommerceEvent } from "@/app/lib/services/commerce/events";

/**
 * Inventory reservation lifecycle (audit §8, §9, §10).
 *
 * A reservation is a *temporary stock commitment* — distinct from a sale.
 * Creating a reservation decrements `currentStock` (because the unit is
 * physically still on the shelf but promised to an order) but the
 * StockMovement reason is `reservation_create`, NOT `sale`.
 *
 * Lifecycle:
 *   active       → converted  (paid + collected → stock becomes a real sale)
 *   active       → released   (cancelled before payment → stock restored)
 *   active       → expired    (auto-release after expiresAt → stock restored)
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
 * Create a reservation AND apply the stock movement in one atomic operation.
 * Caller wraps both in a single transaction.
 */
export async function createReservation(
  tx: TxClient,
  input: ReservationCreateInput,
): Promise<{ reservationId: string; stockResult: Awaited<ReturnType<typeof applyStockChange>> }> {
  // Idempotency: skip if an active reservation already exists for this order + inventory.
  const existing = await tx.inventoryReservation.findFirst({
    where: { orderId: input.orderId, inventoryId: input.inventoryId, status: "active" },
    select: { id: true },
  });
  if (existing) {
    // Already reserved — don't double-deduct. Caller should treat as no-op.
    throw new Error("reservation_already_exists");
  }

  // Apply stock movement with reservation_create reason.
  const stockResult = await applyStockChange(tx, {
    inventoryId: input.inventoryId,
    quantityDelta: -input.quantity,
    reason: "reservation_create",
    notes: `Reservation for order ${input.orderId.slice(0, 8)}`,
    relatedType: "order",
    relatedId: input.orderId,
    actorId: input.createdById ?? null,
  });

  // Create the reservation row.
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

  return { reservationId: reservation.id, stockResult };
}

/**
 * Convert an active reservation into a real sale (audit §67, Rule 7).
 * Caller has just received payment / dispatched the order.
 * Writes a `sale` stock movement of zero delta (because the units were
 * already physically decremented at reservation_create) so the ledger
 * shows the conversion explicitly.
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
    // Zero-delta audit movement so the stock ledger shows the conversion.
    const inv = await tx.pharmacyInventory.findUnique({
      where: { id: r.inventoryId },
      select: { currentStock: true, medicationMaster: { select: { name: true } } },
    });
    if (inv) {
      await tx.stockMovement.create({
        data: {
          pharmacyInventoryId: r.inventoryId,
          inventoryLotId: r.inventoryLotId ?? null,
          reason: "sale",
          quantityDelta: 0,
          balanceAfter: inv.currentStock,
          notes: `Reservation converted to sale (order ${opts.orderId.slice(0, 8)})`,
          relatedType: "order",
          relatedId: opts.orderId,
          actorId: opts.actorId ?? null,
        },
      });
    }
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
 * Release an active reservation: restore stock, mark reservation released.
 * Used by: cancellation, expiry cron, manual release.
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
    // Restore physical stock.
    await applyStockChange(tx, {
      inventoryId: r.inventoryId,
      quantityDelta: r.quantity,
      reason: "reservation_release",
      notes: `Reservation released: ${opts.reason} (order ${opts.orderId.slice(0, 8)})`,
      relatedType: "order",
      relatedId: opts.orderId,
      actorId: opts.actorId ?? null,
      skipLots: true, // aggregate restore; lots were FEFO'd at reservation_create
    });
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
