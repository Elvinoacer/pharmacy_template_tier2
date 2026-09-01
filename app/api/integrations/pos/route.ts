import { NextResponse } from "next/server";
import { z } from "zod";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { authenticatePos, recordIntegrationHealth } from "@/app/lib/platform/integrations";
import { beginIdempotent, completeIdempotent } from "@/app/lib/platform/idempotency";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";

export const runtime = "nodejs";

const MedicationInput = z.object({
  sku: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  category: z.string().default("general"),
  description: z.string().optional(),
  indications: z.string().optional(),
  dosage: z.string().optional(),
  sideEffects: z.string().optional(),
  contraindications: z.string().optional(),
  storage: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  stockQty: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  imageUrl: z.string().optional(),
  overTheCounter: z.boolean().default(false),
  publicListing: z.boolean().default(false),
  prescriptionRequired: z.boolean().default(true),
  active: z.boolean().default(true),
  version: z.coerce.number().int().optional(),
});

const Body = z.object({
  tenant: z.string().optional(),
  branchId: z.string().uuid().optional(),
  medications: z.array(MedicationInput).min(1).max(200),
});

export async function POST(req: Request) {
  const auth = await authenticatePos(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", detail: e instanceof Error ? e.message : undefined }, { status: 400 });
  }

  if (parsed.tenant && parsed.tenant !== auth.pharmacyId) {
    return NextResponse.json({ error: "tenant_mismatch" }, { status: 403 });
  }

  if (idempotencyKey) {
    const gate = await beginIdempotent({
      pharmacyId: auth.pharmacyId,
      key: idempotencyKey,
      method: "POST",
      path: "/api/integrations/pos",
      body: parsed,
    });
    if (gate.conflict) return NextResponse.json({ error: "idempotency_conflict" }, { status: 409 });
    if (gate.replay) {
      return NextResponse.json(gate.replay.responseBody ?? { ok: true }, { status: gate.replay.responseCode ?? 200 });
    }
  }

  const result = await withPharmacy(auth.pharmacyId, async () => {
    const { setAbsoluteStock, applyStockChange, notifyStockThresholds } = await import(
      "@/app/lib/services/stock"
    );
    type StockResult = Awaited<ReturnType<typeof setAbsoluteStock>>;
    const stockResults: StockResult[] = [];
    let upserted = 0;
    let skipped = 0;
    let lowStockAlerts = 0;
    const conflicts: Array<{ sku?: string; platform: number; pos: number }> = [];

    for (const m of parsed.medications) {
      const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existing = m.sku
        ? await prismaUnscoped.pharmacyInventory.findFirst({
            where: { pharmacyId: auth.pharmacyId, sku: m.sku },
          })
        : await prismaUnscoped.pharmacyInventory.findFirst({
            where: { pharmacyId: auth.pharmacyId, slug },
          });

      if (existing) {
        if (m.version != null && existing.version > m.version) {
          skipped++;
          conflicts.push({ sku: m.sku, platform: existing.currentStock, pos: m.stockQty });
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
              branchId: parsed.branchId ?? existing.branchId,
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
          conflicts.push({ sku: m.sku, platform: existing.currentStock, pos: m.stockQty });
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
              pharmacyId: auth.pharmacyId,
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
              branchId: parsed.branchId ?? null,
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

    await recordIntegrationHealth(auth.pharmacyId, "pos", true);
    return { ok: true, upserted, skipped, lowStockAlerts, conflicts };
  });

  const headerKey = req.headers.get("idempotency-key")?.trim();
  if (headerKey) {
    const gate = await beginIdempotent({
      pharmacyId: auth.pharmacyId,
      key: headerKey,
      method: "POST",
      path: "/api/integrations/pos",
      body: parsed,
    });
    if (gate.pending) await completeIdempotent(gate.pending.id, 200, result);
  }

  return NextResponse.json(result);
}
