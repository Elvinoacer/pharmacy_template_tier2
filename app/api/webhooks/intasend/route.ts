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

    if (state === "COMPLETE") {
      const amount = Number(value);
      if (isBilling) {
        await completeIntasendBillingPayment({
          apiRef,
          intasendInvoiceId: invoiceId,
          amount,
          provider: provider || "INTASEND",
        });
      } else {
        await completeIntasendOrderPayment({
          apiRef,
          intasendInvoiceId: invoiceId,
          providerAmount: amount,
          provider: provider || "INTASEND",
        });
      }
    } else if (state === "FAILED") {
      if (isBilling) {
        await failIntasendBillingPayment({
          apiRef,
          reason: failedReason || "Payment failed on IntaSend",
        });
      } else {
        await failIntasendOrderPayment({
          apiRef,
          reason: failedReason || "Payment failed on IntaSend",
        });
      }
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
