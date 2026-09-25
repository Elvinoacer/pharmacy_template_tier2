import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { reconcilePharmacyBilling } from "@/app/lib/platform/reconcile-billing-stk";
import { logIntasend } from "@/app/lib/services/intasend";
import { roleHasPermission } from "@/app/lib/platform/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Browser-driven fallback reconciliation for pharmacy billing payments with IntaSend and fallback rails. */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

    const payload = (await request.json().catch(() => ({}))) as { pharmacyId?: string; invoiceId?: string };
    const pharmacyId = typeof payload.pharmacyId === "string" ? payload.pharmacyId : user.activePharmacyId;
    const pharmacy = await prismaUnscoped.pharmacy.findFirst({
      where: pharmacyId ? { id: pharmacyId } : { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!pharmacy) return NextResponse.json({ ok: false, error: "pharmacy_not_found" }, { status: 404 });
    const owner = await prismaUnscoped.pharmacy.findUnique({ where: { id: pharmacy.id }, select: { ownerUserId: true } });
    const member = user.memberships.find((m) => m.pharmacyId === pharmacy.id && m.status === "active");
    if (owner?.ownerUserId !== user.id && !(member && roleHasPermission(member.role, "billing.manage"))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const invoice = payload.invoiceId
      ? await prismaUnscoped.invoice.findFirst({ where: { id: payload.invoiceId, pharmacyId: pharmacy.id } })
      : null;
    if (payload.invoiceId && !invoice) return NextResponse.json({ ok: false, error: "invoice_not_found" }, { status: 404 });

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
    const refreshed = invoice ? await prismaUnscoped.invoice.findUnique({ where: { id: invoice.id } }) : null;
    const attempt = invoice ? await prismaUnscoped.billingPayment.findFirst({
      where: { invoiceId: invoice.id }, orderBy: { createdAt: "desc" },
      select: { status: true, failureReason: true },
    }) : null;
    const state = refreshed?.status === "paid" ? "paid"
      : attempt?.status === "failed" ? "failed"
      : attempt?.status === "pending" || attempt?.status === "processing" ? "pending"
      : refreshed?.status === "open" ? "open" : "unknown";
    return NextResponse.json({
      ok: true,
      state,
      invoiceId: invoice?.id ?? null,
      message: attempt?.failureReason ?? null,
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
