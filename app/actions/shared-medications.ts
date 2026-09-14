"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, requireStaff, writeAuditLog } from "@/app/lib/auth";
import { assertPharmacyWorkspaceOperable } from "@/app/lib/platform/tenant-access";
import { parseMedicationFormData } from "@/app/lib/services/medication-form-data";
import { validateMedication } from "@/app/lib/services/medication-validation";
import {
  createOrReuseMedicationForPharmacy,
  findSharedMedicationMatch,
  type SharedMedicationMasterInput,
} from "@/app/lib/services/shared-medication-library";

export type SharedMedicationActionState = {
  error?: string;
  success?: string;
  needsConfirmation?: boolean;
  validation?: Record<string, unknown>;
};

function masterInput(parsed: ReturnType<typeof parseMedicationFormData>): SharedMedicationMasterInput {
  return {
    name: parsed.master.name,
    slug: parsed.master.slug,
    genericName: parsed.master.genericName,
    brandName: parsed.master.brandName,
    strengthValue: parsed.master.strengthValue,
    strengthUnit: parsed.master.strengthUnit,
    strengthDisplay: parsed.master.strengthDisplay,
    packSize: parsed.master.packSize,
    dosageFormId: parsed.master.dosageFormId,
    routeId: parsed.master.routeId,
    pregnancyCategoryId: parsed.master.pregnancyCategoryId,
    manufacturerId: parsed.master.manufacturerId,
    countryOfOrigin: parsed.master.countryOfOrigin,
    barcode: parsed.master.barcode,
    category: parsed.master.category,
    description: parsed.master.description,
    indications: parsed.master.indications,
    dosage: parsed.master.dosage,
    sideEffects: parsed.master.sideEffects,
    contraindications: parsed.master.contraindications,
    storage: parsed.master.storage,
    clinicalNotes: parsed.master.clinicalNotes,
    imageUrl: parsed.master.imageUrl,
    imageUrls: parsed.master.imageUrls,
    alternativeIds: parsed.master.alternativeIds,
    controlledDrug: parsed.master.controlledDrug,
    controlledDrugSchedule: parsed.master.controlledDrugSchedule,
    pediatricUse: parsed.master.pediatricUse,
    requiresRefrigeration: parsed.master.requiresRefrigeration,
    acquisitionMethod: parsed.master.acquisitionMethod || "manual",
    activeIngredientIds: parsed.activeIngredientIds,
    clinicalTagIds: parsed.clinicalTagIds,
  };
}

/**
 * Manual-entry write path for the network medicine library.
 *
 * A pharmacy never blindly creates a second clinical master. We first look for
 * a strong canonical match, run the normal clinical validation/review gate, and
 * then atomically either reuse that master or create one shared master plus the
 * pharmacy's own inventory row.
 */
export async function adminCreateSharedMedicationAction(
  _prev: SharedMedicationActionState,
  formData: FormData,
): Promise<SharedMedicationActionState> {
  const user = requireStaff(await getSessionUser());
  if (!user.platformAdmin) {
    if (!user.activePharmacyId) return { error: "Choose a pharmacy first." };
    try {
      await assertPharmacyWorkspaceOperable(user.activePharmacyId);
    } catch {
      return { error: "This pharmacy workspace is paused. Restore access before changing inventory." };
    }
  }

  const parsed = parseMedicationFormData(formData);
  const confirmed = String(formData.get("confirmed") || "") === "true";

  if (!parsed.master.name) return { error: "Medication name is required." };
  if (!parsed.master.genericName) return { error: "Generic name is required." };
  if (!parsed.master.dosageFormId) return { error: "Dosage form is required." };

  const sharedInput = masterInput(parsed);
  const existing = await findSharedMedicationMatch(sharedInput);

  const validation = await validateMedication(
    {
      id: existing?.id,
      name: parsed.master.name,
      genericName: parsed.master.genericName,
      brandName: parsed.master.brandName,
      strengthValue: parsed.master.strengthValue,
      strengthUnit: parsed.master.strengthUnit,
      strengthDisplay: parsed.master.strengthDisplay,
      dosageFormId: parsed.master.dosageFormId,
      routeId: parsed.master.routeId,
      barcode: parsed.master.barcode,
      controlledDrug: parsed.master.controlledDrug,
      controlledDrugSchedule: parsed.master.controlledDrugSchedule,
      interactionIds: parsed.interactionIds,
    },
    {
      medicationMasterId: existing?.id,
      slug: parsed.inventory.slug,
      sku: parsed.inventory.sku,
      price: parsed.inventory.price,
      overTheCounter: parsed.inventory.overTheCounter,
      prescriptionRequired: parsed.inventory.prescriptionRequired,
    },
    { existingMasterId: existing?.id },
  );

  if (validation.counts.fail > 0) {
    return {
      error: validation.checks
        .filter((check) => check.severity === "fail")
        .map((check) => check.message)
        .join(" "),
      validation: validation as unknown as Record<string, unknown>,
    };
  }

  if (validation.hasIssues && !confirmed) {
    return {
      needsConfirmation: true,
      validation: validation as unknown as Record<string, unknown>,
    };
  }

  try {
    const result = await createOrReuseMedicationForPharmacy(sharedInput, parsed.inventory);

    await writeAuditLog(
      user.id,
      result.masterCreated ? "shared_medication_created" : "shared_medication_reused",
      "medication_master",
      result.masterId,
      {
        inventoryId: result.inventoryId,
        alreadyStocked: result.alreadyStocked,
        matchReason: result.matchReason,
        acquisitionMethod: parsed.master.acquisitionMethod || "manual",
        enrichmentScore: result.enrichmentScore,
      },
    );

    revalidatePath("/admin/medications");
    revalidatePath("/admin/medications/library");
    revalidatePath("/medicines");
    redirect(`/admin/medications/${result.inventoryId}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[adminCreateSharedMedicationAction]", error);
    const message = error instanceof Error ? error.message : "Could not save medication.";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      return { error: "This medicine, SKU, or barcode is already present. Search the shared library and reuse it instead." };
    }
    return { error: message };
  }
}
