import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  createOrReuseMedicationForPharmacy,
  medicationSlug,
  type SharedMedicationMasterInput,
} from "@/app/lib/services/shared-medication-library";

export const runtime = "nodejs";

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

/**
 * Bulk acquisition uses exactly the same canonical library decision as manual
 * entry and AI import. Every row either reuses a MedicationMaster or contributes
 * one new shared master; price/stock/SKU remain pharmacy-specific inventory data.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: "invalid_body", message: error instanceof Error ? error.message : "Invalid body." },
      { status: 400 },
    );
  }

  const summary = {
    matched: 0,
    created: 0,
    alreadyStocked: 0,
    flagged: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    try {
      // Do not invent a generic/INN for a genuinely new shared medicine. A row
      // without one may still match an existing master by barcode/name; otherwise
      // the service returns a clear row-level error for the pharmacy to correct.
      const genericName = row.genericName.trim();
      let dosageFormId: string | null = null;
      if (row.dosageForm) {
        const dosageForm = await prisma.medicationLookup.findFirst({
          where: { kind: "dosage_form", value: { equals: row.dosageForm, mode: "insensitive" } },
          select: { id: true },
        });
        dosageFormId = dosageForm?.id ?? null;
      }

      let manufacturerId: string | null = null;
      if (row.manufacturer) {
        const manufacturer = await prisma.manufacturer.upsert({
          where: { name: row.manufacturer },
          create: { name: row.manufacturer, active: true },
          update: {},
          select: { id: true },
        });
        manufacturerId = manufacturer.id;
      }

      const slug = medicationSlug(row.name);
      const sharedInput: SharedMedicationMasterInput = {
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
      };

      const result = await createOrReuseMedicationForPharmacy(sharedInput, {
        slug,
        sku: row.sku || null,
        price: row.price,
        currentStock: row.currentStock,
        lowStockThreshold: row.lowStockThreshold,
        supplier: row.supplier || null,
        overTheCounter: row.overTheCounter,
        prescriptionRequired: row.prescriptionRequired,
        publicListing: row.publicListing,
        active: true,
      });

      if (result.masterCreated) {
        summary.created++;
        if (result.enrichmentStatus !== "complete") summary.flagged++;
      } else {
        summary.matched++;
      }
      if (result.alreadyStocked) summary.alreadyStocked++;
    } catch (error) {
      summary.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  await writeAuditLog(user.id, "medication_csv_import", "medication_master", undefined, {
    matched: summary.matched,
    created: summary.created,
    alreadyStocked: summary.alreadyStocked,
    flagged: summary.flagged,
    errors: summary.errors.length,
    sharedLibrary: true,
  });

  return NextResponse.json({ ok: true, ...summary });
}
