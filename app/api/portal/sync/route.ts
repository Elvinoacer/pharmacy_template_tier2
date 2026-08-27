import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/app/lib/auth";
import { calculateRefillSyncPlan, enrollCustomerInRefillSync } from "@/app/lib/services/refill-sync";

export const runtime = "nodejs";

const EnrollSchema = z.object({
  anchorDay: z.number().int().min(1).max(28),
  prescriptionIds: z.array(z.string().uuid()),
  preferredPickup: z.enum(["pickup", "delivery"]).optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const anchorDayParam = searchParams.get("anchorDay");
  const anchorDay = anchorDayParam ? parseInt(anchorDayParam, 10) : 1;

  const plan = await calculateRefillSyncPlan(user.customerId, anchorDay);
  if (!plan) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
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
      customerId: user.customerId,
      anchorDay: body.anchorDay,
      prescriptionIds: body.prescriptionIds,
      preferredPickup: body.preferredPickup,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, enrollment: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enroll in Med Sync" },
      { status: 500 },
    );
  }
}
