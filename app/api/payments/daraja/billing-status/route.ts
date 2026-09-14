import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { reconcilePharmacyBillingStk } from "@/app/lib/platform/reconcile-billing-stk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser-driven fallback reconciliation for pharmacy billing payments. */
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
    return NextResponse.json(
      {
        ok: false,
        error: "payment_status_unavailable",
        message: "We couldn't confirm payment status right now. Please try again shortly.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    reconciled: result.reconciled,
    pending: result.pending,
    checked: result.checked,
  });
}
