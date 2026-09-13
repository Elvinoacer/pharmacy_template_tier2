import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prismaUnscoped } from "@/app/lib/db";
import { markInvoicePaid } from "@/app/lib/platform/billing";
import { markWebhookProcessed, recordInboundWebhook } from "@/app/lib/platform/webhooks";
import { intasendWebhookChallenge } from "@/app/lib/services/intasend-checkout";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

type IntaSendCollectionEvent = {
  invoice_id?: string;
  state?: string;
  provider?: string;
  currency?: string;
  value?: string | number;
  net_amount?: string | number;
  api_ref?: string;
  failed_reason?: string | null;
  updated_at?: string;
  challenge?: string;
};

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function amountMatches(expected: number, received: unknown): boolean {
  const amount = Number(received);
  return Number.isFinite(amount) && Math.abs(expected - amount) <= 0.01;
}

export async function POST(req: Request) {
  let inboundId: string | null = null;
  try {
    const body = (await req.json()) as IntaSendCollectionEvent;
    const expectedChallenge = intasendWebhookChallenge();
    const challenge = String(body.challenge || "");

    if (!expectedChallenge) {
      console.error("[intasend billing webhook] INTASEND_WEBHOOK_CHALLENGE is not configured");
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }
    if (!challenge || !constantTimeEqual(challenge, expectedChallenge)) {
      return NextResponse.json({ ok: false, error: "invalid_challenge" }, { status: 401 });
    }

    const paymentId = String(body.api_ref || "").trim();
    const providerInvoiceId = String(body.invoice_id || "").trim();
    const state = String(body.state || "").trim().toUpperCase();
    if (!paymentId || !providerInvoiceId || !["PENDING", "PROCESSING", "COMPLETE", "FAILED"].includes(state)) {
      return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
    }

    const payment = await withPlatformBypass(() =>
      prismaUnscoped.billingPayment.findFirst({
        where: { id: paymentId, provider: "intasend" },
      }),
    );
    if (!payment) {
      return NextResponse.json({ ok: true, note: "payment_not_found" });
    }

    if (payment.checkoutRequestId && payment.checkoutRequestId !== providerInvoiceId) {
      return NextResponse.json({ ok: false, error: "provider_reference_mismatch" }, { status: 409 });
    }

    const inbound = await withPlatformBypass(() =>
      recordInboundWebhook({
        pharmacyId: payment.pharmacyId,
        provider: "intasend",
        providerEventId: `${providerInvoiceId}:${state}:${body.updated_at || "current"}`,
        eventType: `checkout.collection.${state.toLowerCase()}`,
        payload: body,
      }),
    );
    inboundId = inbound.event.id;
    if (inbound.duplicate && inbound.event.status === "delivered") {
      return NextResponse.json({ ok: true, note: "duplicate" });
    }

    if (body.currency !== "KES" || !amountMatches(Number(payment.amountKes), body.value)) {
      await withPlatformBypass(() => markWebhookProcessed(inbound.event.id, "billing_evidence_mismatch"));
      return NextResponse.json({ ok: true, note: "evidence_mismatch" }, { status: 202 });
    }

    if (payment.status === "succeeded") {
      await withPlatformBypass(() => markWebhookProcessed(inbound.event.id));
      return NextResponse.json({ ok: true, note: "already_settled" });
    }

    if (state === "COMPLETE") {
      await withPlatformBypass(async () => {
        await prismaUnscoped.billingPayment.update({
          where: { id: payment.id },
          data: {
            status: "succeeded",
            checkoutRequestId: providerInvoiceId,
            providerRef: providerInvoiceId,
            paidAt: new Date(),
            failureReason: null,
          },
        });
        await markInvoicePaid(payment.invoiceId);
        await markWebhookProcessed(inbound.event.id);
      });
      return NextResponse.json({ ok: true, note: "settled" });
    }

    if (state === "FAILED") {
      await withPlatformBypass(async () => {
        await prismaUnscoped.billingPayment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            checkoutRequestId: providerInvoiceId,
            failureReason: String(body.failed_reason || "IntaSend checkout failed").slice(0, 250),
          },
        });
        await markWebhookProcessed(inbound.event.id);
      });
      return NextResponse.json({ ok: true, note: "failed" });
    }

    await withPlatformBypass(async () => {
      await prismaUnscoped.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: "processing",
          checkoutRequestId: providerInvoiceId,
        },
      });
      await markWebhookProcessed(inbound.event.id);
    });
    return NextResponse.json({ ok: true, note: "processing" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "intasend_webhook_failed";
    console.error("[intasend billing webhook]", message);
    const failedInboundId = inboundId;
    if (failedInboundId) {
      await withPlatformBypass(() => markWebhookProcessed(failedInboundId, message.slice(0, 250))).catch(() => undefined);
    }
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
