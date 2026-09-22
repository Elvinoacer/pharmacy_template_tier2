import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AuthError, getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { withPharmacy } from "@/app/lib/tenant-context";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";
import { prisma } from "@/app/lib/db";
import { MedicationAiSchema } from "@/app/lib/medication-ai-schema";
import { validateMedication } from "@/app/lib/services/medication-validation";
import {
  createOrReuseMedicationForPharmacy,
  findSharedMedicationMatch,
  medicationSlug,
  type SharedMedicationMasterInput,
} from "@/app/lib/services/shared-medication-library";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
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

  if (!user.platformAdmin) {
    const allowed = await isFeatureEnabled(pharmacyId, "ai_import");
    if (!allowed) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message: "AI-assisted import is part of Premium (KES 500/month). You can still add medicines manually or from the shared library on the free plan.",
        },
        { status: 402 },
      );
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "The pasted medication data is not valid JSON. Check the format and try again." },
      { status: 400 },
    );
  }

  const parsed = MedicationAiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_medication_data",
        message: "Some medication details are missing or invalid. Review the highlighted fields and try again.",
        issues: parsed.error.issues.slice(0, 20).map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const { findOrCreateLookup } = await import("@/app/lib/medication-lookups");
  const dosageFormId = await findOrCreateLookup("dosage_form", data.dosageForm || "Tablet");
  const routeId = data.route ? await findOrCreateLookup("route", data.route) : null;
  const pregnancyCategoryId = data.pregnancyCategory
    ? await findOrCreateLookup("pregnancy_category", data.pregnancyCategory)
    : null;

  const manufacturer = data.manufacturer
    ? await prisma.manufacturer.upsert({
        where: { name: data.manufacturer },
        create: { name: data.manufacturer, active: true },
        update: {},
        select: { id: true },
      })
    : null;

  const activeIngredientIds: string[] = [];
  for (const name of data.activeIngredients || []) {
    const ingredient = await prisma.activeIngredient.upsert({
      where: { name },
      create: { name, active: true },
      update: {},
      select: { id: true },
    });
    activeIngredientIds.push(ingredient.id);
  }

  const clinicalTagIds: string[] = [];
  for (const name of data.clinicalTags || []) {
    const slug = medicationSlug(name);
    const tag = await prisma.clinicalTag.upsert({
      where: { name },
      create: { name, slug, active: true },
      update: {},
      select: { id: true },
    });
    clinicalTagIds.push(tag.id);
  }

  const sharedInput: SharedMedicationMasterInput = {
    name: data.name,
    slug: medicationSlug(data.name),
    genericName: data.genericName,
    brandName: data.brandName ?? null,
    strengthValue: data.strengthValue ?? null,
    strengthUnit: data.strengthUnit ?? null,
    strengthDisplay: data.strengthDisplay ?? null,
    packSize: data.packSize ?? null,
    dosageFormId: dosageFormId ?? null,
    routeId: routeId ?? null,
    pregnancyCategoryId: pregnancyCategoryId ?? null,
    manufacturerId: manufacturer?.id ?? null,
    countryOfOrigin: data.countryOfOrigin ?? null,
    barcode: data.barcode ?? null,
    category: data.category ?? "general",
    description: data.description ?? null,
    indications: data.indications ?? null,
    dosage: data.dosage ?? null,
    sideEffects: data.sideEffects ?? null,
    contraindications: data.contraindications ?? null,
    storage: data.storage ?? null,
    clinicalNotes: data.clinicalNotes ?? null,
    controlledDrug: data.controlledDrug ?? false,
    controlledDrugSchedule: data.controlledDrugSchedule ?? null,
    pediatricUse: data.pediatricUse ?? false,
    requiresRefrigeration: data.requiresRefrigeration ?? false,
    acquisitionMethod: "ai_import",
    activeIngredientIds,
    clinicalTagIds,
  };

  const exactSharedMatch = await findSharedMedicationMatch(sharedInput);
  const validation = await withPharmacy(pharmacyId, () => validateMedication(
    {
      id: exactSharedMatch?.id,
      name: data.name,
      genericName: data.genericName,
      brandName: data.brandName ?? null,
      strengthValue: data.strengthValue ?? null,
      strengthUnit: data.strengthUnit ?? null,
      strengthDisplay: data.strengthDisplay ?? null,
      dosageFormId: dosageFormId ?? null,
      routeId: routeId ?? null,
      barcode: data.barcode ?? null,
      controlledDrug: data.controlledDrug ?? false,
      controlledDrugSchedule: data.controlledDrugSchedule ?? null,
    },
    {
      medicationMasterId: exactSharedMatch?.id,
      slug: medicationSlug(data.name),
      price: 0,
      overTheCounter: false,
      prescriptionRequired: true,
    },
    { existingMasterId: exactSharedMatch?.id },
  ));

  if (validation.counts.fail > 0) {
    return NextResponse.json(
      {
        ok: false,
        validation,
        error: "validation_failed",
        message: "This medication needs review before it can be added. Resolve the failed checks and try again.",
      },
      { status: 422 },
    );
  }

  try {
    const result = await withPharmacy(pharmacyId, () => createOrReuseMedicationForPharmacy(sharedInput, {
      slug: medicationSlug(data.name),
      price: 0,
      currentStock: 0,
      lowStockThreshold: 10,
      overTheCounter: false,
      prescriptionRequired: true,
      publicListing: false,
      active: true,
    }));

    await withPharmacy(pharmacyId, () => writeAuditLog(
      user.id,
      result.masterCreated ? "shared_medication_created" : "shared_medication_reused",
      "medication_master",
      result.masterId,
      {
        inventoryId: result.inventoryId,
        acquisitionMethod: "ai_import",
        matchReason: result.matchReason,
        alreadyStocked: result.alreadyStocked,
        enrichmentScore: result.enrichmentScore,
      },
    ));

    revalidatePath("/admin/medications");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/medications/library");

    return NextResponse.json({
      ok: true,
      masterId: result.masterId,
      inventoryId: result.inventoryId,
      masterCreated: result.masterCreated,
      reusedSharedMaster: !result.masterCreated,
      alreadyStocked: result.alreadyStocked,
      matchReason: result.matchReason,
      enrichmentScore: result.enrichmentScore,
      enrichmentStatus: result.enrichmentStatus,
      validation,
      redirectTo: `/admin/medications/${result.inventoryId}`,
    });
  } catch (error) {
    console.error("[ai import POST]", error);
    return NextResponse.json(
      {
        error: "create_failed",
        message: "We couldn't save this medication right now. Your existing inventory was not changed. Please try again.",
      },
      { status: 500 },
    );
  }
}
