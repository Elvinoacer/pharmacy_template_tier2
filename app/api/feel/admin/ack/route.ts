import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { acknowledgeSymptomSessionForStaff } from "@/app/lib/services/symptom-triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — staff is viewing a How-do-you-feel thread.
 * Marks related urgent admin notifications as read so the sidebar badge clears
 * (including when new visitor messages arrive while the thread is open).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    await acknowledgeSymptomSessionForStaff({
      sessionId,
      staffUserId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feel admin ack]", err);
    return NextResponse.json({ error: "Could not acknowledge" }, { status: 500 });
  }
}
