import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { screenClinicalSafety } from "@/app/lib/services/clinical-safety";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireStaff(user);

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
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to perform clinical safety screening." },
      { status: 400 }
    );
  }
}
