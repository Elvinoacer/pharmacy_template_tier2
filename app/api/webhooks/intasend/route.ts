import { NextResponse } from "next/server";
import {
  logIntasend,
  verifyIntasendWebhookChallenge,
} from "@/app/lib/services/intasend";
import {
  completeIntasendBillingPayment,
  failIntasendBillingPayment,
} from "@/app/lib/platform/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookEvent = {
  challenge?: unknown;
  state?: unknown;
  api_ref?: unknown;
  invoice_id?: unknown;
  value?: unknown;
  currency?: unknown;
  provider?: unknown;
  failed_reason?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isBillingReference(apiRef: string) {
  return (
    apiRef.startsWith("BILL-") ||
    apiRef.startsWith("SUBINV_") ||
    apiRef.startsWith("KYP-") ||
    apiRef.startsWith("INV-") ||
    apiRef.startsWith("BUNDLE-")
  );
}

export async function POST(req: Request) {
  let event: WebhookEvent;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }
    event = parsed as WebhookEvent;
  } catch (error) {
    logIntasend("warn", "webhook.invalid_json", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const apiRef = text(event.api_ref);
  const state = text(event.state)?.toUpperCase();
  const invoiceId = text(event.invoice_id);

  if (!verifyIntasendWebhookChallenge(text(event.challenge))) {
    logIntasend("warn", "webhook.invalid_challenge", { apiRef: apiRef || undefined });
    return NextResponse.json({ error: "Invalid challenge" }, { status: 401 });
  }

  if (!apiRef) {
    logIntasend("warn", "webhook.missing_api_ref");
    return NextResponse.json({ error: "Missing api_ref" }, { status: 400 });
  }

  if (!isBillingReference(apiRef)) {
    logIntasend("warn", "webhook.rejected_reference", { apiRef });
    return NextResponse.json(
      { error: "Customer orders cannot be processed via IntaSend." },
      { status: 400 },
    );
  }

  const currency = text(event.currency);
  if (currency && currency.toUpperCase() !== "KES") {
    logIntasend("error", "webhook.currency_mismatch", { apiRef, currency });
    return NextResponse.json({ error: "Invalid currency. Expected KES." }, { status: 400 });
  }

  if (!state || !["PENDING", "PROCESSING", "COMPLETE", "FAILED"].includes(state)) {
    logIntasend("warn", "webhook.unknown_state", { apiRef, state: state || undefined });
    // Acknowledge unknown states so the provider does not disable the webhook
    // because of a state this application does not need to process.
    return NextResponse.json({ received: true, note: "state_ignored" });
  }

  if (state === "PENDING" || state === "PROCESSING") {
    logIntasend("info", "webhook.payment_in_progress", { apiRef, state });
    return NextResponse.json({ received: true });
  }

  try {
    if (state === "COMPLETE") {
      if (!invoiceId) {
        logIntasend("error", "webhook.missing_invoice_id", { apiRef });
        return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
      }

      const amount = Number(event.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        logIntasend("error", "webhook.invalid_amount", { apiRef, invoiceId });
        return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
      }

      const settled = await completeIntasendBillingPayment({
        apiRef,
        intasendInvoiceId: invoiceId,
        amount,
        provider: text(event.provider) || "INTASEND",
      });

      if (!settled) {
        logIntasend("warn", "webhook.invoice_not_found", { apiRef, invoiceId });
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      logIntasend("info", "webhook.payment_completed", {
        apiRef,
        invoiceId,
        amount,
      });
    } else {
      const reason = text(event.failed_reason) || "Payment failed on IntaSend";
      await failIntasendBillingPayment({ apiRef, reason });
      logIntasend("warn", "webhook.payment_failed", { apiRef, reason: reason.slice(0, 160) });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logIntasend("error", "webhook.processing_error", {
      apiRef,
      invoiceId: invoiceId || undefined,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    // Non-2xx tells IntaSend to retry transient/database failures.
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
