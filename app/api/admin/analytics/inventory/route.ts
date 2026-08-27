import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { computeInventoryMetrics } from "@/app/lib/services/analytics/inventory";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import { requireStaffForAnalytics, parsePeriod } from "@/app/api/admin/analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireStaffForAnalytics();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const period = parsePeriod(request);
    const range = defaultRange(period);
    const metrics = await computeInventoryMetrics(range);
    return NextResponse.json({ period: { from: range.from, to: range.to }, metrics });
  } catch (err) {
    console.error("[api/admin/analytics/inventory]", err);
    return NextResponse.json(
      { error: "load_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
