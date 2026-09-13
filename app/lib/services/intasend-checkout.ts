import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";

export type IntaSendEnv = "sandbox" | "production";

type CheckoutResponse = {
  id?: string;
  invoice_id?: string;
  url?: string;
  signature?: string;
  detail?: string;
  message?: string;
};

function intasendEnv(): IntaSendEnv {
  return process.env.INTASEND_ENV?.trim() === "production" ? "production" : "sandbox";
}

function publishableKey(): string | null {
  return process.env.INTASEND_PUBLISHABLE_KEY?.trim() || null;
}

export function intasendWebhookChallenge(): string | null {
  return process.env.INTASEND_WEBHOOK_CHALLENGE?.trim() || null;
}

export function intasendCheckoutConfigured(): boolean {
  if (!publishableKey() || !intasendWebhookChallenge()) return false;
  if (process.env.VERCEL_ENV === "production" && intasendEnv() !== "production") return false;
  return true;
}

function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  return vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "")}` : null;
}

function checkoutEndpoint(env: IntaSendEnv): string {
  return env === "production"
    ? "https://api.intasend.com/api/v1/checkout/"
    : "https://sandbox.intasend.com/api/v1/checkout/";
}

function safeProviderMessage(body: CheckoutResponse, status: number): string {
  const detail = body.detail || body.message;
  if (detail) return `IntaSend checkout could not start: ${detail.slice(0, 180)}`;
  return `IntaSend checkout could not start (HTTP ${status}).`;
}

export async function createIntaSendBillingCheckout(input: {
  invoiceId: string;
  email?: string | null;
  phone?: string | null;
  actorId?: string | null;
}) {
  const key = publishableKey();
  const challenge = intasendWebhookChallenge();
  const env = intasendEnv();
  const origin = appOrigin();

  if (!key || !challenge) throw new Error("Secure checkout is not configured yet.");
  if (process.env.VERCEL_ENV === "production" && env !== "production") {
    throw new Error("Live IntaSend checkout credentials are required in production.");
  }
  if (!origin) throw new Error("The application URL is not configured for secure checkout.");

  const invoice = await prismaUnscoped.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new Error("invoice_not_found");
  if (invoice.status === "paid") {
    return { ok: true as const, alreadyPaid: true as const, invoiceId: invoice.id, url: null };
  }
  if (invoice.status !== "open" || Number(invoice.totalKes) <= 0) {
    throw new Error("invoice_not_collectible");
  }

  const existing = await prismaUnscoped.billingPayment.findFirst({
    where: { invoiceId: invoice.id, status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    if (
      existing.provider === "intasend" &&
      existing.providerRef?.startsWith("https://")
    ) {
      return {
        ok: true as const,
        alreadyPaid: false as const,
        resumed: true as const,
        invoiceId: invoice.id,
        paymentId: existing.id,
        url: existing.providerRef,
      };
    }
    throw new Error("A payment is already awaiting confirmation. Complete it or wait for its status to update before starting another one.");
  }

  const payment = await prismaUnscoped.billingPayment.create({
    data: {
      pharmacyId: invoice.pharmacyId,
      invoiceId: invoice.id,
      provider: "intasend",
      status: "pending",
      amountKes: invoice.totalKes,
      phone: input.phone?.trim() || null,
    },
  });

  let response: Response;
  try {
    response = await fetch(checkoutEndpoint(env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IntaSend-Public-API-Key": key,
      },
      body: JSON.stringify({
        amount: Number(invoice.totalKes).toFixed(2),
        currency: "KES",
        api_ref: payment.id,
        method: "CARD-PAYMENT",
        channel: "WEBSITE",
        host: origin,
        redirect_url: `${origin}/onboard/billing?checkout=returned`,
        country: "KE",
        email: input.email?.trim() || undefined,
        phone_number: input.phone?.trim() || undefined,
        card_tarrif: "BUSINESS-PAYS",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_request_failed";
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: message.slice(0, 250) },
    });
    throw new Error("Secure checkout could not be reached. Please try the M-Pesa prompt or try again shortly.");
  }

  const body = (await response.json().catch(() => ({}))) as CheckoutResponse;
  const checkoutId = body.invoice_id || body.id;
  const checkoutUrl = body.url;

  if (!response.ok || !checkoutId || !checkoutUrl) {
    const reason = safeProviderMessage(body, response.status);
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: reason.slice(0, 250) },
    });
    throw new Error(reason);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "IntaSend returned an invalid checkout URL." },
    });
    throw new Error("Secure checkout returned an invalid URL.");
  }
  if (parsedUrl.protocol !== "https:") {
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "IntaSend checkout URL was not HTTPS." },
    });
    throw new Error("Secure checkout returned an unsafe URL.");
  }

  await prismaUnscoped.billingPayment.update({
    where: { id: payment.id },
    data: {
      status: "processing",
      checkoutRequestId: checkoutId,
      // Preserve the hosted URL while the checkout is in-flight so a retry resumes
      // the same checkout instead of creating a second payable session.
      providerRef: parsedUrl.toString(),
    },
  });

  await recordAuditRequired({
    actorId: input.actorId,
    action: "billing.invoice.checkout",
    resource: "invoice",
    resourceId: invoice.id,
    tenantId: invoice.pharmacyId,
    details: { paymentId: payment.id, provider: "intasend", method: "card_checkout" },
  });

  return {
    ok: true as const,
    alreadyPaid: false as const,
    resumed: false as const,
    invoiceId: invoice.id,
    paymentId: payment.id,
    url: parsedUrl.toString(),
  };
}
