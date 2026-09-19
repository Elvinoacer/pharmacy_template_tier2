import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { reconcilePharmacyBilling } from "@/app/lib/platform/reconcile-billing-stk";
import { logIntasend } from "@/app/lib/services/intasend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser-driven fallback reconciliation for pharmacy billing payments with IntaSend and fallback rails. */
export async function POST() {
  try {
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

    const result = await reconcilePharmacyBilling(pharmacy.id);
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
  } catch (error) {
    logIntasend("error", "payment.status.route_error", {
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "payment_status_unavailable",
        message: "We couldn't confirm payment status right now. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
