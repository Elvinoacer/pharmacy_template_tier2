import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { findExistingMaster, computeEnrichmentScore } from "@/app/lib/services/medication-validation";

export const runtime = "nodejs";

/**
 * Phase 3.4 — CSV / Excel import execution endpoint.
 * Receives mapped rows (already column-mapped by the client), runs each through:
 *   1. findExistingMaster (Decision D19) — match by barcode | generic+strength+form | name.
 *   2. If matched → create PharmacyInventory only.
 *   3. If unmatched → create MedicationMaster (enrichmentStatus='minimal') + PharmacyInventory.
 *   4. Flag missing-clinical-fields rows for enrichment (Phase 5).
 *
 * This endpoint receives already-parsed JSON rows — the client did the file parsing
 * and column mapping. We just execute the import.
 */

const ImportRow = z.object({
  name: z.string().min(1),
  genericName: z.string().optional().default(""),
  brandName: z.string().optional().nullable(),
  strengthDisplay: z.string().optional().nullable(),
  dosageForm: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional().default("general"),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  price: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  sku: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  overTheCounter: z.coerce.boolean().optional().default(false),
  prescriptionRequired: z.coerce.boolean().optional().default(true),
  publicListing: z.coerce.boolean().optional().default(false),
});

const Body = z.object({
  rows: z.array(ImportRow).min(1).max(500),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid_body", message: e instanceof Error ? e.message : "Invalid body." }, { status: 400 });
  }

  const summary = {
    matched: 0,
    created: 0,
    flagged: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  try {
    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      try {
        const genericName = row.genericName || row.name.split(" ")[0] || row.name;

        // Resolve dosage form name → id (create-or-find).
        let dosageFormId: string | null = null;
        if (row.dosageForm) {
          const df = await prisma.medicationLookup.findFirst({
            where: { kind: "dosage_form", value: { equals: row.dosageForm, mode: "insensitive" } },
            select: { id: true },
          });
          dosageFormId = df?.id ?? null;
        }

        // Match-first (Decision D19).
        const existing = await findExistingMaster({
          barcode: row.barcode,
          genericName,
          name: row.name,
          strengthDisplay: row.strengthDisplay,
          dosageFormId,
        });

        const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const otc = row.overTheCounter;
        const rx = otc ? false : row.prescriptionRequired;

        if (existing) {
          // Create PharmacyInventory only.
          await prisma.pharmacyInventory.create({
            data: {
              medicationMasterId: existing.id,
              slug,
              sku: row.sku || null,
              price: row.price,
              currentStock: row.currentStock,
              lowStockThreshold: row.lowStockThreshold,
              supplier: row.supplier || null,
              overTheCounter: otc,
              prescriptionRequired: rx,
              publicListing: row.publicListing,
              active: true,
            },
          });
          summary.matched++;
        } else {
          // Create MedicationMaster + PharmacyInventory.
          let manufacturerId: string | null = null;
          if (row.manufacturer) {
            const mfr = await prisma.manufacturer.upsert({
              where: { name: row.manufacturer },
              create: { name: row.manufacturer, active: true },
              update: {},
              select: { id: true },
            });
            manufacturerId = mfr.id;
          }

          const enrichment = computeEnrichmentScore({
            genericName,
            activeIngredients: [],
            strengthDisplay: row.strengthDisplay,
            dosageFormId,
            indications: null,
            sideEffects: null,
            contraindications: null,
            manufacturerId,
            barcode: row.barcode,
            imageUrl: null,
          });

          const master = await prisma.medicationMaster.create({
            data: {
              name: row.name,
              slug,
              genericName,
              brandName: row.brandName || null,
              strengthDisplay: row.strengthDisplay || null,
              dosageFormId,
              manufacturerId,
              barcode: row.barcode || null,
              category: row.category || "general",
              description: row.description || null,
              acquisitionMethod: "csv_import",
              enrichmentStatus: enrichment.status,
              enrichmentScore: enrichment.score,
              enrichedAt: enrichment.status === "complete" ? new Date() : null,
            },
          });

          await prisma.pharmacyInventory.create({
            data: {
              medicationMasterId: master.id,
              slug,
              sku: row.sku || null,
              price: row.price,
              currentStock: row.currentStock,
              lowStockThreshold: row.lowStockThreshold,
              supplier: row.supplier || null,
              overTheCounter: otc,
              prescriptionRequired: rx,
              publicListing: row.publicListing,
              active: true,
            },
          });

          summary.created++;
          if (enrichment.status !== "complete") summary.flagged++;
        }
      } catch (e) {
        summary.errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error.",
        });
      }
    }

    await writeAuditLog(user.id, "medication_csv_import", "medication_master", undefined, {
      matched: summary.matched,
      created: summary.created,
      flagged: summary.flagged,
      errors: summary.errors.length,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[csv import POST]", e);
    return NextResponse.json({ error: "import_failed", message: e instanceof Error ? e.message : "Import failed." }, { status: 500 });
  }
}
