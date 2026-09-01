import { NextResponse } from "next/server";
import { prismaUnscoped, withTenantTx } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import {
  completeDarajaPayment,
  failDarajaPayment,
} from "@/app/lib/services/payments";
import {
  markWebhookProcessed,
  recordInboundWebhook,
} from "@/app/lib/platform/webhooks";
import { completeBillingPayment } from "@/app/lib/platform/billing";

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
    const checkoutRequestId = cb?.CheckoutRequestID;
    if (!checkoutRequestId) {
      return NextResponse.json({ ok: false, error: "no_callback" }, { status: 400 });
    }

    const lookedUp = await withPlatformBypass(async () => {
      const payment = await prismaUnscoped.payment.findFirst({
        where: {
          OR: [
            { checkoutRequestId },
            { providerRef: checkoutRequestId },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      const billing = await prismaUnscoped.billingPayment.findFirst({
        where: { checkoutRequestId },
        orderBy: { createdAt: "desc" },
      });
      return { payment, billing };
    });

    if (lookedUp.billing && !lookedUp.payment) {
      const inbound = await recordInboundWebhook({
        pharmacyId: lookedUp.billing.pharmacyId,
        provider: "daraja",
        providerEventId: checkoutRequestId,
        eventType: "stk.billing.callback",
        payload: body,
      });
      if (inbound.duplicate && inbound.event.status === "delivered") {
        return NextResponse.json({ ok: true, note: "duplicate" });
      }
      const items = cb.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
      await withPlatformBypass(async () =>
        completeBillingPayment({
          checkoutRequestId,
          mpesaReceipt: receipt != null ? String(receipt) : null,
          resultCode: cb.ResultCode ?? 1,
          resultDesc: cb.ResultDesc,
        }),
      );
      await markWebhookProcessed(inbound.event.id);
      return NextResponse.json({ ok: true, note: "billing" });
    }

    const payment = lookedUp.payment;
    if (!payment) {
      console.warn("[daraja callback] payment not found", checkoutRequestId);
      return NextResponse.json({ ok: true, note: "payment_not_found" });
    }

    const inbound = await recordInboundWebhook({
      pharmacyId: payment.pharmacyId,
      provider: "daraja",
      providerEventId: checkoutRequestId,
      eventType: "stk.callback",
      payload: body,
    });
    if (inbound.duplicate && inbound.event.status === "delivered") {
      return NextResponse.json({ ok: true, note: "duplicate" });
    }

    try {
      await withPharmacy(payment.pharmacyId, async () => {
        await withTenantTx(payment.pharmacyId, async () => {
        if (cb.MerchantRequestID && !payment.merchantRequestId) {
          await prismaUnscoped.payment
            .update({
              where: { id: payment.id },
              data: {
                merchantRequestId: cb.MerchantRequestID,
                checkoutRequestId: payment.checkoutRequestId || checkoutRequestId,
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
