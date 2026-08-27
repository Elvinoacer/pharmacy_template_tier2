import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { computeRefillMetrics } from "@/app/lib/services/analytics/refills";
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
    const metrics = await computeRefillMetrics(range);
    return NextResponse.json({ period: { from: range.from, to: range.to }, metrics });
  } catch (err) {
    console.error("[api/admin/analytics/refills]", err);
    return NextResponse.json(
      { error: "load_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
