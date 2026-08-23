import "server-only";

import { prisma } from "@/app/lib/db";
import { requireTenantId } from "@/app/lib/tenant";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import type { Prisma } from "@/app/generated/prisma/client";

/**
 * Central inventory service — every stock change goes through here so we get:
 *  - atomic decrements (no race to negative)
 *  - FEFO lot deduction when lots exist
 *  - StockMovement audit rows
 *  - low-stock admin alerts when crossing the threshold
 */

export type StockReason =
  // ── Legacy (kept for backward-compat with existing StockMovement rows) ──
  | "sale"
  | "receive"
  | "adjust"
  | "dispatch"
  | "refill"
  | "pos_sync"
  | "return"
  | "write_off"
  // ── Commerce ledger extension (audit §19) — stricter vocabulary ──
  | "purchase_receive"        // Goods received from supplier
  | "reservation_create"      // Stock held for an unpaid/uncollected reservation
  | "reservation_release"     // Stock returned because reservation expired/cancelled
  | "prescription_fill"       // Stock consumed by a prescription fill (audit §5)
  | "refill_fill"             // Stock consumed by a refill fulfillment (audit §11)
  | "return_customer"         // Customer returned purchased goods
  | "return_supplier"         // Goods sent back to supplier
  | "expiry"                  // Stock written off due to expiry
  | "damage"                  // Stock written off due to damage/spoilage
  | "transfer_in"             // Stock received from another location
  | "transfer_out"            // Stock shipped to another location
  | "stocktake_adjustment";   // Manual adjustment from stock count

export type TxClient = Prisma.TransactionClient;

export type StockChangeResult = {
  inventoryId: string;
  previousStock: number;
  newStock: number;
  quantityDelta: number;
  lotIds: string[];
  lotDetails?: Array<{ lotId: string; quantity: number; unitCost: number }>;
  movementIds: string[];
  crossedLowStock: boolean;
  isOutOfStock: boolean;
  medicationName: string;
  lowStockThreshold: number;
};

export class InsufficientStockError extends Error {
  constructor(
    public readonly medicationName: string,
    public readonly available: number,
    public readonly required: number,
  ) {
    super(`Insufficient stock for ${medicationName}. Available: ${available}, required: ${required}.`);
    this.name = "InsufficientStockError";
  }
}

type InventorySnap = {
  id: string;
  currentStock: number;
  lowStockThreshold: number;
  medicationMaster: { name: string };
};

async function loadInventory(tx: TxClient, inventoryId: string): Promise<InventorySnap> {
  const inv = await tx.pharmacyInventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      currentStock: true,
      lowStockThreshold: true,
      medicationMaster: { select: { name: true } },
    },
  });
  if (!inv) throw new Error(`Inventory row ${inventoryId} not found.`);
  return inv;
}

/**
 * FEFO: deduct from active lots ordered by earliest expiry first.
 * If no lots exist, only the aggregate currentStock is changed.
 * If lots exist but total lot qty < needed, still deduct what we can from lots
 * and apply the remainder to aggregate only (legacy stock without lots).
 * 
 * Returns detailed information about each lot touched, including the exact
 * quantity taken from each lot and its unit cost for accurate COGS tracking.
 */
async function deductLotsFefo(
  tx: TxClient,
  inventoryId: string,
  quantity: number,
): Promise<{ 
  lotIds: string[]; 
  remaining: number;
  lotDetails: Array<{ lotId: string; quantity: number; unitCost: number }>;
}> {
  const lots = await tx.inventoryLot.findMany({
    where: { pharmacyInventoryId: inventoryId, active: true, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
  });
  if (lots.length === 0) return { lotIds: [], remaining: quantity, lotDetails: [] };

  let remaining = quantity;
  const lotIds: string[] = [];
  const lotDetails: Array<{ lotId: string; quantity: number; unitCost: number }> = [];
  
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    const newQty = lot.quantity - take;
    await tx.inventoryLot.update({
      where: { id: lot.id },
      data: { quantity: newQty, active: newQty > 0 },
    });
    lotIds.push(lot.id);
    lotDetails.push({
      lotId: lot.id,
      quantity: take,
      unitCost: Number((lot as Record<string, unknown>).unitCost ?? 0),
    });
    remaining -= take;
  }
  return { lotIds, remaining, lotDetails };
}

