import { NextResponse } from "next/server";
import { AuthError, getSessionUser, isStaff } from "@/app/lib/auth";
import { requireMedicationWriteContext } from "@/app/lib/services/medication-access";
import { withPharmacy } from "@/app/lib/tenant-context";
import { parseMedicationFormData } from "@/app/lib/services/medication-form-data";
import { validateMedication } from "@/app/lib/services/medication-validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (!isStaff(user.role) && !user.platformAdmin)) {
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to validate medications." },
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
    return NextResponse.json(
      { error: "forbidden", message: "You do not have permission to change this pharmacy inventory." },
      { status },
    );
  }

  try {
    const formData = await req.formData();
    const parsed = parseMedicationFormData(formData);
    const inventoryId = String(formData.get("inventoryId") || "") || undefined;
    const masterId = String(formData.get("masterId") || "") || undefined;

    const result = await withPharmacy(pharmacyId, () => validateMedication(
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
    ));

    return NextResponse.json({ ok: true, validation: result });
  } catch (e) {
    console.error("[validate POST]", e);
    return NextResponse.json(
      {
        error: "invalid_medication",
        message: "We couldn't validate these medication details. Review the required fields and try again.",
      },
      { status: 400 },
    );
  }
}
