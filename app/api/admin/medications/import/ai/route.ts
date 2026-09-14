import { NextResponse } from "next/server";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
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

  const [dosageForm, route, pregnancyCategory, manufacturer] = await Promise.all([
    data.dosageForm
      ? prisma.medicationLookup.findFirst({ where: { kind: "dosage_form", value: { equals: data.dosageForm, mode: "insensitive" } }, select: { id: true } })
      : Promise.resolve(null),
    data.route
      ? prisma.medicationLookup.findFirst({ where: { kind: "route", value: { equals: data.route, mode: "insensitive" } }, select: { id: true } })
      : Promise.resolve(null),
    data.pregnancyCategory
      ? prisma.medicationLookup.findFirst({ where: { kind: "pregnancy_category", value: { equals: data.pregnancyCategory, mode: "insensitive" } }, select: { id: true } })
      : Promise.resolve(null),
    data.manufacturer
      ? prisma.manufacturer.upsert({
          where: { name: data.manufacturer },
          create: { name: data.manufacturer, active: true },
          update: {},
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

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
    dosageFormId: dosageForm?.id ?? null,
    routeId: route?.id ?? null,
    pregnancyCategoryId: pregnancyCategory?.id ?? null,
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
  const validation = await validateMedication(
    {
      id: exactSharedMatch?.id,
      name: data.name,
      genericName: data.genericName,
      brandName: data.brandName ?? null,
      strengthValue: data.strengthValue ?? null,
      strengthUnit: data.strengthUnit ?? null,
      strengthDisplay: data.strengthDisplay ?? null,
      dosageFormId: dosageForm?.id ?? null,
      routeId: route?.id ?? null,
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
  );

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
    const result = await createOrReuseMedicationForPharmacy(sharedInput, {
      slug: medicationSlug(data.name),
      price: 0,
      currentStock: 0,
      lowStockThreshold: 10,
      overTheCounter: false,
      prescriptionRequired: true,
      publicListing: false,
      active: true,
    });

    await writeAuditLog(
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
    );

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