async function addToLot(
  tx: TxClient,
  inventoryId: string,
  quantity: number,
  opts: { batchNumber?: string; expiryDate?: Date; lotId?: string },
): Promise<string | null> {
  if (opts.lotId) {
    await tx.inventoryLot.update({
      where: { id: opts.lotId },
      data: { quantity: { increment: quantity }, active: true },
    });
    return opts.lotId;
  }
  if (opts.batchNumber && opts.expiryDate) {
    // Merge into same batch+expiry if it already exists.
    const existing = await tx.inventoryLot.findFirst({
      where: {
        pharmacyInventoryId: inventoryId,
        batchNumber: opts.batchNumber,
        expiryDate: opts.expiryDate,
      },
    });
    if (existing) {
      await tx.inventoryLot.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity }, active: true },
      });
      return existing.id;
    }
    const created = await tx.inventoryLot.create({
      data: {
        pharmacyInventoryId: inventoryId,
        batchNumber: opts.batchNumber,
        expiryDate: opts.expiryDate,
        quantity,
        active: true,
      },
    });
    return created.id;
  }
  return null;
}

/**
 * Apply a signed stock change inside an existing transaction.
 * For outbound (negative delta), uses atomic conditional update so concurrent
 * sales cannot drive stock negative.
 */
export async function applyStockChange(
  tx: TxClient,
  input: {
    inventoryId: string;
    quantityDelta: number;
    reason: StockReason;
    notes?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    actorId?: string | null;
    /** For receive: optional lot details */
    batchNumber?: string;
    expiryDate?: Date;
    lotId?: string;
    /** Skip FEFO lot deduction (e.g. POS absolute set). */
    skipLots?: boolean;
  },
): Promise<StockChangeResult> {
  const {
    inventoryId,
    quantityDelta,
    reason,
    notes,
    relatedType,
    relatedId,
    actorId,
    batchNumber,
    expiryDate,
    lotId,
    skipLots,
  } = input;

  if (quantityDelta === 0) {
    const snap = await loadInventory(tx, inventoryId);
    return {
      inventoryId,
      previousStock: snap.currentStock,
      newStock: snap.currentStock,
      quantityDelta: 0,
      lotIds: [],
      lotDetails: [],
      movementIds: [],
      crossedLowStock: false,
      isOutOfStock: snap.currentStock <= 0,
      medicationName: snap.medicationMaster.name,
      lowStockThreshold: snap.lowStockThreshold,
    };
  }

  const before = await loadInventory(tx, inventoryId);
  const previousStock = before.currentStock;
  let lotIds: string[] = [];
  let lotDetails: Array<{ lotId: string; quantity: number; unitCost: number }> = [];

  if (quantityDelta < 0) {
    const needed = Math.abs(quantityDelta);
    // Atomic guard: only succeed if stock is still sufficient.
    const updated = await tx.pharmacyInventory.updateMany({
      where: { id: inventoryId, currentStock: { gte: needed } },
      data: { currentStock: { decrement: needed } },
    });
    if (updated.count === 0) {
      throw new InsufficientStockError(before.medicationMaster.name, previousStock, needed);
    }
    if (!skipLots) {
      const lotResult = await deductLotsFefo(tx, inventoryId, needed);
      lotIds = lotResult.lotIds;
      lotDetails = lotResult.lotDetails;
      // If lots couldn't cover, aggregate already handled it — fine for mixed mode.
    }
  } else {
    await tx.pharmacyInventory.update({
      where: { id: inventoryId },
      data: { currentStock: { increment: quantityDelta } },
    });
    if (!skipLots) {
      const lid = await addToLot(tx, inventoryId, quantityDelta, {
        batchNumber,
        expiryDate,
        lotId,
      });
      if (lid) lotIds = [lid];
    }
  }

  const after = await loadInventory(tx, inventoryId);
  const movement = await tx.stockMovement.create({
    data: {
      pharmacyInventoryId: inventoryId,
      inventoryLotId: lotIds[0] ?? null,
      reason,
      quantityDelta,
      balanceAfter: after.currentStock,
      notes: notes ?? null,
      relatedType: relatedType ?? null,
      relatedId: relatedId ?? null,
      actorId: actorId ?? null,
    },
  });

  // Extra movement rows if multiple lots were touched (audit detail).
  const extraMovementIds: string[] = [];
  if (lotIds.length > 1 && quantityDelta < 0) {
    // Primary movement already references first lot; siblings are informational only.
    for (const lid of lotIds.slice(1)) {
      const m = await tx.stockMovement.create({
        data: {
          pharmacyInventoryId: inventoryId,
          inventoryLotId: lid,
          reason,
          quantityDelta: 0, // detail row; aggregate already recorded on primary
          balanceAfter: after.currentStock,
          notes: notes ? `${notes} (lot detail)` : "Lot FEFO detail",
          relatedType: relatedType ?? null,
          relatedId: relatedId ?? null,
          actorId: actorId ?? null,
        },
      });
      extraMovementIds.push(m.id);
    }
  }

  const wasAboveOrEqual = previousStock > before.lowStockThreshold;
  const nowAtOrBelow = after.currentStock <= after.lowStockThreshold;
  const crossedLowStock =
    quantityDelta < 0 &&
    ((wasAboveOrEqual && nowAtOrBelow) || (previousStock > 0 && after.currentStock <= 0));

  return {
    inventoryId,
    previousStock,
    newStock: after.currentStock,
    quantityDelta,
    lotIds,
    lotDetails,
    movementIds: [movement.id, ...extraMovementIds],
    crossedLowStock,
    isOutOfStock: after.currentStock <= 0,
    medicationName: after.medicationMaster.name,
    lowStockThreshold: after.lowStockThreshold,
  };
}

