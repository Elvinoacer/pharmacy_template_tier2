import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prismaUnscoped as db } from "@/app/lib/db";
import { markInvoicePaid } from "@/app/lib/platform/billing";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { markWebhookProcessed, recordInboundWebhook } from "@/app/lib/platform/webhooks";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

type C2BPayload = {
  TransID?: string;
  TransAmount?: string | number;
  BillRefNumber?: string;
  MSISDN?: string | number;
  TransactionType?: string;
  BusinessShortCode?: string | number;
  TransTime?: string | number;
};

function authorized(request: Request) {
  const expected = process.env.DARAJA_C2B_WEBHOOK_SECRET?.trim();
  const received = new URL(request.url).searchParams.get("token") || "";
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function response(code: number, desc: string) {
  return NextResponse.json({ ResultCode: code, ResultDesc: desc });
}

export async function POST(request: Request) {
  if (!authorized(request)) return response(1, "Rejected");

  const body = (await request.json().catch(() => null)) as C2BPayload | null;
  const transId = String(body?.TransID || "").trim();
  const reference = String(body?.BillRefNumber || "").trim();
  const amount = Number(body?.TransAmount);
  if (!transId || !reference || !Number.isFinite(amount) || amount <= 0) return response(1, "Invalid payment evidence");

  try {
    return await withPlatformBypass(async () => {
      const invoice = await db.invoice.findFirst({ where: { number: reference } });
      if (!invoice || Math.abs(Number(invoice.totalKes) - amount) > 0.01) return response(1, "Invoice mismatch");

      const existingReceipt = await db.billingPayment.findFirst({ where: { providerRef: transId, provider: "daraja_c2b" } });
      if (existingReceipt) return response(0, "Accepted");
      if (invoice.status === "paid") return response(0, "Accepted");
      if (invoice.status !== "open") return response(1, "Invoice not collectible");

      const inbound = await recordInboundWebhook({
        pharmacyId: invoice.pharmacyId,
        provider: "daraja",
        providerEventId: transId,
        eventType: "c2b.confirmation",
        payload: body,
      });
      if (inbound.duplicate && inbound.event.status === "delivered") return response(0, "Accepted");

      const payment = await db.billingPayment.create({
        data: {
          pharmacyId: invoice.pharmacyId,
          invoiceId: invoice.id,
          provider: "daraja_c2b",
          status: "succeeded",
          amountKes: amount,
          providerRef: transId,
          paidAt: new Date(),
          phone: body?.MSISDN ? String(body.MSISDN) : null,
        },
      });
      await markInvoicePaid(invoice.id);
      await recordAuditRequired({
        action: "billing.invoice.daraja_c2b.paid",
        resource: "invoice",
        resourceId: invoice.id,
        tenantId: invoice.pharmacyId,
        details: { paymentId: payment.id, transactionId: transId, amountKes: amount },
      });
      await markWebhookProcessed(inbound.event.id);
      return response(0, "Accepted");
    });
  } catch (error) {
    console.error("[daraja c2b confirmation]", error);
    return response(1, "Unable to process payment");
  }
}
