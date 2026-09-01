import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  escalateSymptomSession,
  getSymptomSessionDetail,
  serializeSession,
} from "@/app/lib/services/symptom-triage";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** POST — escalate to pharmacist (creates ticket + alerts staff) */
export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`feel-escalate:${clientIp(request)}`, {
    limit: 8,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: { sessionId?: string; guestKey?: string; reason?: string };
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
    const result = await escalateSymptomSession({
      sessionId,
      guestKey: body.guestKey,
      reason: String(body.reason || "user_requested_pharmacist").slice(0, 200),
    });

    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const detail = await getSymptomSessionDetail(sessionId);
    return NextResponse.json({
      alreadyEscalated: result.alreadyEscalated ?? false,
      ticket: result.ticket ?? null,
      session: detail ? serializeSession(detail) : null,
    });
  } catch (err) {
    console.error("[feel escalate]", err);
    return NextResponse.json({ error: "Could not escalate" }, { status: 500 });
  }
}
