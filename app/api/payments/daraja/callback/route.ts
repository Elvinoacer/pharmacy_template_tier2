import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import {
  completeDarajaPayment,
  failDarajaPayment,
} from "@/app/lib/services/payments";

export const runtime = "nodejs";

/**
 * Daraja STK push callback.
 * Idempotent — safe if status poll already settled the payment.
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

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { checkoutRequestId: cb.CheckoutRequestID },
          // Legacy rows stored checkout id in providerRef.
          { providerRef: cb.CheckoutRequestID },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!payment) {
      // Acknowledge so Daraja doesn't retry forever; log for ops.
      console.warn("[daraja callback] payment not found", cb.CheckoutRequestID);
      return NextResponse.json({ ok: true, note: "payment_not_found" });
    }

    // Persist merchant id if we only had checkout id.
    if (cb.MerchantRequestID && !payment.merchantRequestId) {
      await prisma.payment
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
      await completeDarajaPayment({
        paymentId: payment.id,
        mpesaReceipt: receipt != null ? String(receipt) : null,
        resultDesc: cb.ResultDesc,
      });
    } else {
      await failDarajaPayment({
        paymentId: payment.id,
        reason: cb.ResultDesc || "Customer declined or STK timed out",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[daraja callback]", err);
    // Still 200-ish? Daraja retries on non-2xx. Return 500 only for true faults
    // so transient DB errors get another try.
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
