import { NextResponse } from "next/server";
import { verifyIntasendWebhookChallenge } from "@/app/lib/services/intasend";
import { completeIntasendBillingPayment, failIntasendBillingPayment } from "@/app/lib/platform/billing";
import { completeIntasendOrderPayment, failIntasendOrderPayment } from "@/app/lib/services/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const event = await req.json();

    // Verify challenge token if configured
    if (!verifyIntasendWebhookChallenge(event.challenge)) {
      console.warn("[intasend][webhook] invalid challenge received:", event.challenge);
      return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
    }

    const {
      state,
      api_ref: apiRef,
      invoice_id: invoiceId,
      value,
      currency,
      provider,
      failed_reason: failedReason,
    } = event;

    if (!apiRef) {
      return NextResponse.json({ received: true, note: "missing_api_ref" });
    }

    const isBilling =
      apiRef.startsWith("SUBINV_") ||
      apiRef.startsWith("KYP-") ||
      apiRef.startsWith("INV-") ||
      apiRef.startsWith("BUNDLE-");

    if (!isBilling) {
      console.warn(
        "[intasend][webhook] Rejected non-billing payment. Customer commerce cannot use IntaSend:",
        apiRef,
      );
      return NextResponse.json(
        { error: "Customer orders cannot be processed via IntaSend. All customer commerce must use tenant Daraja M-Pesa." },
        { status: 400 },
      );
    }

    if (currency && String(currency).toUpperCase() !== "KES") {
      console.error("[intasend][webhook] currency mismatch:", currency);
      return NextResponse.json({ error: "Invalid currency. Expected KES." }, { status: 400 });
    }

    if (state === "COMPLETE") {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      await completeIntasendBillingPayment({
        apiRef,
        intasendInvoiceId: invoiceId,
        amount,
        provider: provider || "INTASEND",
      });
    } else if (state === "FAILED") {
      await failIntasendBillingPayment({
        apiRef,
        reason: failedReason || "Payment failed on IntaSend",
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[intasend][webhook] handling error:", error);
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 },
    );
  }
}
