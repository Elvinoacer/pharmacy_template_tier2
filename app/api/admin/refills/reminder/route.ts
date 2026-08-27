import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { sendDirectRefillReminder } from "@/app/lib/services/refills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const customerId = String(body.customerId || "");
    const prescriptionId = body.prescriptionId ? String(body.prescriptionId) : undefined;
    const refillRequestId = body.refillRequestId ? String(body.refillRequestId) : undefined;
    const channel = body.channel || "sms";
    const customSubject = body.subject ? String(body.subject).trim() : undefined;
    const customBody = body.body ? String(body.body).trim() : undefined;

    if (!customerId) {
      return NextResponse.json({ error: "missing_customer_id" }, { status: 400 });
    }

    const res = await sendDirectRefillReminder({
      customerId,
      prescriptionId,
      refillRequestId,
      channel,
      customSubject,
      customBody,
      actorId: user.id,
    });

    return NextResponse.json({ ok: true, data: res });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_send_reminder", message: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
