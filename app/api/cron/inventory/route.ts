import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runInventoryHealthScan } from "@/app/lib/services/stock";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { isCronAuthorized } from "@/app/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "unauthorized", message: "This scheduled task is not authorized." },
      { status: 401 },
    );
  }

  try {
    const result = await withPlatformBypass(async () => runInventoryHealthScan());
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/inventory]", err);
    return NextResponse.json(
      { error: "scan_failed", message: "The inventory health scan could not be completed." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