/** Run a stock change in its own transaction. */
export async function changeStock(input: Parameters<typeof applyStockChange>[1]): Promise<StockChangeResult> {
  return prisma.$transaction((tx) => applyStockChange(tx, input));
}

/**
 * Set absolute stock level (POS sync). Records a movement for the delta.
 * Does not touch lots (POS is aggregate-level).
 */
export async function setAbsoluteStock(
  tx: TxClient,
  input: {
    inventoryId: string;
    newStock: number;
    reason?: StockReason;
    notes?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    actorId?: string | null;
  },
): Promise<StockChangeResult> {
  const before = await loadInventory(tx, input.inventoryId);
  const delta = input.newStock - before.currentStock;
  await tx.pharmacyInventory.update({
    where: { id: input.inventoryId },
    data: { currentStock: input.newStock },
  });
  const movement = await tx.stockMovement.create({
    data: {
      pharmacyInventoryId: input.inventoryId,
      reason: input.reason ?? "pos_sync",
      quantityDelta: delta,
      balanceAfter: input.newStock,
      notes: input.notes ?? "Absolute stock set",
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      actorId: input.actorId ?? null,
    },
  });
  const crossedLowStock =
    before.currentStock > before.lowStockThreshold && input.newStock <= before.lowStockThreshold;
  return {
    inventoryId: input.inventoryId,
    previousStock: before.currentStock,
    newStock: input.newStock,
    quantityDelta: delta,
    lotIds: [],
    movementIds: [movement.id],
    crossedLowStock: crossedLowStock || (before.currentStock > 0 && input.newStock <= 0),
    isOutOfStock: input.newStock <= 0,
    medicationName: before.medicationMaster.name,
    lowStockThreshold: before.lowStockThreshold,
  };
}

