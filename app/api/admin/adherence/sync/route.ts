import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import {
  getRefillSyncCandidates,
  getRefillSyncEnrollments,
  calculateRefillSyncPlan,
  enrollCustomerInRefillSync,
} from "@/app/lib/services/refill-sync";

export const runtime = "nodejs";

const EnrollSchema = z.object({
  customerId: z.string().uuid(),
  anchorDay: z.number().int().min(1).max(28),
  prescriptionIds: z.array(z.string().uuid()),
  preferredPickup: z.enum(["pickup", "delivery"]).optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const customerId = searchParams.get("customerId");
  const anchorDayParam = searchParams.get("anchorDay");

  // Specific customer calculation
  if (customerId) {
    const anchorDay = anchorDayParam ? parseInt(anchorDayParam, 10) : 1;
    const plan = await calculateRefillSyncPlan(customerId, anchorDay);
    return NextResponse.json({ plan });
  }

  const [candidates, enrollments] = await Promise.all([
    getRefillSyncCandidates(q),
    getRefillSyncEnrollments({ query: q }),
  ]);

  return NextResponse.json({ candidates, enrollments });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = EnrollSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid_body", details: err }, { status: 400 });
  }

  try {
    const result = await enrollCustomerInRefillSync({
      customerId: body.customerId,
      anchorDay: body.anchorDay,
      prescriptionIds: body.prescriptionIds,
      preferredPickup: body.preferredPickup,
      notes: body.notes,
      staffId: user.id,
    });

    return NextResponse.json({ ok: true, enrollment: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enroll patient in Med Sync" },
      { status: 500 },
    );
  }
}
