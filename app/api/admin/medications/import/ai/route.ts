import { NextResponse } from "next/server";
import { getSessionUser, isStaff, writeAuditLog } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { MedicationAiSchema } from "@/app/lib/medication-ai-schema";
import { validateMedication, computeEnrichmentScore } from "@/app/lib/services/medication-validation";

export const runtime = "nodejs";

/**
 * Phase 3.3 — AI-Assisted Import endpoint.
 * Takes the parsed AI JSON, resolves lookup names → IDs, validates, creates
 * MedicationMaster + PharmacyInventory. Provider-agnostic (no AI API calls here —
 * the admin did the AI interaction externally).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = MedicationAiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "schema_validation_failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Resolve lookup names → IDs (create-or-find for manufacturer, active ingredients, clinical tags).
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
    const ai = await prisma.activeIngredient.upsert({
      where: { name },
      create: { name, active: true },
      update: {},
      select: { id: true },
    });
    activeIngredientIds.push(ai.id);
  }

  const clinicalTagIds: string[] = [];
  for (const name of data.clinicalTags || []) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tag = await prisma.clinicalTag.upsert({
      where: { name },
      create: { name, slug, active: true },
      update: {},
      select: { id: true },
    });
    clinicalTagIds.push(tag.id);
  }

  const candidateMaster = {
    name: data.name,
    genericName: data.genericName,
    brandName: data.brandName ?? null,
    barcode: data.barcode ?? null,
    dosageFormId: dosageForm?.id ?? null,
    routeId: route?.id ?? null,
    pregnancyCategoryId: pregnancyCategory?.id ?? null,
    manufacturerId: manufacturer?.id ?? null,
    controlledDrug: data.controlledDrug ?? false,
    controlledDrugSchedule: data.controlledDrugSchedule ?? null,
  };

  const validation = await validateMedication(candidateMaster, {
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    price: 0, // filled in the review step
  });

  if (validation.counts.fail > 0) {
    return NextResponse.json({ ok: false, validation, error: "Validation failed." }, { status: 422 });
  }

  const enrichment = computeEnrichmentScore({
    genericName: data.genericName,
    activeIngredients: activeIngredientIds,
    strengthDisplay: data.strengthDisplay,
    dosageFormId: dosageForm?.id,
    routeId: route?.id,
    indications: data.indications,
    sideEffects: data.sideEffects,
    contraindications: data.contraindications,
    manufacturerId: manufacturer?.id,
    pregnancyCategoryId: pregnancyCategory?.id,
    barcode: data.barcode,
  });

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const master = await tx.medicationMaster.create({
        data: {
          name: data.name,
          slug,
          genericName: data.genericName,
          brandName: data.brandName ?? null,
          strengthValue: data.strengthValue ?? null,
          strengthUnit: data.strengthUnit ?? null,
          strengthDisplay: data.strengthDisplay ?? null,
          packSize: data.packSize ?? null,
          dosageFormId: dosageForm?.id,
          routeId: route?.id,
          pregnancyCategoryId: pregnancyCategory?.id,
          manufacturerId: manufacturer?.id,
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
          enrichmentStatus: enrichment.status,
          enrichmentScore: enrichment.score,
          enrichedAt: enrichment.status === "complete" ? new Date() : null,
          acquisitionMethod: "ai_import",
        },
      });

      if (activeIngredientIds.length > 0) {
        await tx.medicationActiveIngredient.createMany({
          data: activeIngredientIds.map((id) => ({ medicationMasterId: master.id, activeIngredientId: id })),
          skipDuplicates: true,
        });
      }
      if (clinicalTagIds.length > 0) {
        await tx.medicationClinicalTag.createMany({
          data: clinicalTagIds.map((id) => ({ medicationMasterId: master.id, clinicalTagId: id })),
          skipDuplicates: true,
        });
      }

      const inventory = await tx.pharmacyInventory.create({
        data: {
          medicationMasterId: master.id,
          slug,
          price: 0,
          currentStock: 0,
          lowStockThreshold: 10,
          overTheCounter: false,
          prescriptionRequired: true,
          publicListing: false,
          active: true,
        },
      });

      return { master, inventory };
    });

    await writeAuditLog(user.id, "medication_created", "medication_master", result.master.id, {
      inventoryId: result.inventory.id,
      acquisitionMethod: "ai_import",
      enrichmentScore: enrichment.score,
    });

    return NextResponse.json({
      ok: true,
      masterId: result.master.id,
      inventoryId: result.inventory.id,
      enrichmentScore: enrichment.score,
      enrichmentStatus: enrichment.status,
      validation,
      redirectTo: `/admin/medications/${result.inventory.id}`,
    });
  } catch (e) {
    console.error("[ai import POST]", e);
    return NextResponse.json({ error: "create_failed", message: e instanceof Error ? e.message : "Could not save medication." }, { status: 500 });
  }
}
