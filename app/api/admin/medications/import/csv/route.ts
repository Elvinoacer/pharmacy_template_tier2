import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { withPharmacy } from "@/app/lib/tenant-context";
import { listingLimitMessage } from "@/app/lib/platform/plan-policy";
import { validateMedication } from "@/app/lib/services/medication-validation";
import { prisma } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import {
  createOrReuseMedicationForPharmacy,
  findSharedMedicationMatch,
  medicationSlug,
  type SharedMedicationMasterInput,
} from "@/app/lib/services/shared-medication-library";
import { MAX_PHARMACY_CSV_IMPORT_ROWS } from "@/app/lib/medication-import-limits";

export const runtime = "nodejs";

function csvBoolean(defaultValue: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return defaultValue;
      if (["true", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "n"].includes(normalized)) return false;
    }
    return value;
  }, z.boolean());
}

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
  overTheCounter: csvBoolean(false),
  prescriptionRequired: csvBoolean(true),
  publicListing: csvBoolean(false),
});

const Body = z.object({
  rows: z.array(ImportRow).min(1).max(MAX_PHARMACY_CSV_IMPORT_ROWS),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to import medications." },
      { status: 403 },
    );
  }

  let pharmacyId: string;
  try {
    pharmacyId = await requireMedicationWriteContext(user);
  } catch (error) {
    const status =
      error instanceof AuthError
        ? error.status
        : Number((error as { status?: number })?.status || 403);
    const code = error instanceof Error ? error.message : "forbidden";
    return NextResponse.json(
      {
        error: code,
        message:
          code === "PHARMACY_BILLING_SUSPENDED"
            ? "This pharmacy workspace is paused because billing needs attention."
            : code === "PHARMACY_WORKSPACE_PAUSED"
              ? "This pharmacy workspace is paused. Restore access before importing medicines."
              : code.includes("permission")
                ? "You do not have permission to import medicines into this inventory."
                : "Choose an active pharmacy workspace before importing medicines.",
      },
      { status },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (error) {
    const issues = error instanceof z.ZodError
      ? error.issues.slice(0, 20).map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      : undefined;
    return NextResponse.json(
      {
        error: "invalid_import",
        message: "The import contains missing or invalid fields. Fix the highlighted rows and try again.",
        issues,
      },
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

  await withPharmacy(pharmacyId, async () => {
    for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    try {
      const genericName = (row.genericName || "").trim() || row.name.trim();
      const { findOrCreateLookup } = await import("@/app/lib/medication-lookups");
      const dosageFormId = await findOrCreateLookup("dosage_form", row.dosageForm || "Tablet");

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

      const prescriptionRequired = row.overTheCounter ? false : row.prescriptionRequired;
      const existing = await findSharedMedicationMatch(sharedInput);
      const validation = await validateMedication(
        {
          id: existing?.id,
          name: row.name,
          genericName,
          brandName: row.brandName || null,
          strengthDisplay: row.strengthDisplay || null,
          dosageFormId,
          barcode: row.barcode || null,
          controlledDrug: false,
          controlledDrugSchedule: null,
        },
        {
          medicationMasterId: existing?.id,
          slug,
          sku: row.sku || null,
          price: row.price,
          overTheCounter: row.overTheCounter,
          prescriptionRequired,
        },
        { existingMasterId: existing?.id },
      );
      if (validation.counts.fail > 0) {
        throw new Error(
          validation.checks
            .filter((check) => check.severity === "fail")
            .map((check) => check.message)
            .join(" "),
        );
      }

      const result = await createOrReuseMedicationForPharmacy(sharedInput, {
        slug,
        sku: row.sku || null,
        price: row.price,
        currentStock: row.currentStock,
        lowStockThreshold: row.lowStockThreshold,
        supplier: row.supplier || null,
        overTheCounter: row.overTheCounter,
        prescriptionRequired,
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
      console.error(`[medication csv import] row ${i + 1}`, error);
      summary.errors.push({
        row: i + 1,
        message:
          listingLimitMessage(error) ||
          publicErrorMessage(
            error,
            "This row could not be imported. Review the medication details and try it again.",
          ),
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
  });

  revalidatePath("/admin/medications");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/medications/library");

  return NextResponse.json({ ok: true, ...summary });
}
