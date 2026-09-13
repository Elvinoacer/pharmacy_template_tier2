import { NextResponse } from "next/server";
import { requirePlatformAction } from "@/app/lib/platform/policy";
import { loadApprovalReadiness } from "@/app/lib/services/pharmacy-verification";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePlatformAction(["super_admin"], { stepUp: false });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const pharmacyId = (url.searchParams.get("pharmacyId") || "").trim();
  if (!pharmacyId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const readiness = await loadApprovalReadiness(pharmacyId);
  return NextResponse.json({
    ready: readiness.ready,
    missing: [...readiness.profileMissing, ...readiness.checklistMissing],
    checklistStale: readiness.checklistStale,
    riskScore: readiness.riskScore,
  });
}
