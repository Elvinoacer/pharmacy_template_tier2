/**
 * Canonical public/commerce availability.
 *
 * Physical stock (`currentStock`) is unchanged by a reservation. Sellable
 * units are always `currentStock − active reservations`.
 */

export type ReservationQty = { quantity: number };

export const ACTIVE_RESERVATION_SELECT = {
  reservations: {
    where: { status: "active" as const },
    select: { quantity: true },
  },
} as const;

export function reservedQuantity(reservations?: ReservationQty[] | null): number {
  if (!reservations?.length) return 0;
  let total = 0;
  for (const row of reservations) {
    const qty = Number(row.quantity);
    if (Number.isFinite(qty) && qty > 0) total += qty;
  }
  return total;
}

export function sellableAvailable(currentStock: number, reserved = 0): number {
  const physical = Number.isFinite(currentStock) ? currentStock : 0;
  const held = Number.isFinite(reserved) ? reserved : 0;
  return Math.max(0, physical - held);
}

export function sellableFromInventory(inventory: {
  currentStock: number;
  reservations?: ReservationQty[] | null;
}): number {
  return sellableAvailable(inventory.currentStock, reservedQuantity(inventory.reservations));
}

export function isSellableInStock(currentStock: number, reserved = 0): boolean {
  return sellableAvailable(currentStock, reserved) > 0;
}

export function pharmacySupportsDelivery(settings: {
  deliveryNotes?: string | null;
  deliveryRadiusKm?: number | null;
} | null | undefined): boolean {
  const notes = settings?.deliveryNotes?.trim();
  if (notes) return true;
  const radius = settings?.deliveryRadiusKm;
  return typeof radius === "number" && Number.isFinite(radius) && radius > 0;
}

export function clampOrderQuantity(quantity: number, available: number, max = 20): number {
  const stockCap = Math.max(0, available);
  const hardCap = Math.min(max, stockCap);
  if (hardCap <= 0) return 0;
  const qty = Number.isFinite(quantity) ? quantity : 1;
  return Math.max(1, Math.min(hardCap, Math.trunc(qty)));
}
