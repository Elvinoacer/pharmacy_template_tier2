import { NextResponse } from "next/server";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import {
  completeDarajaPayment,
  failDarajaPayment,
} from "@/app/lib/services/payments";
import {
  markWebhookProcessed,
  recordInboundWebhook,
} from "@/app/lib/platform/webhooks";

export const runtime = "nodejs";

/**
 * Daraja STK push callback.
 * Tenant is resolved from the payment row — never from cookies.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      Body?: {
        stkCallback?: {
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
          CallbackMetadata?: {
            Item?: Array<{ Name?: string; Value?: string | number }>;
          };
        };
      };
    };

    const cb = body.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
      return NextResponse.json({ ok: false, error: "no_callback" }, { status: 400 });
    }

    const payment = await prismaUnscoped.payment.findFirst({
      where: {
        OR: [
          { checkoutRequestId: cb.CheckoutRequestID },
          { providerRef: cb.CheckoutRequestID },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      console.warn("[daraja callback] payment not found", cb.CheckoutRequestID);
      return NextResponse.json({ ok: true, note: "payment_not_found" });
    }

    const inbound = await recordInboundWebhook({
      pharmacyId: payment.pharmacyId,
      provider: "daraja",
      providerEventId: cb.CheckoutRequestID,
      eventType: "stk.callback",
      payload: body,
    });
    if (inbound.duplicate && inbound.event.status === "delivered") {
      return NextResponse.json({ ok: true, note: "duplicate" });
    }

    try {
      await withPharmacy(payment.pharmacyId, async () => {
        if (cb.MerchantRequestID && !payment.merchantRequestId) {
          await prismaUnscoped.payment
            .update({
              where: { id: payment.id },
              data: {
                merchantRequestId: cb.MerchantRequestID,
                checkoutRequestId: payment.checkoutRequestId || cb.CheckoutRequestID,
              },
            })
            .catch(() => {});
        }

        if (cb.ResultCode === 0) {
          const items = cb.CallbackMetadata?.Item ?? [];
          const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
          const amount = items.find((i) => i.Name === "Amount")?.Value;
          await completeDarajaPayment({
            paymentId: payment.id,
            mpesaReceipt: receipt != null ? String(receipt) : null,
            resultDesc: cb.ResultDesc,
            providerAmount: amount != null ? Number(amount) : null,
          });
        } else {
          await failDarajaPayment({
            paymentId: payment.id,
            reason: cb.ResultDesc || "Customer declined or STK timed out",
          });
        }
      });
      await markWebhookProcessed(inbound.event.id);
    } catch (err) {
      await markWebhookProcessed(
        inbound.event.id,
        err instanceof Error ? err.message : "callback_failed",
      );
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[daraja callback]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
