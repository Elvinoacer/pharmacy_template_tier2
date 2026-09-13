import { withAuthorizedPayment } from "@/app/lib/services/payment-scope";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePaymentStatus } from "@/app/lib/services/payments";

export const runtime = "nodejs";

/**
 * Poll payment status (webhook fallback / UX long-polling).
 *
 * GET ?paymentId=…&query=1
 * GET ?orderId=…&phone=07…&query=1
 *
 * query=1 hits Daraja STK Query when local status is still pending.
 */

const Query = z.object({
  paymentId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  phone: z.string().optional(),
  query: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    paymentId: url.searchParams.get("paymentId") || undefined,
    orderId: url.searchParams.get("orderId") || undefined,
    phone: url.searchParams.get("phone") || undefined,
    query: url.searchParams.get("query") || undefined,
  });
  if (!parsed.success || (!parsed.data.paymentId && !parsed.data.orderId)) {
    return NextResponse.json(
      { error: "invalid_query", message: "Provide paymentId or orderId." },
      { status: 400 },
    );
  }

  const response = await withAuthorizedPayment({ orderId: parsed.data.orderId, paymentId: parsed.data.paymentId, accessToken: req.headers.get("x-order-access-token") }, async () => {
  const queryProvider =
    parsed.data.query === "1" || parsed.data.query === "true";

  const view = await resolvePaymentStatus({
    paymentId: parsed.data.paymentId,
    orderId: parsed.data.orderId,
    queryProvider,
  });

  if (!view) {
    return NextResponse.json(
      { error: "not_found", message: "No payment found for this order yet." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, ...view });
  });
  return response ?? NextResponse.json({ error: "forbidden" }, { status: 403 });
}
