import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import { screenClinicalSafety } from "@/app/lib/services/clinical-safety";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    await requirePermission(user, "prescriptions.read");

    const body = await req.json();
    const {
      medicationId,
      medicationMasterId,
      customerId,
      guestAge,
      guestGender,
      dosage,
      schedule,
      frequency,
      quantity,
      unitsPerDose,
      concurrentMedicationIds,
    } = body;

    const report = await screenClinicalSafety({
      medicationId,
      medicationMasterId,
      customerId,
      guestAge: guestAge ? Number(guestAge) : undefined,
      guestGender,
      dosage,
      schedule,
      frequency,
      quantity: quantity ? Number(quantity) : undefined,
      unitsPerDose: unitsPerDose ? Number(unitsPerDose) : undefined,
      concurrentMedicationIds: Array.isArray(concurrentMedicationIds) ? concurrentMedicationIds : [],
    });

    return NextResponse.json({ ok: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to perform clinical safety screening.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }
}