/** Fire low-stock / out-of-stock admin notifications (best-effort, outside tx). */
export async function notifyStockThreshold(result: StockChangeResult | null | undefined): Promise<void> {
  if (!result) return;
  if (!result.crossedLowStock && !result.isOutOfStock) return;
  const severity = result.isOutOfStock ? "critical" : "warning";
  const title = result.isOutOfStock
    ? `Out of stock: ${result.medicationName}`
    : `Low stock: ${result.medicationName}`;
  const body = result.isOutOfStock
    ? `${result.medicationName} is now out of stock (was ${result.previousStock}).`
    : `${result.medicationName} is at ${result.newStock} units (threshold ≤ ${result.lowStockThreshold}).`;
  await recordAdminNotification({
    type: "stock_low",
    title,
    body,
    severity,
    relatedType: "pharmacy_inventory",
    relatedId: result.inventoryId,
  });
}

/** Notify for multiple change results (dedupe by inventory id). */
export async function notifyStockThresholds(results: Array<StockChangeResult | null | undefined>): Promise<void> {
  const seen = new Set<string>();
  for (const r of results) {
    if (!r) continue;
    if (seen.has(r.inventoryId)) continue;
    if (!r.crossedLowStock && !r.isOutOfStock) continue;
    seen.add(r.inventoryId);
    await notifyStockThreshold(r);
  }
}

export type InventoryHealth = {
  lowStock: Array<{
    id: string;
    name: string;
    slug: string;
    currentStock: number;
    lowStockThreshold: number;
    supplier: string | null;
  }>;
  outOfStock: Array<{
    id: string;
    name: string;
    slug: string;
    lowStockThreshold: number;
    supplier: string | null;
  }>;
  expiringLots: Array<{
    lotId: string;
    inventoryId: string;
    name: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
    daysUntilExpiry: number;
  }>;
  expiredLots: Array<{
    lotId: string;
    inventoryId: string;
    name: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
  }>;
  reorderSuggestions: Array<{
    id: string;
    name: string;
    slug: string;
    currentStock: number;
    lowStockThreshold: number;
    supplier: string | null;
    suggestedOrderQty: number;
    unitsSold30d: number;
  }>;
  counts: {
    lowStock: number;
    outOfStock: number;
    expiringLots: number;
    expiredLots: number;
    reorder: number;
    totalActive: number;
  };
};

const MS_DAY = 24 * 60 * 60 * 1000;

