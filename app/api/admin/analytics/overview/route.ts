import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAnalyticsOverview } from "@/app/lib/services/analytics/overview";
import { requireStaffForAnalytics, parsePeriod } from "@/app/api/admin/analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireStaffForAnalytics();
  if (!auth.ok) return NextResponse.json({ error: auth.error, message: auth.error }, { status: auth.status });
  try {
    const period = parsePeriod(request);
    const data = await getAnalyticsOverview(period);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/admin/analytics/overview]", err);
    return NextResponse.json(
      { error: "load_failed", message: "We couldn't load the analytics overview right now. Please try again." },
      { status: 500 },
    );
  }
}
