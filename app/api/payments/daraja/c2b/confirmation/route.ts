import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prismaUnscoped as db } from "@/app/lib/db";
import { settleInvoice } from "@/app/lib/platform/billing";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
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
  if (!expected) {
    return process.env.DARAJA_ENV?.trim().toLowerCase() !== "production";
  }
  const received = new URL(request.url).searchParams.get("token") || "";
  if (!received) return false;
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
  const merchant = await resolveDarajaCredentials(null);
  if (!merchant || String(body?.BusinessShortCode || "") !== merchant.shortcode) return response(1, "Merchant mismatch");

  try {
    return await withPlatformBypass(async () => {
      const invoice = await db.invoice.findFirst({
        where: {
          OR: [
            { number: reference },
            { number: { equals: reference, mode: "insensitive" } },
            { id: reference },
          ],
        },
      });

      if (invoice) {
        if (Math.abs(Number(invoice.totalKes) - amount) > 0.01) return response(1, "Invoice mismatch");

        if (invoice.status !== "open" && invoice.status !== "paid") return response(1, "Invoice not collectible");

        const inbound = await recordInboundWebhook({
          pharmacyId: invoice.pharmacyId,
          provider: "daraja",
          providerEventId: transId,
          eventType: "c2b.confirmation",
          payload: body,
        });
        const payment = await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtextextended(${transId}, 0))) lock`;
          await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoice.id}::uuid FOR UPDATE`;
          const current = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
          const existingReceipt = await tx.billingPayment.findFirst({ where: { providerRef: transId, provider: "daraja_c2b" } });
          if (existingReceipt && existingReceipt.invoiceId !== invoice.id) throw new Error("receipt_invoice_mismatch");
          const evidence = existingReceipt || await tx.billingPayment.create({
            data: {
              pharmacyId: invoice.pharmacyId, invoiceId: invoice.id,
              provider: "daraja_c2b", status: "succeeded", amountKes: amount,
              providerRef: transId, paidAt: new Date(),
              phone: body?.MSISDN ? String(body.MSISDN) : null,
              failureReason: current.status === "paid" ? "Additional collection on an already-paid invoice; review refund." : null,
            },
          });
          if (current.status === "open") await settleInvoice(tx, invoice.id);
          if (current.status === "paid" && !existingReceipt) {
            await tx.auditLog.create({ data: { pharmacyId: invoice.pharmacyId, action: "billing.payment.additional_collection", entityType: "billing_payment", entityId: evidence.id } });
          }
          return evidence;
        });
        await recordAuditRequired({
          action: "billing.invoice.daraja_c2b.paid",
          resource: "invoice",
          resourceId: invoice.id,
          tenantId: invoice.pharmacyId,
          details: { paymentId: payment.id, transactionId: transId, amountKes: amount },
        });
        await markWebhookProcessed(inbound.event.id);
        return response(0, "Accepted");
      }

      // Tenant orders are paid to their pharmacy merchant, not the platform C2B shortcode.
      return response(1, "Invoice mismatch");
    });
  } catch (error) {
    console.error("[daraja c2b confirmation]", error);
    return response(1, "Unable to process payment");
  }
}