/** Snapshot used by dashboard, reorder page, and inventory health cron. */
export async function getInventoryHealth(opts?: {
  expiryDays?: number;
  salesLookbackDays?: number;
}): Promise<InventoryHealth> {
  const expiryDays = opts?.expiryDays ?? 60;
  const salesLookbackDays = opts?.salesLookbackDays ?? 30;
  const now = new Date();
  const expiryHorizon = new Date(now.getTime() + expiryDays * MS_DAY);
  const salesSince = new Date(now.getTime() - salesLookbackDays * MS_DAY);
  // Raw SQL below bypasses the tenant-scoped client — filter pharmacy_id.
  const pharmacyId = await requireTenantId();

  const [activeRows, lowRows, outRows, expiring, expired, salesAgg, totalActive] = await Promise.all([
    prisma.pharmacyInventory.findMany({
      where: { active: true },
      select: {
        id: true,
        slug: true,
        currentStock: true,
        lowStockThreshold: true,
        supplier: true,
        medicationMaster: { select: { name: true } },
      },
    }),
    prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        current_stock: number;
        low_stock_threshold: number;
        supplier: string | null;
        name: string;
      }>
    >`
      SELECT pi.id, pi.slug, pi.current_stock, pi.low_stock_threshold, pi.supplier, mm.name
      FROM pharmacy_inventory pi
      JOIN medication_masters mm ON mm.id = pi.medication_master_id
      WHERE pi.pharmacy_id = ${pharmacyId}
        AND pi.active = true
        AND pi.current_stock > 0
        AND pi.current_stock <= pi.low_stock_threshold
      ORDER BY pi.current_stock ASC, mm.name ASC
    `,
    prisma.pharmacyInventory.findMany({
      where: { active: true, currentStock: { lte: 0 } },
      select: {
        id: true,
        slug: true,
        lowStockThreshold: true,
        supplier: true,
        medicationMaster: { select: { name: true } },
      },
      orderBy: { medicationMaster: { name: "asc" } },
    }),
    prisma.inventoryLot.findMany({
      where: {
        active: true,
        quantity: { gt: 0 },
        expiryDate: { gte: now, lte: expiryHorizon },
      },
      include: {
        pharmacyInventory: {
          select: {
            id: true,
            medicationMaster: { select: { name: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 100,
    }),
    prisma.inventoryLot.findMany({
      where: {
        active: true,
        quantity: { gt: 0 },
        expiryDate: { lt: now },
      },
      include: {
        pharmacyInventory: {
          select: {
            id: true,
            medicationMaster: { select: { name: true } },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 100,
    }),
    prisma.orderItem.groupBy({
      by: ["medicationId"],
      where: {
        medicationId: { not: null },
        createdAt: { gte: salesSince },
        order: { status: { notIn: ["cancelled"] } },
      },
      _sum: { quantity: true },
    }),
    prisma.pharmacyInventory.count({ where: { active: true } }),
  ]);

  const soldMap = new Map<string, number>();
  for (const row of salesAgg) {
    if (row.medicationId) soldMap.set(row.medicationId, row._sum.quantity ?? 0);
  }

  const lowStock = lowRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    currentStock: r.current_stock,
    lowStockThreshold: r.low_stock_threshold,
    supplier: r.supplier,
  }));

  const outOfStock = outRows.map((r) => ({
    id: r.id,
    name: r.medicationMaster.name,
    slug: r.slug,
    lowStockThreshold: r.lowStockThreshold,
    supplier: r.supplier,
  }));

  const expiringLots = expiring.map((l) => ({
    lotId: l.id,
    inventoryId: l.pharmacyInventory.id,
    name: l.pharmacyInventory.medicationMaster.name,
    batchNumber: l.batchNumber,
    expiryDate: l.expiryDate,
    quantity: l.quantity,
    daysUntilExpiry: Math.max(0, Math.ceil((l.expiryDate.getTime() - now.getTime()) / MS_DAY)),
  }));

  const expiredLots = expired.map((l) => ({
    lotId: l.id,
    inventoryId: l.pharmacyInventory.id,
    name: l.pharmacyInventory.medicationMaster.name,
    batchNumber: l.batchNumber,
    expiryDate: l.expiryDate,
    quantity: l.quantity,
  }));

  // Reorder: low/out items + items with < ~14 days cover at recent velocity.
  const needsReorder = activeRows
    .map((r) => {
      const sold = soldMap.get(r.id) ?? 0;
      const daily = sold / salesLookbackDays;
      const daysCover = daily > 0 ? r.currentStock / daily : r.currentStock > 0 ? 999 : 0;
      const belowThreshold = r.currentStock <= r.lowStockThreshold;
      const fastMoverLow = daily > 0 && daysCover < 14;
      if (!belowThreshold && !fastMoverLow) return null;
      // Suggest: cover 30 days of sales, or top up to 2× threshold, whichever larger.
      const velocityTarget = Math.ceil(daily * 30);
      const thresholdTarget = Math.max(r.lowStockThreshold * 2 - r.currentStock, 0);
      const suggestedOrderQty = Math.max(velocityTarget - r.currentStock, thresholdTarget, belowThreshold ? r.lowStockThreshold : 0);
      if (suggestedOrderQty <= 0 && r.currentStock > 0) return null;
      return {
        id: r.id,
        name: r.medicationMaster.name,
        slug: r.slug,
        currentStock: r.currentStock,
        lowStockThreshold: r.lowStockThreshold,
        supplier: r.supplier,
        suggestedOrderQty: Math.max(suggestedOrderQty, 1),
        unitsSold30d: sold,
      };
    })
    .filter(Boolean) as InventoryHealth["reorderSuggestions"];

  needsReorder.sort((a, b) => a.currentStock - b.currentStock || b.unitsSold30d - a.unitsSold30d);

  return {
    lowStock,
    outOfStock,
    expiringLots,
    expiredLots,
    reorderSuggestions: needsReorder,
    counts: {
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      expiringLots: expiringLots.length,
      expiredLots: expiredLots.length,
      reorder: needsReorder.length,
      totalActive,
    },
  };
}

/**
 * Daily/periodic inventory health scan — creates admin notifications for
 * newly critical items without spamming (dedupe: same type+relatedId in 24h).
 */
export async function runInventoryHealthScan(): Promise<{
  lowNotified: number;
  outNotified: number;
  expiryNotified: number;
  expiredNotified: number;
}> {
  const health = await getInventoryHealth({ expiryDays: 30 });
  const since = new Date(Date.now() - 24 * MS_DAY);
  let lowNotified = 0;
  let outNotified = 0;
  let expiryNotified = 0;
  let expiredNotified = 0;

  async function alreadyNotified(type: string, relatedId: string): Promise<boolean> {
    const existing = await prisma.adminNotification.findFirst({
      where: {
        type,
        relatedId,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  for (const item of health.outOfStock) {
    if (await alreadyNotified("stock_low", item.id)) continue;
    await recordAdminNotification({
      type: "stock_low",
      title: `Out of stock: ${item.name}`,
      body: `${item.name} has 0 units. Reorder from ${item.supplier || "supplier"}.`,
      severity: "critical",
      relatedType: "pharmacy_inventory",
      relatedId: item.id,
    });
    outNotified++;
  }

  for (const item of health.lowStock) {
    if (await alreadyNotified("stock_low", item.id)) continue;
    await recordAdminNotification({
      type: "stock_low",
      title: `Low stock: ${item.name}`,
      body: `${item.name} is at ${item.currentStock} (threshold ≤ ${item.lowStockThreshold}).`,
      severity: "warning",
      relatedType: "pharmacy_inventory",
      relatedId: item.id,
    });
    lowNotified++;
  }

  // Group expiry alerts into one summary + per-lot critical if ≤7 days.
  if (health.expiredLots.length > 0) {
    const key = "expired-lots-summary";
    const existing = await prisma.adminNotification.findFirst({
      where: { type: "stock_low", title: { contains: "Expired lots" }, createdAt: { gte: since } },
      select: { id: true },
    });
    if (!existing) {
      await recordAdminNotification({
        type: "stock_low",
        title: `Expired lots: ${health.expiredLots.length} batch(es)`,
        body: health.expiredLots
          .slice(0, 5)
          .map((l) => `${l.name} batch ${l.batchNumber} (${l.quantity} units)`)
          .join("; "),
        severity: "critical",
        relatedType: "inventory_lot",
        relatedId: health.expiredLots[0]?.lotId,
      });
      expiredNotified++;
    }
    void key;
  }

  const urgentExpiry = health.expiringLots.filter((l) => l.daysUntilExpiry <= 14);
  if (urgentExpiry.length > 0) {
    const existing = await prisma.adminNotification.findFirst({
      where: { type: "stock_low", title: { contains: "Expiring soon" }, createdAt: { gte: since } },
      select: { id: true },
    });
    if (!existing) {
      await recordAdminNotification({
        type: "stock_low",
        title: `Expiring soon: ${urgentExpiry.length} lot(s)`,
        body: urgentExpiry
          .slice(0, 5)
          .map((l) => `${l.name} batch ${l.batchNumber} in ${l.daysUntilExpiry}d`)
          .join("; "),
        severity: "warning",
        relatedType: "inventory_lot",
        relatedId: urgentExpiry[0]?.lotId,
      });
      expiryNotified++;
    }
  }

  return { lowNotified, outNotified, expiryNotified, expiredNotified };
}
