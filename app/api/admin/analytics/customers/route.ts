import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { computeCustomerAnalytics } from "@/app/lib/services/analytics/customers";
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
    const sp = request.nextUrl.searchParams;
    const limit = sp.get("limit") ? Number(sp.get("limit")) : 50;
    const data = await computeCustomerAnalytics(range, { limit });
    return NextResponse.json({ period: { from: range.from, to: range.to }, ...data });
  } catch (err) {
    console.error("[api/admin/analytics/customers]", err);
    return NextResponse.json(
      { error: "load_failed", message: "We couldn't load customer analytics right now. Please try again." },
      { status: 500 },
    );
  }
}
