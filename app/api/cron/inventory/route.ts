import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runInventoryHealthScan } from "@/app/lib/services/stock";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { isCronAuthorized } from "@/app/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inventory health cron — low stock, out of stock, expiring/expired lots.
 * Schedule daily (or every few hours). Dedupes notifications within 24h.
 *
 * curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/inventory
 */
export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await withPlatformBypass(async () => runInventoryHealthScan());
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/inventory]", err);
    return NextResponse.json(
      { error: "scan_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
