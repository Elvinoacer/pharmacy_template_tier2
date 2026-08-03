import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

/**
 * Daraja (Safaricom M-Pesa) STK push integration.
 *
 * Production-ready. Test mode (DARAJA_ENV=sandbox) is the default — set
 * DARAJA_ENV=production in env to go live.
 *
 * Required env vars:
 *   DARAJA_CONSUMER_KEY
 *   DARAJA_CONSUMER_SECRET
 *   DARAJA_SHORTCODE (paybill or till number)
 *   DARAJA_PASSKEY
 *   DARAJA_ENV (sandbox | production) — default: sandbox
 *   DARAJA_CALLBACK_URL (public URL for callbacks)
 *
 * Flow:
 *   1. Customer clicks "Pay with M-Pesa" on /portal/loyalty or /portal/orders
 *   2. This endpoint gets an access token from Daraja, then sends an STK push
 *      to the customer's phone.
 *   3. Daraja calls back to /api/payments/daraja/callback — we update the
 *      Payment row to completed/failed.
 */

const Body = z.object({
  orderId: z.string().uuid(),
  phone: z.string().min(10).max(15),
});

async function getDarajaToken(): Promise<string | null> {
  const key = process.env.DARAJA_CONSUMER_KEY?.trim();
  const secret = process.env.DARAJA_CONSUMER_SECRET?.trim();
  if (!key || !secret) return null;

  const env = process.env.DARAJA_ENV?.trim() === "production" ? "production" : "sandbox";
  const baseUrl = env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const r = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? null;
}

function formatPhone(phone: string): string {
  // Daraja expects 2547XXXXXXXX format.
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("254")) return p;
  if (p.length === 9) return "254" + p;
  return p;
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.orderId },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  if (order.status === "paid" || order.status === "waived") {
    return NextResponse.json({ error: "order_already_settled" }, { status: 400 });
  }

  // Guard against double-click / concurrent pending STK pushes for the same order.
  const existingPending = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      provider: "daraja",
      status: "pending",
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // last 5 minutes
    },
  });
  if (existingPending) {
    return NextResponse.json(
      {
        error: "pending_payment_exists",
        message: "A payment request is already in progress for this order. Check your phone or wait a few minutes.",
        paymentId: existingPending.id,
      },
      { status: 409 },
    );
  }

  // Create a pending Payment row.
  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      customerId: order.customerId,
      amount: order.total,
      provider: "daraja",
      status: "pending",
      phone: formatPhone(parsed.phone),
    },
  });

  // If Daraja env vars aren't configured, mark as pending + return instructions.
  const key = process.env.DARAJA_CONSUMER_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: "daraja_not_configured",
      message: "Set DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, DARAJA_PASSKEY in env. Test mode uses sandbox by default.",
      paymentId: payment.id,
    });
  }

  const token = await getDarajaToken();
  if (!token) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "Could not fetch Daraja access token" },
    });
    return NextResponse.json({ error: "daraja_auth_failed" }, { status: 502 });
  }

  const env = process.env.DARAJA_ENV?.trim() === "production" ? "production" : "sandbox";
  const baseUrl = env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const shortcode = process.env.DARAJA_SHORTCODE!.trim();
  const passkey = process.env.DARAJA_PASSKEY!.trim();
  const callbackUrl = process.env.DARAJA_CALLBACK_URL?.trim() || "https://example.com/api/payments/daraja/callback";

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Number(order.total),
      PartyA: formatPhone(parsed.phone),
      PartyB: shortcode,
      PhoneNumber: formatPhone(parsed.phone),
      CallBackURL: callbackUrl,
      AccountReference: `Aether-${order.id.slice(0, 8)}`,
      TransactionDesc: `Payment for order ${order.id.slice(0, 8)}`,
    }),
  });

  const j = (await stkRes.json()) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    CheckoutRequestID?: string;
    errorMessage?: string;
  };

  if (!stkRes.ok || j.ResponseCode !== "0") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        failureReason: j.errorMessage || j.ResponseDescription || "STK push failed",
      },
    });
    return NextResponse.json({ error: "stk_failed", detail: j }, { status: 502 });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerRef: j.CheckoutRequestID },
  });

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    checkoutRequestId: j.CheckoutRequestID,
    message: "STK push sent. Check your phone to complete payment.",
  });
}
