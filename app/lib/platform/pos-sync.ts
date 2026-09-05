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
  const existing = await prismaUnscoped.inventorySyncConflict.findFirst({
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

  const conflict = await prismaUnscoped.inventorySyncConflict.create({
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
}

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

    for (let i = 0; i < medications.length; i++) {
      const m = medications[i];
      const slug = normalizedSlug(m);
      const existing = m.sku
        ? await prismaUnscoped.pharmacyInventory.findFirst({ where: { pharmacyId, sku: m.sku } })
        : await prismaUnscoped.pharmacyInventory.findFirst({ where: { pharmacyId, slug } });

      if (existing) {
        const versionConflict = m.version != null && existing.version > m.version;
        const stockConflict = existing.currentStock !== m.stockQty;

        if (versionConflict || stockConflict) {
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
          if (recorded.created) conflictCount++;

          // A conflict means "decision pending". Do not overwrite either stock
          // or metadata/version, otherwise the later resolver acts on stale state.
          skipped++;
        } else {
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
                syncedAt: new Date(),
                version: { increment: 1 },
                branchId: branchId ?? existing.branchId,
              },
            });
            return setAbsoluteStock(tx, {
              inventoryId: existing.id,
              newStock: m.stockQty,
              reason: "pos_sync",
              notes: "POS absolute stock sync",
              relatedType: "pos_sync",
            });
          });
          stockResults.push(stockResult);
          updated++;
          upserted++;
        }
      } else {
        await prismaUnscoped.$transaction(async (tx) => {
          // Reuse the shared medication master whenever a normalized identity
          // already exists. POS identity belongs on inventory/SKU, not in a
          // duplicate global medication record.
          let master = await tx.medicationMaster.findFirst({
            where: {
              OR: [
                { slug },
                { name: { equals: m.name, mode: "insensitive" } },
              ],
            },
            orderBy: { createdAt: "asc" },
          });

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

          const inv = await tx.pharmacyInventory.create({
            data: {
              pharmacyId,
              medicationMasterId: master.id,
              slug,
              sku: m.sku || null,
              price: m.price,
              currentStock: 0,
              lowStockThreshold: m.lowStockThreshold,
              overTheCounter: m.overTheCounter,
              publicListing: m.publicListing,
              prescriptionRequired: m.prescriptionRequired,
              active: m.active,
              syncedAt: new Date(),
              branchId: branchId ?? null,
            },
          });
          if (m.stockQty > 0) {
            const stockResult = await applyStockChange(tx, {
              inventoryId: inv.id,
              quantityDelta: m.stockQty,
              reason: "pos_sync",
              notes: "POS opening stock",
              relatedType: "pos_sync",
              skipLots: true,
            });
            stockResults.push(stockResult);
          }
        });
        created++;
        upserted++;
      }

      if (m.stockQty <= m.lowStockThreshold) lowStockAlerts++;
      const pct = Math.min(99, Math.round(((i + 1) / total) * 100));
      if ((i + 1) % 10 === 0 || i === medications.length - 1) {
        await setJobProgress(opts?.jobId, pct, {
          recordsReceived: medications.length,
          recordsUpdated: updated,
          recordsCreated: created,
          conflicts: conflictCount,
          skipped,
        });
      }
    }

    await notifyStockThresholds(stockResults);
    if (lowStockAlerts > 0) {
      await recordAdminNotification({
        type: "stock_low",
        title: `${lowStockAlerts} medications are low on stock`,
        body: `${lowStockAlerts} synced POS rows are at or below their low-stock threshold.`,
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
    if (!opts?.force && currentInventory.version !== expectedVersion) {
      throw new Error(
        `CONFLICT_VERSION_MISMATCH: Inventory version has changed from ${expectedVersion} to ${currentInventory.version} since conflict was detected. Refresh conflict details before resolving.`,
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
      await prismaUnscoped.pharmacyInventory.update({
        where: { id: row.inventoryId },
        data: { version: { increment: 1 } },
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
