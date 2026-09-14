import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
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

export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`feel-chat:${clientIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: `You're sending messages too quickly. Try again in ${rl.retryAfterSeconds}s.` },
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
    return NextResponse.json(
      { error: "invalid_request", message: "We couldn't read that message. Refresh and try again." },
      { status: 400 },
    );
  }

  const sessionId = String(body.sessionId || "").trim();
  if (!sessionId) {
    return NextResponse.json(
      { error: "missing_session", message: "This conversation has expired. Start a new symptom check." },
      { status: 400 },
    );
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
      return NextResponse.json(
        { error: "not_found", message: "We couldn't find this conversation. Start a new symptom check." },
        { status: 404 },
      );
    }
    if (result.error === "forbidden") {
      return NextResponse.json(
        { error: "forbidden", message: "You no longer have access to this conversation." },
        { status: 403 },
      );
    }
    if (result.error === "empty") {
      return NextResponse.json(
        { error: "empty_message", message: "Type a message or attach an image before sending." },
        { status: 400 },
      );
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
    return NextResponse.json(
      {
        error: "assistant_unavailable",
        message: "The symptom assistant is temporarily unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
