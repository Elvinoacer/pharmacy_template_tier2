import { NextResponse } from "next/server";
import { checkRateLimit } from "@/app/lib/rate-limit";
import {
  getSymptomSessionDetail,
  recordSymptomCheckIn,
  serializeSession,
} from "@/app/lib/services/symptom-triage";
import type { SymptomFeeling } from "@/app/generated/prisma/client";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** POST — record a feeling check-in (better / same / worse) */
export async function POST(request: Request) {
  const rl = checkRateLimit(`feel-checkin:${clientIp(request)}`, {
    limit: 15,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many check-ins. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: {
    sessionId?: string;
    guestKey?: string;
    feeling?: string;
    notes?: string;
    score?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = String(body.sessionId || "").trim();
  const feeling = String(body.feeling || "").trim() as SymptomFeeling;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  if (feeling !== "better" && feeling !== "same" && feeling !== "worse") {
    return NextResponse.json(
      { error: "feeling must be better, same, or worse" },
      { status: 400 },
    );
  }

  try {
    const result = await recordSymptomCheckIn({
      sessionId,
      guestKey: body.guestKey,
      feeling,
      notes: body.notes,
      score: body.score,
    });

    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const detail = await getSymptomSessionDetail(sessionId);
    return NextResponse.json({
      shouldOfferEscalation: result.shouldOfferEscalation ?? false,
      session: detail ? serializeSession(detail) : null,
    });
  } catch (err) {
    console.error("[feel check-in]", err);
    return NextResponse.json({ error: "Could not record check-in" }, { status: 500 });
  }
}
