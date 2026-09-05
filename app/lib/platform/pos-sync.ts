import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { recordIntegrationHealth } from "@/app/lib/platform/integrations";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";

export type PosMedication = {
  sku?: string;
  name: string;
  slug?: string;
  category: string;
  description?: string;
  indications?: string;
  dosage?: string;
  sideEffects?: string;
  contraindications?: string;
  storage?: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  imageUrl?: string;
  overTheCounter: boolean;
  publicListing: boolean;
  prescriptionRequired: boolean;
  active: boolean;
  /** Optional optimistic concurrency token from the last platform snapshot. */
  version?: number;
};

export type PosSyncResult = {
  ok: true;
  upserted: number;
  created: number;
  updated: number;
  skipped: number;
  lowStockAlerts: number;
  conflicts: number;
  progress: number;
};

async function setJobProgress(jobId: string | undefined, progress: number, result?: object) {
  if (!jobId) return;
  await prismaUnscoped.job.update({
    where: { id: jobId },
    data: { progress, ...(result ? { result: result as object } : {}) },
  }).catch(() => {});
}

function normalizedSlug(m: PosMedication) {
  return (
    m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}

/**
 * Conflict creation is serialized per inventory row. Two workers can detect the
 * same mismatch at once, but only one open logical conflict is persisted.
 */
async function recordConflict(opts: {
  pharmacyId: string;
  inventoryId: string;
  jobId?: string;
  sku?: string;
  platformStock: number;
  posStock: number;
  platformVersion: number;
  posVersion?: number;
}) {
  return prismaUnscoped.$transaction(async (tx) => {
    const lockKey = `pos-conflict:${opts.pharmacyId}:${opts.inventoryId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const existing = await tx.inventorySyncConflict.findFirst({
      where: {
        pharmacyId: opts.pharmacyId,
        inventoryId: opts.inventoryId,
        status: "open",
        platformStock: opts.platformStock,
        posStock: opts.posStock,
        platformVersion: opts.platformVersion,
        posVersion: opts.posVersion ?? null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return { conflict: existing, created: false };

    const conflict = await tx.inventorySyncConflict.create({
      data: {
        pharmacyId: opts.pharmacyId,
        inventoryId: opts.inventoryId,
        jobId: opts.jobId ?? null,
        sku: opts.sku ?? null,
        platformStock: opts.platformStock,
        posStock: opts.posStock,
        platformVersion: opts.platformVersion,
        posVersion: opts.posVersion ?? null,
        status: "open",
      },
    });
    return { conflict, created: true };
  });
}

type RowOutcome = {
  kind: "created" | "updated" | "conflict" | "skipped";
  lowStock: boolean;
  stockResult?: Awaited<ReturnType<typeof import("@/app/lib/services/stock")["setAbsoluteStock"]>> | null;
  conflictCreated?: boolean;
};

export async function runPosSync(
  pharmacyId: string,
  medications: PosMedication[],
  branchId?: string | null,
  opts?: { jobId?: string },
): Promise<PosSyncResult> {
  const entitled = await isFeatureEnabled(pharmacyId, "pos_sync");
  if (!entitled) throw new Error("ENTITLEMENT_EXCEEDED:pos_sync");

  return withPharmacy(pharmacyId, async () => {
    const { setAbsoluteStock, applyStockChange, notifyStockThresholds } = await import(
      "@/app/lib/services/stock"
    );
    type StockResult = Awaited<ReturnType<typeof setAbsoluteStock>>;
    const stockResults: StockResult[] = [];
    let upserted = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let lowStockAlerts = 0;
    let conflictCount = 0;
    const total = Math.max(medications.length, 1);

    await setJobProgress(opts?.jobId, 0, { recordsReceived: medications.length });

    // Remove the read-side N+1: resolve every inventory row and candidate master
    // needed by this payload in two bounded queries before processing writes.
    const slugs = [...new Set(medications.map(normalizedSlug))];
    const skus = [...new Set(medications.map((m) => m.sku?.trim()).filter((v): v is string => Boolean(v)))];
    const existingRows = await prismaUnscoped.pharmacyInventory.findMany({
      where: {
        pharmacyId,
        OR: [
          ...(skus.length ? [{ sku: { in: skus } }] : []),
          { slug: { in: slugs } },
        ],
      },
    });
    const bySku = new Map(existingRows.filter((r) => r.sku).map((r) => [r.sku as string, r]));
    const bySlug = new Map(existingRows.map((r) => [r.slug, r]));

    const masters = await prismaUnscoped.medicationMaster.findMany({
      where: { slug: { in: slugs } },
      orderBy: { createdAt: "asc" },
    });
    const masterBySlug = new Map(masters.map((m) => [m.slug, m]));

    // A stock difference is a normal synchronization event. It becomes a
    // conflict only when the platform also had a non-POS stock movement after
    // the previous POS sync, or the optional optimistic version is stale.
    const syncedRows = existingRows.filter((r) => r.syncedAt);
    const latestLocalMovement = new Map<string, Date>();
    if (syncedRows.length) {
      const earliestSync = new Date(Math.min(...syncedRows.map((r) => r.syncedAt!.getTime())));
      const movements = await prismaUnscoped.stockMovement.findMany({
        where: {
          pharmacyInventoryId: { in: syncedRows.map((r) => r.id) },
          reason: { not: "pos_sync" },
          createdAt: { gt: earliestSync },
        },
        select: { pharmacyInventoryId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      for (const movement of movements) {
        if (!latestLocalMovement.has(movement.pharmacyInventoryId)) {
          latestLocalMovement.set(movement.pharmacyInventoryId, movement.createdAt);
        }
      }
    }

    const seen = new Set<string>();

    const processMedication = async (m: PosMedication): Promise<RowOutcome> => {
      const slug = normalizedSlug(m);
      const identity = m.sku?.trim() ? `sku:${m.sku.trim()}` : `slug:${slug}`;
      if (seen.has(identity)) return { kind: "skipped", lowStock: false };
      seen.add(identity);

      const existing = (m.sku?.trim() ? bySku.get(m.sku.trim()) : undefined) ?? bySlug.get(slug);
      if (existing) {
        const latestLocal = latestLocalMovement.get(existing.id);
        const localStockChanged = Boolean(
          existing.syncedAt && latestLocal && latestLocal.getTime() > existing.syncedAt.getTime(),
        );
        const stockDiffers = existing.currentStock !== m.stockQty;
        const versionConflict = m.version != null && existing.version !== m.version;

        if (versionConflict || (stockDiffers && localStockChanged)) {
          const recorded = await recordConflict({
            pharmacyId,
            inventoryId: existing.id,
            jobId: opts?.jobId,
            sku: m.sku,
            platformStock: existing.currentStock,
            posStock: m.stockQty,
            platformVersion: existing.version,
            posVersion: m.version,
          });
          return {
            kind: "conflict",
            lowStock: false,
            conflictCreated: recorded.created,
          };
        }

        const stockResult = await prismaUnscoped.$transaction(async (tx) => {
          await tx.pharmacyInventory.update({
            where: { id: existing.id },
            data: {
              price: m.price,
              lowStockThreshold: m.lowStockThreshold,
              overTheCounter: m.overTheCounter,
              publicListing: m.publicListing,
              prescriptionRequired: m.prescriptionRequired,
              active: m.active,
              branchId: branchId ?? existing.branchId,
              version: { increment: 1 },
            },
          });
          const result = await setAbsoluteStock(tx, {
            inventoryId: existing.id,
            newStock: m.stockQty,
            reason: "pos_sync",
            notes: "POS authoritative stock snapshot",
            relatedType: "pos_sync",
          });
          // Write syncedAt last so it is an explicit baseline after all POS
          // mutations in this transaction.
          await tx.pharmacyInventory.update({
            where: { id: existing.id },
            data: { syncedAt: new Date() },
          });
          return result;
        });
        return { kind: "updated", lowStock: m.stockQty <= m.lowStockThreshold, stockResult };
      }

      const createdRow = await prismaUnscoped.$transaction(async (tx) => {
        let master = masterBySlug.get(slug) ?? null;
        if (!master) {
          master = await tx.medicationMaster.findFirst({
            where: {
              OR: [
                { slug },
                { name: { equals: m.name, mode: "insensitive" } },
              ],
            },
            orderBy: { createdAt: "asc" },
          });
        }
        if (!master) {
          master = await tx.medicationMaster.create({
            data: {
              name: m.name,
              slug,
              genericName: m.name.split(" ")[0] || m.name,
              category: m.category,
              description: m.description || null,
              indications: m.indications || null,
              dosage: m.dosage || null,
              sideEffects: m.sideEffects || null,
              contraindications: m.contraindications || null,
              storage: m.storage || null,
              imageUrl: m.imageUrl || null,
              acquisitionMethod: "pos_sync",
              enrichmentStatus: "minimal",
              enrichmentScore: 30,
            },
          });
        }
        masterBySlug.set(slug, master);

        const inv = await tx.pharmacyInventory.create({
          data: {
            pharmacyId,
            medicationMasterId: master.id,
            slug,
            sku: m.sku?.trim() || null,
            price: m.price,
            currentStock: 0,
            lowStockThreshold: m.lowStockThreshold,
            overTheCounter: m.overTheCounter,
            publicListing: m.publicListing,
            prescriptionRequired: m.prescriptionRequired,
            active: m.active,
            branchId: branchId ?? null,
          },
        });
        let stockResult: StockResult | null = null;
        if (m.stockQty > 0) {
          stockResult = await applyStockChange(tx, {
            inventoryId: inv.id,
            quantityDelta: m.stockQty,
            reason: "pos_sync",
            notes: "POS opening stock",
            relatedType: "pos_sync",
            skipLots: true,
          });
        }
        const final = await tx.pharmacyInventory.update({
          where: { id: inv.id },
          data: { syncedAt: new Date() },
        });
        return { inventory: final, stockResult };
      });
      bySlug.set(slug, createdRow.inventory);
      if (createdRow.inventory.sku) bySku.set(createdRow.inventory.sku, createdRow.inventory);
      return {
        kind: "created",
        lowStock: m.stockQty <= m.lowStockThreshold,
        stockResult: createdRow.stockResult,
      };
    };

    // Small payloads execute inline, while the route already queues >40 rows.
    // Within this worker use bounded concurrency rather than one transaction per
    // row in a fully serial loop.
    const CHUNK = 8;
    for (let start = 0; start < medications.length; start += CHUNK) {
      const chunk = medications.slice(start, start + CHUNK);
      const outcomes = await Promise.all(chunk.map(processMedication));
      for (const outcome of outcomes) {
        if (outcome.kind === "created") { created++; upserted++; }
        else if (outcome.kind === "updated") { updated++; upserted++; }
        else if (outcome.kind === "conflict") {
          skipped++;
          if (outcome.conflictCreated) conflictCount++;
        } else skipped++;
        if (outcome.lowStock) lowStockAlerts++;
        if (outcome.stockResult) stockResults.push(outcome.stockResult);
      }
      const processed = Math.min(start + chunk.length, medications.length);
      const pct = Math.min(99, Math.round((processed / total) * 100));
      await setJobProgress(opts?.jobId, pct, {
        recordsReceived: medications.length,
        recordsUpdated: updated,
        recordsCreated: created,
        conflicts: conflictCount,
        skipped,
      });
    }

    await notifyStockThresholds(stockResults);
    if (lowStockAlerts > 0) {
      await recordAdminNotification({
        type: "stock_low",
        title: `${lowStockAlerts} medications are low on stock`,
        body: `${lowStockAlerts} successfully synced POS rows are at or below their low-stock threshold.`,
        severity: "warning",
        relatedType: "medication",
      });
    }
    await recordIntegrationHealth(pharmacyId, "pos", true);
    const result: PosSyncResult = {
      ok: true,
      upserted,
      created,
      updated,
      skipped,
      lowStockAlerts,
      conflicts: conflictCount,
      progress: 100,
    };
    await setJobProgress(opts?.jobId, 100, result);
    return result;
  });
}

export async function resolveInventoryConflict(
  conflictId: string,
  action: "accept_pos" | "accept_platform" | "ignore",
  actorId?: string | null,
  opts?: { expectedVersion?: number; force?: boolean },
) {
  const row = await prismaUnscoped.inventorySyncConflict.findUnique({ where: { id: conflictId } });
  if (!row || row.status !== "open") throw new Error("conflict_not_found");

  return withPharmacy(row.pharmacyId, async () => {
    const currentInventory = await prismaUnscoped.pharmacyInventory.findUnique({
      where: { id: row.inventoryId },
      select: { id: true, version: true, currentStock: true },
    });
    if (!currentInventory) throw new Error("inventory_item_not_found");

    const expectedVersion = opts?.expectedVersion ?? row.platformVersion;
    if (
      !opts?.force &&
      (currentInventory.version !== expectedVersion || currentInventory.currentStock !== row.platformStock)
    ) {
      throw new Error(
        "CONFLICT_STATE_CHANGED: Inventory changed after this conflict was detected. Refresh conflict details before resolving.",
      );
    }

    if (action === "accept_pos") {
      const { setAbsoluteStock } = await import("@/app/lib/services/stock");
      await prismaUnscoped.$transaction(async (tx) => {
        await setAbsoluteStock(tx, {
          inventoryId: row.inventoryId,
          newStock: row.posStock,
          reason: "pos_sync",
          notes: "Conflict resolved: accept POS",
          relatedType: "pos_conflict",
          relatedId: row.id,
          actorId: actorId ?? null,
        });
        await tx.pharmacyInventory.update({
          where: { id: row.inventoryId },
          data: { version: { increment: 1 }, syncedAt: new Date() },
        });
      });
    } else if (action === "accept_platform") {
      // Choosing platform acknowledges the local value as the new reconciliation
      // baseline so the exact same historical local movement does not reopen the
      // conflict on the next pull.
      await prismaUnscoped.pharmacyInventory.update({
        where: { id: row.inventoryId },
        data: { version: { increment: 1 }, syncedAt: new Date() },
      });
    }

    return prismaUnscoped.inventorySyncConflict.update({
      where: { id: row.id },
      data: {
        status:
          action === "accept_pos"
            ? "accepted_pos"
            : action === "accept_platform"
              ? "accepted_platform"
              : "ignored",
        resolvedAt: new Date(),
        resolvedById: actorId ?? null,
      },
    });
  });
}
