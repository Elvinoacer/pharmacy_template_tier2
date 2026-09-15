import { withAuthorizedPayment } from "@/app/lib/services/payment-scope";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import {
  canInitiatePayment,
  initiateStkPayment,
} from "@/app/lib/services/payments";

export const runtime = "nodejs";

/** Start or retry a mobile payment request for an order. */
const Body = z.object({
  orderId: z.string().uuid(),
  phone: z.string().min(9).max(20),
  forceRetry: z.boolean().optional(),
  accessToken: z.string().optional(),
});

function publicPaymentFailure(error: string, message: string) {
  if (error === "daraja_not_configured" || error === "stk_failed") {
    return {
      error: "payment_unavailable",
      message: "Mobile payment is temporarily unavailable. Please try again later or choose another payment option.",
    };
  }
  return { error, message };
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Invalid request." }, { status: 400 });
  }

  const response = await withAuthorizedPayment(
    { orderId: parsed.orderId, accessToken: parsed.accessToken, phone: parsed.phone },
    async () => {
    const session = await getSessionUser().catch(() => null);
    const staff = session ? isStaff(session.role) : false;

    const authz = await canInitiatePayment({
      orderId: parsed.orderId,
      phone: parsed.phone,
      accessToken: parsed.accessToken,
      session: session
        ? { id: session.id, customerId: session.customerId, role: session.role }
        : null,
      staff,
    });

    if (!authz.allowed) {
      const status =
        authz.reason === "order_not_found"
          ? 404
          : authz.reason === "forbidden"
            ? 403
            : 400;
      const messages: Record<string, string> = {
        order_not_found: "Order not found.",
        order_already_settled: "This order is already paid.",
        order_cancelled: "This order was cancelled.",
        forbidden:
          "You can’t pay for this order. Use the phone number used when ordering, or sign in.",
      };
      return NextResponse.json(
        {
          error: authz.reason || "forbidden",
          message: messages[authz.reason || ""] || "Not allowed.",
        },
        { status },
      );
    }

    const result = await initiateStkPayment({
      orderId: parsed.orderId,
      phone: parsed.phone,
      initiatedById: session?.id ?? null,
      forceRetry: Boolean(parsed.forceRetry),
    });

    if (!result.ok) {
      const safe = publicPaymentFailure(result.error, result.message);
      return NextResponse.json(
        {
          ok: false,
          error: safe.error,
          message: safe.message,
          paymentId: result.paymentId,
        },
        { status: result.statusCode || 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      message: result.message,
      phone: result.phone,
      attemptCount: result.attemptCount,
    });
  });
  return response ?? NextResponse.json({ error: "forbidden", message: "Sign in or reopen your checkout to pay." }, { status: 403 });
}
