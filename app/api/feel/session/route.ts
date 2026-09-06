import { NextResponse } from "next/server";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import {
  createSymptomSession,
  getSymptomSessionDetail,
  serializeSession,
  SYMPTOM_CATEGORIES,
  assertSessionAccess,
} from "@/app/lib/services/symptom-triage";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function json(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

/** GET — list categories + optional session by id/guestKey, or customer's sessions */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("id");
  const guestKey = url.searchParams.get("guestKey")?.trim().slice(0, 80) || null;

  if (sessionId) {
    try {
      const access = await assertSessionAccess({ sessionId, guestKey });
      if (access.error === "not_found") {
        return json({ error: "not_found" }, { status: 404 });
      }
      if (access.error === "forbidden") {
        return json({ error: "forbidden" }, { status: 403 });
      }
      const detail = await getSymptomSessionDetail(sessionId);
      if (!detail) return json({ error: "not_found" }, { status: 404 });
      return json({ session: serializeSession(detail) });
    } catch (err) {
      console.error("[feel session detail]", err);
      return json(
        { error: "Could not load this check-in. Please try again." },
        { status: 503 },
      );
    }
  }

  // Categories are static product data and should remain usable even when
  // session-history persistence is temporarily unavailable. This prevents a
  // transient database/session lookup failure from blanking the whole picker.
  try {
    const user = await getSessionUser();
    if (user?.customerId) {
      const sessions = await prisma.symptomSession.findMany({
        where: { customerId: user.customerId },
        orderBy: { lastMessageAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          category: true,
          chiefComplaint: true,
          provisionalLabel: true,
          severity: true,
          feelingTrend: true,
          escalatedAt: true,
          lastMessageAt: true,
          createdAt: true,
          messageCount: true,
          aiSummary: true,
        },
      });
      return json({ categories: SYMPTOM_CATEGORIES, sessions });
    }

    if (guestKey) {
      const sessions = await prisma.symptomSession.findMany({
        where: { guestKey },
        orderBy: { lastMessageAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          category: true,
          chiefComplaint: true,
          provisionalLabel: true,
          severity: true,
          feelingTrend: true,
          escalatedAt: true,
          lastMessageAt: true,
          createdAt: true,
          messageCount: true,
          aiSummary: true,
        },
      });
      return json({ categories: SYMPTOM_CATEGORIES, sessions });
    }

    return json({ categories: SYMPTOM_CATEGORIES, sessions: [] });
  } catch (err) {
    console.error("[feel session list]", err);
    return json({
      categories: SYMPTOM_CATEGORIES,
      sessions: [],
      historyUnavailable: true,
    });
  }
}

/** POST — create a new symptom session */
export async function POST(request: Request) {
  const rl = await checkRateLimitAsync(`feel-session:${clientIp(request)}`, {
    limit: 10,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return json(
      { error: `Too many sessions. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  let body: { guestKey?: string; category?: string; chiefComplaint?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const guestKey = String(body.guestKey || "").trim().slice(0, 80) || undefined;
  const category = String(body.category || "").trim().slice(0, 40) || undefined;
  const chiefComplaint = String(body.chiefComplaint || "").trim().slice(0, 500) || undefined;

  try {
    const session = await createSymptomSession({ guestKey, category, chiefComplaint });
    const detail = await getSymptomSessionDetail(session.id);
    return json({
      session: detail ? serializeSession(detail) : null,
    });
  } catch (err) {
    console.error("[feel session create]", err);
    return json({ error: "Could not start session" }, { status: 500 });
  }
}
