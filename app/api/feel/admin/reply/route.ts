import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import {
  getSymptomSessionDetail,
  serializeSession,
  staffReplyToSymptomSession,
} from "@/app/lib/services/symptom-triage";

export const runtime = "nodejs";

/** POST — staff reply on an escalated (or any) symptom session */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { sessionId?: string; content?: string; markResolved?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = String(body.sessionId || "").trim();
  const content = String(body.content || "");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const result = await staffReplyToSymptomSession({
      sessionId,
      content,
      staffUserId: user.id,
      markResolved: Boolean(body.markResolved),
    });

    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "empty") {
      return NextResponse.json({ error: "Reply text required" }, { status: 400 });
    }

    const detail = await getSymptomSessionDetail(sessionId);
    return NextResponse.json({
      message: result.message,
      session: detail ? serializeSession(detail) : null,
    });
  } catch (err) {
    console.error("[feel admin reply]", err);
    return NextResponse.json({ error: "Could not send reply" }, { status: 500 });
  }
}
