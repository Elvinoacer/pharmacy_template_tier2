import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { computeReconciliation } from "@/app/lib/services/analytics/reconciliation";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import { requireStaffForAnalytics, parsePeriod } from "@/app/api/admin/analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireStaffForAnalytics();
  if (!auth.ok) return NextResponse.json({ error: auth.error, message: auth.error }, { status: auth.status });
  try {
    const period = parsePeriod(request);
    const range = defaultRange(period);
    const report = await computeReconciliation(range);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[api/admin/analytics/reconciliation]", err);
    return NextResponse.json(
      { error: "load_failed", message: "We couldn't load reconciliation analytics right now. Please try again." },
      { status: 500 },
    );
  }
}
