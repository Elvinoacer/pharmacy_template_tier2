import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { canInitiatePayment, createIntasendOrderCheckout } from "@/app/lib/services/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.orderId || "").trim();
    const phone = String(body.phone || "").trim();
    const email = body.email ? String(body.email).trim() : undefined;
    const name = body.name ? String(body.name).trim() : undefined;
    const accessToken = body.accessToken ? String(body.accessToken).trim() : undefined;
    const redirectUrl = body.redirectUrl ? String(body.redirectUrl).trim() : undefined;

    if (!orderId) {
      return NextResponse.json({ error: "order_id_required" }, { status: 400 });
    }

    const sessionUser = await getSessionUser().catch(() => null);
    const authCheck = await canInitiatePayment({
      orderId,
      phone,
      accessToken,
      session: sessionUser ? { id: sessionUser.id, customerId: sessionUser.id, role: sessionUser.role } : null,
      staff: ["pharmacist", "staff", "manager"].includes(sessionUser?.role || ""),
    });

    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason || "forbidden" },
        { status: 403 },
      );
    }

    const result = await createIntasendOrderCheckout({
      orderId,
      phone,
      email,
      name,
      initiatedById: sessionUser?.id || null,
      redirectUrl,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.paymentId,
      invoiceId: result.invoiceId,
    });
  } catch (error) {
    console.error("[intasend][order-checkout] failed:", error);
    return NextResponse.json(
      { error: "checkout_failed", message: "Could not create payment checkout session." },
      { status: 500 },
    );
  }
}
