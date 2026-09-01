import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { recordIntegrationHealth } from "@/app/lib/platform/integrations";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";

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

export async function runPosSync(pharmacyId: string, medications: PosMedication[], branchId?: string | null) {
  return withPharmacy(pharmacyId, async () => {
    const { setAbsoluteStock, applyStockChange, notifyStockThresholds } = await import(
      "@/app/lib/services/stock"
    );
    type StockResult = Awaited<ReturnType<typeof setAbsoluteStock>>;
    const stockResults: StockResult[] = [];
    let upserted = 0;
    let skipped = 0;
    let lowStockAlerts = 0;
    const conflicts: Array<{ sku?: string; inventoryId?: string; platform: number; pos: number }> = [];

    for (const m of medications) {
      const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = m.sku
        ? await prismaUnscoped.pharmacyInventory.findFirst({ where: { pharmacyId, sku: m.sku } })
        : await prismaUnscoped.pharmacyInventory.findFirst({ where: { pharmacyId, slug } });

      if (existing) {
        if (m.version != null && existing.version > m.version) {
          skipped++;
          conflicts.push({ sku: m.sku, inventoryId: existing.id, platform: existing.currentStock, pos: m.stockQty });
          continue;
        }
        const stockResult = await prismaUnscoped.$transaction(async (tx) => {
          await tx.pharmacyInventory.update({
            where: { id: existing.id },
            data: {
              price: m.price,
              lowStockThreshold: m.lowStockThreshold,
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
        if (existing.currentStock !== m.stockQty) {
          conflicts.push({ sku: m.sku, inventoryId: existing.id, platform: existing.currentStock, pos: m.stockQty });
        }
      } else {
        await prismaUnscoped.$transaction(async (tx) => {
          const master = await tx.medicationMaster.create({
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
      }
      upserted++;
      if (m.stockQty <= m.lowStockThreshold) lowStockAlerts++;
    }

    await notifyStockThresholds(stockResults);
    if (lowStockAlerts > 0) {
      await recordAdminNotification({
        type: "stock_low",
        title: `${lowStockAlerts} medications are low on stock`,
        body: `${lowStockAlerts} of ${upserted} synced medications are at or below their low-stock threshold.`,
        severity: "warning",
        relatedType: "medication",
      });
    }
    await recordIntegrationHealth(pharmacyId, "pos", true);
    return { ok: true as const, upserted, skipped, lowStockAlerts, conflicts };
  });
}
