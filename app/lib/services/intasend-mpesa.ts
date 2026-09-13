import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { markInvoicePaid } from "@/app/lib/platform/billing";

export type IntaSendEnv = "sandbox" | "production";

type IntaSendInvoice = {
  id?: string;
  invoice_id?: string;
  state?: string;
  provider?: string;
  currency?: string;
  value?: string | number;
  api_ref?: string;
  failed_reason?: string | null;
};

type IntaSendResponse = {
  invoice?: IntaSendInvoice;
  invoice_id?: string;
  state?: string;
  provider?: string;
  currency?: string;
  value?: string | number;
  api_ref?: string;
  detail?: string;
  message?: string;
};

function env(): IntaSendEnv {
  return process.env.INTASEND_ENV?.trim() === "production" ? "production" : "sandbox";
}

function publicKey(): string | null {
  return process.env.INTASEND_PUBLISHABLE_KEY?.trim() || null;
}

function secretKey(): string | null {
  return process.env.INTASEND_SECRET_KEY?.trim() || null;
}

function challenge(): string | null {
  return process.env.INTASEND_WEBHOOK_CHALLENGE?.trim() || null;
}

function baseUrl(): string {
  return env() === "production" ? "https://payment.intasend.com" : "https://sandbox.intasend.com";
}

function normalizePhone(phone: string): string {
  let value = phone.replace(/\D/g, "");
  if (value.startsWith("0")) value = `254${value.slice(1)}`;
  if (value.startsWith("254")) return value;
  if (value.length === 9 && /^[17]/.test(value)) return `254${value}`;
  return value;
}

function invoiceFromResponse(body: IntaSendResponse): IntaSendInvoice {
  return body.invoice ?? body;
}

function providerError(body: IntaSendResponse, status: number): string {
  return String(body.detail || body.message || `IntaSend M-Pesa STK request failed (HTTP ${status}).`).slice(0, 250);
}

async function request<T>(path: string, init: RequestInit): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { response, body };
}

export function intasendMpesaStkConfigured(): boolean {
  return Boolean(publicKey() && secretKey() && challenge());
}

export async function createIntaSendMpesaStk(input: {
  paymentId: string;
  amount: number;
  phone: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const publishableKey = publicKey();
  const secret = secretKey();
  const webhookChallenge = challenge();
  if (!publishableKey || !secret || !webhookChallenge) {
    throw new Error("intasend_mpesa_not_configured");
  }

  const phone = normalizePhone(input.phone);
  if (!/^254[17]\d{8}$/.test(phone)) throw new Error("invalid_phone");

  let result: { response: Response; body: IntaSendResponse };
  try {
    result = await request<IntaSendResponse>("/api/v1/payment/mpesa-stk-push/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        INTASEND_PUBLIC_API_KEY: publishableKey,
      },
      body: JSON.stringify({
        method: "M-PESA",
        currency: "KES",
        amount: Number(input.amount).toFixed(2),
        phone_number: phone,
        api_ref: input.paymentId,
        public_key: publishableKey,
        host: process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined,
        first_name: input.firstName?.trim() || undefined,
        last_name: input.lastName?.trim() || undefined,
        email: input.email?.trim() || undefined,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request_failed";
    throw new Error(`intasend_unreachable:${reason}`);
  }

  if (!result.response.ok) throw new Error(providerError(result.body, result.response.status));

  const invoice = invoiceFromResponse(result.body);
  const invoiceId = String(invoice.invoice_id || invoice.id || "").trim();
  if (!invoiceId) throw new Error("intasend_missing_invoice_id");

  const apiRef = String(invoice.api_ref || input.paymentId).trim();
  if (apiRef !== input.paymentId) throw new Error("intasend_api_ref_mismatch");

  return {
    invoiceId,
    state: String(invoice.state || "PENDING").toUpperCase(),
    value: Number(invoice.value ?? input.amount),
    provider: String(invoice.provider || "M-PESA"),
    environment: env(),
    phone,
  };
}

export async function getIntaSendPaymentStatus(invoiceId: string) {
  const publishableKey = publicKey();
  if (!publishableKey) throw new Error("intasend_publishable_key_missing");
  if (!invoiceId) throw new Error("missing_invoice_id");

  let result: { response: Response; body: IntaSendResponse };
  try {
    result = await request<IntaSendResponse>("/api/v1/payment/status/", {
      method: "POST",
      headers: {
        INTASEND_PUBLIC_API_KEY: publishableKey,
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
        public_key: publishableKey,
      }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "status_request_failed";
    throw new Error(`intasend_status_unreachable:${reason}`);
  }

  if (!result.response.ok) throw new Error(providerError(result.body, result.response.status));

  const invoice = invoiceFromResponse(result.body);
  return {
    invoiceId: String(invoice.invoice_id || invoice.id || invoiceId),
    state: String(invoice.state || "").toUpperCase(),
    provider: String(invoice.provider || ""),
    currency: String(invoice.currency || ""),
    value: Number(invoice.value),
    apiRef: String(invoice.api_ref || ""),
    failedReason: invoice.failed_reason || null,
  };
}

export async function reconcileIntaSendBillingPayments(limit = 50) {
  const rows = await prismaUnscoped.billingPayment.findMany({
    where: {
      provider: "intasend",
      status: { in: ["pending", "processing"] },
      checkoutRequestId: { not: null },
      updatedAt: { lt: new Date(Date.now() - 30_000) },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  let reconciled = 0;
  for (const row of rows) {
    try {
      const status = await getIntaSendPaymentStatus(row.checkoutRequestId!);
      if (status.apiRef && status.apiRef !== row.id) continue;
      if (status.currency && status.currency !== "KES") continue;
      if (Number.isFinite(status.value) && Math.abs(Number(row.amountKes) - status.value) > 0.01) continue;

      if (status.state === "COMPLETE") {
        await prismaUnscoped.billingPayment.update({
          where: { id: row.id },
          data: {
            status: "succeeded",
            providerRef: status.invoiceId,
            checkoutRequestId: status.invoiceId,
            paidAt: new Date(),
            failureReason: null,
          },
        });
        await markInvoicePaid(row.invoiceId);
        reconciled++;
      } else if (status.state === "FAILED") {
        await prismaUnscoped.billingPayment.update({
          where: { id: row.id },
          data: {
            status: "failed",
            failureReason: status.failedReason || "IntaSend M-Pesa payment failed",
          },
        });
        reconciled++;
      }
    } catch (error) {
      console.error("[intasend billing reconciliation]", row.id, error instanceof Error ? error.message : "failed");
    }
  }

  return { scanned: rows.length, reconciled };
}
