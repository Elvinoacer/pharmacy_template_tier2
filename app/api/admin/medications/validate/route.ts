import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { parseMedicationFormData } from "@/app/lib/services/medication-form-data";
import { validateMedication } from "@/app/lib/services/medication-validation";

export const runtime = "nodejs";

/**
 * Phase 4 validate endpoint — called by the medication form's review-before-save step.
 * Takes form data, runs the shared validation service, returns the structured result
 * (pass/flag/fail per rule) WITHOUT saving anything.
 *
 * Used by the MedicationForm client component to show a review modal before final submit.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const parsed = parseMedicationFormData(formData);
    const inventoryId = String(formData.get("inventoryId") || "") || undefined;
    const masterId = String(formData.get("masterId") || "") || undefined;

    const result = await validateMedication(
      {
        id: masterId,
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
        id: inventoryId,
        medicationMasterId: masterId,
        slug: parsed.inventory.slug,
        sku: parsed.inventory.sku,
        price: parsed.inventory.price,
        overTheCounter: parsed.inventory.overTheCounter,
        prescriptionRequired: parsed.inventory.prescriptionRequired,
      },
      { existingMasterId: masterId, existingInventoryId: inventoryId },
    );

    return NextResponse.json({ ok: true, validation: result });
  } catch (e) {
    console.error("[validate POST]", e);
    return NextResponse.json({ error: "invalid_body", message: e instanceof Error ? e.message : "Parse failed." }, { status: 400 });
  }
}
