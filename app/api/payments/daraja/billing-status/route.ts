import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { reconcilePharmacyBillingStk } from "@/app/lib/platform/reconcile-billing-stk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Browser-driven fallback reconciliation for pharmacy billing STK payments.
 * The caller must own the pharmacy; provider confirmation is fetched directly
 * from Daraja by the shared reconciliation service.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const pharmacy = await prismaUnscoped.pharmacy.findFirst({
    where: {
      ownerUserId: user.id,
      ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!pharmacy) return NextResponse.json({ ok: false, error: "pharmacy_not_found" }, { status: 404 });

  const result = await reconcilePharmacyBillingStk(pharmacy.id);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "daraja_not_configured" ? 503 : 502 });
  }
  return NextResponse.json(result);
}
