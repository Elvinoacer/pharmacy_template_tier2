import { NextResponse } from "next/server";
import {
  readPrivateR2Object,
  verifyPrivateMediaToken,
} from "@/app/lib/r2";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * GET /api/feel/media?token=...
 *
 * Short-lived bearer gateway for sensitive symptom media. The R2 bucket stays
 * private; callers only receive an object after a valid HMAC token is checked.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimitAsync(`feel-media:${clientIp(request)}`, {
    limit: 120,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  const verified = verifyPrivateMediaToken(token);
  if (!verified) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 403 });
  }

  try {
    const object = await readPrivateR2Object(verified.key);
    if (!object) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return new Response(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.body.byteLength),
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (err) {
    console.error("[feel media]", err);
    return NextResponse.json({ error: "media_unavailable" }, { status: 503 });
  }
}
