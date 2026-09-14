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
  return Boolean(publishableKey() && intasendWebhookChallenge());
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

function providerDetail(body: CheckoutResponse, status: number): string {
  return String(body.detail || body.message || `HTTP ${status}`).slice(0, 180);
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

  if (!key || !challenge) {
    console.error("[card checkout] payment configuration is unavailable");
    throw new Error("Secure card checkout is temporarily unavailable. Please try again later.");
  }
  if (!origin) {
    console.error("[card checkout] application origin is unavailable");
    throw new Error("Secure card checkout is temporarily unavailable. Please try again later.");
  }

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
    console.error("[card checkout] provider request failed", error);
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "Secure card checkout could not be reached. Please try again shortly." },
    });
    throw new Error("Secure card checkout could not be reached. Please try again shortly.");
  }

  const body = (await response.json().catch(() => ({}))) as CheckoutResponse;
  const checkoutId = body.invoice_id || body.id;
  const checkoutUrl = body.url;

  if (!response.ok || !checkoutId || !checkoutUrl) {
    console.warn("[card checkout] provider rejected checkout", {
      status: response.status,
      detail: providerDetail(body, response.status),
    });
    const reason = "Secure card checkout could not be started. Please try again.";
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: reason },
    });
    throw new Error(reason);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    console.error("[card checkout] invalid provider checkout URL");
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "Secure checkout could not be opened safely." },
    });
    throw new Error("Secure checkout could not be opened safely. Please try again.");
  }
  if (parsedUrl.protocol !== "https:") {
    console.error("[card checkout] rejected non-HTTPS checkout URL");
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "Secure checkout could not be opened safely." },
    });
    throw new Error("Secure checkout could not be opened safely. Please try again.");
  }

  await prismaUnscoped.billingPayment.update({
    where: { id: payment.id },
    data: {
      status: "processing",
      checkoutRequestId: checkoutId,
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
