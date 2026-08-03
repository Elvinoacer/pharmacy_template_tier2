import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

/**
 * Daraja STK push callback handler.
 *
 * Daraja calls this URL after the customer approves/declines the STK push.
 * We update the Payment row + the Order status accordingly.
 *
 * Body shape (Daraja):
 * {
 *   "Body": {
 *     "stkCallback": {
 *       "MerchantRequestID": "...",
 *       "CheckoutRequestID": "...",
 *       "ResultCode": 0,  // 0 = success, anything else = failure
 *       "ResultDesc": "The service request is processed successfully.",
 *       "CallbackMetadata": {
 *         "Item": [
 *           { "Name": "Amount", "Value": 10 },
 *           { "Name": "MpesaReceiptNumber", "Value": "SGH3XK2P61" },
 *           { "Name": "PhoneNumber", "Value": 254712345678 }
 *         ]
 *       }
 *     }
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      Body?: {
        stkCallback?: {
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
    if (!cb) {
      return NextResponse.json({ ok: false, error: "no_callback" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { providerRef: cb.CheckoutRequestID },
    });
    if (!payment) {
      return NextResponse.json({ ok: false, error: "payment_not_found" }, { status: 404 });
    }

    if (cb.ResultCode === 0) {
      // Success — extract receipt number.
      const items = cb.CallbackMetadata?.Item ?? [];
      const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value as string | undefined;
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "completed",
            providerRef: receipt || payment.providerRef,
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "paid" },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "failed",
            failureReason: cb.ResultDesc || "Customer declined or STK timed out",
          },
        }),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[daraja callback]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
