import { NextResponse } from "next/server";
import { checkRateLimit } from "@/app/lib/rate-limit";
import {
  getSymptomSessionDetail,
  sendSymptomMessage,
  serializeSession,
} from "@/app/lib/services/symptom-triage";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** POST — send a user message (text + optional image URLs); AI replies until escalated */
export async function POST(request: Request) {
  const rl = checkRateLimit(`feel-chat:${clientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many messages. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: {
    sessionId?: string;
    guestKey?: string;
    content?: string;
    imageUrls?: string[];
    forceEscalate?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 4)
    : [];

  try {
    const result = await sendSymptomMessage({
      sessionId,
      guestKey: body.guestKey,
      content: String(body.content || ""),
      imageUrls,
      forceEscalate: Boolean(body.forceEscalate),
    });

    if (result.error === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (result.error === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (result.error === "empty") {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }

    const detail = await getSymptomSessionDetail(sessionId);
    return NextResponse.json({
      escalated: result.escalated,
      userMessage: result.userMessage,
      assistantMessage: result.assistantMessage,
      session: detail ? serializeSession(detail) : null,
    });
  } catch (err) {
    console.error("[feel chat]", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    if (message.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "AI is not configured. Add GROQ_API_KEY to .env.local." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not process message" }, { status: 500 });
  }
}
