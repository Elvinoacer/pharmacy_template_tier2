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
    return NextResponse.json(
      { error: "forbidden", message: "Sign in to view your medication sync plan." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const anchorDayParam = searchParams.get("anchorDay");
  const anchorDay = anchorDayParam ? parseInt(anchorDayParam, 10) : 1;

  const plan = await calculateRefillSyncPlan(user.customerId, anchorDay);
  if (!plan) {
    return NextResponse.json(
      { error: "not_found", message: "No eligible refill sync plan is available yet." },
      { status: 404 },
    );
  }

  return NextResponse.json(plan);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.customerId) {
    return NextResponse.json(
      { error: "forbidden", message: "Sign in to set up medication sync." },
      { status: 403 },
    );
  }

  let body: z.infer<typeof EnrollSchema>;
  try {
    body = EnrollSchema.parse(await req.json());
  } catch (err) {
    const issues = err instanceof z.ZodError
      ? err.issues.slice(0, 10).map((issue) => ({ field: issue.path.join("."), message: issue.message }))
      : undefined;
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "Some medication sync details are missing or invalid. Review them and try again.",
        issues,
      },
      { status: 400 },
    );
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
    console.error("[api/portal/sync]", err);
    return NextResponse.json(
      {
        error: "enrollment_failed",
        message: "We couldn't set up medication sync right now. Your prescriptions were not changed. Please try again.",
      },
      { status: 500 },
    );
  }
}
