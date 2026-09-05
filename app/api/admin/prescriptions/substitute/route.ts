import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { substitutePrescription } from "@/app/lib/services/dispensing";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireStaff(user);

    const body = await req.json();
    const { prescriptionId, newMedicationId, reason } = body;

    if (!prescriptionId || !newMedicationId || !reason) {
      return NextResponse.json(
        { ok: false, error: "Prescription ID, Replacement Medication, and Substitution Reason are required." },
        { status: 400 },
      );
    }

    const result = await substitutePrescription({
      prescriptionId,
      newMedicationId,
      reason,
      actorId: user!.id,
    });

    if (result.ok) {
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to perform substitution.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
