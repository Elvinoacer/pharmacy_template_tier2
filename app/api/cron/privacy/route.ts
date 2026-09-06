import type { NextRequest } from "next/server";
import { isCronAuthorized } from "@/app/lib/cron-auth";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { runPrivacyRetention } from "@/app/lib/services/privacy-retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withPlatformBypass(() => runPrivacyRetention());
    return Response.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/privacy]", err);
    return Response.json(
      { error: "privacy_retention_failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
