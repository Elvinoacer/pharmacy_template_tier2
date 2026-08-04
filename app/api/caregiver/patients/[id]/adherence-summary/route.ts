import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { requireCaregiverForPatient } from "@/app/lib/services/caregiver-permissions";
import {
  getAdherenceStatsForCustomer,
  getAdherencePerPrescription,
} from "@/app/lib/services/adherence";
import { getTodaysDosesForCustomer } from "@/app/lib/services/medication-schedule";

export const runtime = "nodejs";

/**
 * Get a comprehensive adherence summary for a patient the caregiver supports.
 *
 * Returns:
 *   - 14-day adherence stats (rate, trend, streak)
 *   - Per-prescription breakdown
 *   - Today's scheduled doses + confirmation status
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: customerId } = await params;

  try {
    await requireCaregiverForPatient(user, customerId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "forbidden" },
      { status: 403 },
    );
  }

  const [stats, perPrescription, todaysDoses] = await Promise.all([
    getAdherenceStatsForCustomer(customerId, 14),
    getAdherencePerPrescription(customerId, 14),
    getTodaysDosesForCustomer(customerId),
  ]);

  return NextResponse.json({
    stats,
    perPrescription,
    todaysDoses,
  });
}
