import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import {
  calculatePrescriptionQuantity,
  calculatePrescriptionDuration,
  detectDuplicateTherapies,
  checkRefillEligibility,
} from "@/app/lib/services/prescription-lifecycle";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "staff" && user.role !== "pharmacist" && user.role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action || "all";

    const results: Record<string, any> = {};

    // 1) Quantity Calculation
    if (action === "quantity" || action === "all") {
      const { unitsPerDose, frequency, timesCount, daysSupply } = body;
      results.quantity = calculatePrescriptionQuantity({
        unitsPerDose: Number(unitsPerDose) || 1,
        frequency: frequency || "bid",
        timesCount: timesCount ? Number(timesCount) : undefined,
        daysSupply: Number(daysSupply) || 30,
      });
    }

    // 2) Duration Calculation
    if (action === "duration" || action === "all") {
      const { quantity, unitsPerDose, frequency, timesCount, startDate } = body;
      results.duration = calculatePrescriptionDuration({
        quantity: Number(quantity) || 30,
        unitsPerDose: Number(unitsPerDose) || 1,
        frequency: frequency || "bid",
        timesCount: timesCount ? Number(timesCount) : undefined,
        startDate: startDate ? new Date(startDate) : new Date(),
      });
    }

    // 3) Duplicate Therapy Detection
    if ((action === "duplicates" || action === "all") && body.customerId && body.medicineName) {
      results.duplicates = await detectDuplicateTherapies({
        customerId: body.customerId,
        medicationId: body.medicationId || null,
        medicineName: body.medicineName,
        excludePrescriptionId: body.excludePrescriptionId,
      });
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (err) {
    console.error("[/api/admin/prescriptions/calculate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calculation failed." },
      { status: 500 }
    );
  }
}
