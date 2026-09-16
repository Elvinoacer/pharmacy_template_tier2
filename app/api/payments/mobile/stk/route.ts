import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { withAuthorizedPayment } from "@/app/lib/services/payment-scope";
import { canInitiatePayment, createIntasendOrderCheckout } from "@/app/lib/services/payments";

export const runtime = "nodejs";

const Body = z.object({
  orderId: z.string().uuid(),
  phone: z.string().optional(),
  forceRetry: z.boolean().optional(),
  accessToken: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  redirectUrl: z.string().optional(),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Invalid request body." }, { status: 400 });
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
        session: session ? { id: session.id, customerId: session.customerId, role: session.role } : null,
        staff,
      });

      if (!authz.allowed) {
        const status =
          authz.reason === "order_not_found"
            ? 404
            : authz.reason === "forbidden"
              ? 403
              : 400;
        return NextResponse.json(
          { error: authz.reason || "forbidden", message: "Not authorized to pay for this order." },
          { status },
        );
      }

      const checkout = await createIntasendOrderCheckout({
        orderId: parsed.orderId,
        phone: parsed.phone,
        email: parsed.email,
        name: parsed.name,
        initiatedById: session?.id ?? null,
        redirectUrl: parsed.redirectUrl,
      });

      if (!checkout.ok) {
        return NextResponse.json(
          { ok: false, error: checkout.error, message: checkout.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        paymentId: checkout.paymentId,
        invoiceId: checkout.invoiceId,
        checkoutUrl: checkout.checkoutUrl,
        phone: parsed.phone,
        message: "IntaSend payment session ready.",
      });
    },
  );

  return (
    response ??
    NextResponse.json({ error: "forbidden", message: "Sign in or reopen checkout to pay." }, { status: 403 })
  );
}
