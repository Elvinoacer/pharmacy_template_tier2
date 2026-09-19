import "server-only";

import { randomUUID } from "node:crypto";

const INTASEND_REQUEST_TIMEOUT_MS = 12_000;

type IntasendKeyEnvironment = "test" | "live" | "unknown";

export type IntasendCheckoutInput = {
  amount: number;
  currency?: string;
  apiRef: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  redirectUrl: string;
  comment?: string;
};

export type IntasendCheckoutResult =
  | {
      ok: true;
      url: string;
      id: string;
      invoiceId: string;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type IntasendPaymentStatus = {
  invoiceId: string;
  state: "COMPLETE" | "PENDING" | "PROCESSING" | "FAILED";
  provider?: string;
  charges?: number;
  netAmount?: number;
  currency: string;
  value: number;
  apiRef: string;
  failedReason?: string | null;
};

export type IntasendConfig = {
  publishableKey: string;
  secretKey: string;
  isTest: boolean;
  baseUrl: string;
  appBaseUrl: string;
  webhookChallenge: string;
  keyEnvironment: IntasendKeyEnvironment;
  configurationIssues: string[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function truncate(value: string, length = 240) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function keyEnvironment(key: string): IntasendKeyEnvironment {
  if (/(?:^|_)test(?:_|$)/i.test(key)) return "test";
  if (/(?:^|_)live(?:_|$)/i.test(key)) return "live";
  return "unknown";
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: truncate(error.message, 300) };
  }
  return { name: "UnknownError", message: truncate(String(error), 300) };
}

function logIntasend(
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown> = {},
) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "intasend",
    event,
    ...details,
  };

  // Keep logs machine-readable and never include credentials, request headers,
  // phone numbers, email addresses, or the provider's full response body.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

function sanitizeProviderError(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";

  if (typeof value === "string") {
    return truncate(
      value
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .replace(/\b(?:\+?254|0)?[17]\d{8}\b/g, "[phone]")
        .replace(/https?:\/\/\S+/gi, "[url]"),
      240,
    );
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeProviderError(item, depth + 1));
  if (!isRecord(value)) return typeof value;

  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value).slice(0, 20)) {
    if (/^(?:value|input|received|payload|request|headers|authorization|token|secret|api[_-]?key|publishable[_-]?key)$/i.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }
    safe[key] = sanitizeProviderError(child, depth + 1);
  }
  return safe;
}

function providerBodySummary(body: string): Record<string, unknown> {
  if (!body.trim()) return {};

  try {
    const parsed: unknown = JSON.parse(body);
    if (!isRecord(parsed)) return { response: sanitizeProviderError(body) };

    const summary: Record<string, unknown> = {};
    for (const field of ["type", "code", "detail", "message", "error", "status", "errors"]) {
      if (parsed[field] !== undefined) {
        summary[field] = sanitizeProviderError(parsed[field]);
      }
    }
    return Object.keys(summary).length
      ? summary
      : { responseKeys: Object.keys(parsed).slice(0, 20) };
  } catch {
    return { response: sanitizeProviderError(body.replace(/\s+/g, " ")) };
  }
}
function parseJsonRecord(body: string): JsonRecord | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanProviderText(value: string | null | undefined, fallback: string) {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_\-: ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}

function validEmail(value: string | null | undefined) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function validKenyanPhone(value: string | null | undefined) {
  if (!value) return undefined;
  const formatted = formatIntasendPhone(value);
  return /^254[17]\d{8}$/.test(formatted) ? formatted : undefined;
}

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INTASEND_REQUEST_TIMEOUT_MS);
  return { controller, timer };
}

function mockCheckoutUrl(input: IntasendCheckoutInput, appBaseUrl: string, prefix: string) {
  const mockId = `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
  return {
    id: mockId,
    invoiceId: mockId,
    url: `${appBaseUrl}/api/payments/intasend/mock-checkout?api_ref=${encodeURIComponent(
      input.apiRef,
    )}&amount=${encodeURIComponent(input.amount.toFixed(2))}&invoice_id=${encodeURIComponent(
      mockId,
    )}&redirect_url=${encodeURIComponent(input.redirectUrl)}`,
  };
}

export function getIntasendConfig(): IntasendConfig {
  const publishableKey =
    process.env.INTASEND_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_INTASEND_PUBLISHABLE_KEY?.trim() ||
    "";
  const secretKey = process.env.INTASEND_SECRET_KEY?.trim() || "";
  const explicitTest = process.env.INTASEND_TEST?.trim().toLowerCase();
  const keyEnv = keyEnvironment(publishableKey);
  const isTest =
    explicitTest === "true" ||
    (explicitTest !== "false" && keyEnv === "test") ||
    (!publishableKey && process.env.NODE_ENV !== "production");
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000")
  ).replace(/\/$/, "");
  const configurationIssues: string[] = [];

  if (publishableKey && keyEnv !== "unknown") {
    const expectedEnv: IntasendKeyEnvironment = isTest ? "test" : "live";
    if (keyEnv !== expectedEnv) {
      configurationIssues.push(
        `The IntaSend ${keyEnv} publishable key does not match INTASEND_TEST=${isTest}.`,
      );
    }
  }

  if (secretKey) {
    const secretEnv = keyEnvironment(secretKey);
    if (secretEnv !== "unknown" && keyEnv !== "unknown" && secretEnv !== keyEnv) {
      configurationIssues.push("The IntaSend publishable and secret keys belong to different environments.");
    }
  }

  if (!appBaseUrl) {
    configurationIssues.push("NEXT_PUBLIC_APP_URL must be configured for IntaSend checkout redirects.");
  } else if (!validAbsoluteUrl(appBaseUrl)) {
    configurationIssues.push("NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL.");
  } else if (!isTest && new URL(appBaseUrl).protocol !== "https:") {
    configurationIssues.push("Live IntaSend checkout requires an HTTPS NEXT_PUBLIC_APP_URL.");
  }

  if (process.env.NODE_ENV === "production" && !publishableKey) {
    configurationIssues.push("INTASEND_PUBLISHABLE_KEY is missing in production.");
  }

  return {
    publishableKey,
    secretKey,
    isTest,
    baseUrl: isTest ? "https://sandbox.intasend.com" : "https://api.intasend.com",
    appBaseUrl,
    webhookChallenge: process.env.INTASEND_WEBHOOK_CHALLENGE?.trim() || "",
    keyEnvironment: keyEnv,
    configurationIssues,
  };
}

export function isIntasendConfigured(): boolean {
  const config = getIntasendConfig();
  // Local development may intentionally use the in-app mock checkout.
  if (!config.publishableKey && process.env.NODE_ENV !== "production") return true;
  return Boolean(config.publishableKey && config.configurationIssues.length === 0);
}

export function formatIntasendPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 10) return `254${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `254${cleaned}`;
  return cleaned;
}

export async function createIntasendCheckout(
  input: IntasendCheckoutInput,
): Promise<IntasendCheckoutResult> {
  const config = getIntasendConfig();
  const operationId = randomUUID();
  const amount = Number(input.amount);

  logIntasend("info", "checkout.create.started", {
    operationId,
    apiRef: input.apiRef,
    amount,
    currency: input.currency || "KES",
    environment: config.isTest ? "test" : "live",
  });

  if (!Number.isFinite(amount) || amount <= 0) {
    logIntasend("error", "checkout.create.invalid_amount", { operationId, apiRef: input.apiRef });
    return {
      ok: false,
      error: "intasend_invalid_amount",
      message: "The payment amount is invalid. Refresh the page and try again.",
    };
  }

  if (config.configurationIssues.length) {
    logIntasend("error", "checkout.create.configuration_error", {
      operationId,
      apiRef: input.apiRef,
      issues: config.configurationIssues,
      environment: config.isTest ? "test" : "live",
    });
    return {
      ok: false,
      error: "intasend_configuration_error",
      message:
        process.env.NODE_ENV === "production"
          ? "Online payment is temporarily unavailable. Please contact support or try again later."
          : config.configurationIssues[0],
    };
  }

  if (
    !validAbsoluteUrl(input.redirectUrl) ||
    (!config.isTest && new URL(input.redirectUrl).protocol !== "https:")
  ) {
    logIntasend("error", "checkout.create.invalid_redirect_url", {
      operationId,
      apiRef: input.apiRef,
    });
    return {
      ok: false,
      error: "intasend_invalid_redirect_url",
      message: "The payment return address is invalid. Please refresh and try again.",
    };
  }

  // A missing key is intentionally supported only as a local mock. Never hide
  // a production configuration error behind a fake successful payment.
  if (!config.publishableKey) {
    if (process.env.NODE_ENV === "production") {
      logIntasend("error", "checkout.create.missing_key", { operationId, apiRef: input.apiRef });
      return {
        ok: false,
        error: "intasend_not_configured",
        message: "Online payment is not configured. Please contact support.",
      };
    }

    const mock = mockCheckoutUrl(input, config.appBaseUrl, "is_mock");
    logIntasend("warn", "checkout.create.mock", {
      operationId,
      apiRef: input.apiRef,
      amount,
    });
    return { ok: true, ...mock };
  }

  const apiRef = cleanProviderText(input.apiRef, `invoice-${operationId.slice(0, 8)}`);
  const currency = input.currency || "KES";
  const minimalBody = {
    amount: amount.toFixed(2),
    currency,
    api_ref: apiRef,
    redirect_url: input.redirectUrl,
  };
  const body = {
    ...minimalBody,
    email: validEmail(input.email),
    first_name: cleanProviderText(input.firstName, "Customer"),
    last_name: input.lastName ? cleanProviderText(input.lastName, "Customer") : undefined,
    phone_number: validKenyanPhone(input.phone),
  };
  const { controller, timer } = withTimeout();
  const requestCheckout = (requestBody: Record<string, unknown>) =>
    fetch(`${config.baseUrl}/api/v1/checkout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Checkout-link creation is authenticated by the public key. The
        // secret key is deliberately not sent to this endpoint.
        "X-IntaSend-Public-API-Key": config.publishableKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

  try {
    let response = await requestCheckout(body);
    let responseText = await response.text().catch(() => "");

    // IntaSend returns HTTP 400 for field-level checkout validation failures.
    // Optional prefill fields can vary by account/environment, so retry once
    // with the documented minimal checkout payload before surfacing an error.
    if (!response.ok && response.status === 400) {
      logIntasend("warn", "checkout.create.retrying_minimal_payload", {
        operationId,
        apiRef: input.apiRef,
        httpStatus: response.status,
        provider: providerBodySummary(responseText),
      });
      response = await requestCheckout(minimalBody);
      responseText = await response.text().catch(() => "");
    }

    if (!response.ok) {
      logIntasend("error", "checkout.create.provider_rejected", {
        operationId,
        apiRef: input.apiRef,
        httpStatus: response.status,
        provider: providerBodySummary(responseText),
      });
      return {
        ok: false,
        error: "intasend_checkout_error",
        message: "Unable to create the payment checkout. Please try again shortly.",
      };
    }

    const payload = parseJsonRecord(responseText);
    const checkout = isRecord(payload?.checkout)
      ? payload.checkout
      : isRecord(payload?.data)
        ? payload.data
        : payload;
    const url =
      stringValue(checkout?.url) ||
      stringValue(checkout?.checkout_url) ||
      stringValue(checkout?.checkoutUrl);
    const providerId = stringValue(checkout?.id) || stringValue(checkout?.invoice_id);
    const invoiceId = stringValue(checkout?.invoice_id) || providerId;

    if (!url || !validAbsoluteUrl(url) || !providerId || !invoiceId) {
      logIntasend("error", "checkout.create.invalid_provider_response", {
        operationId,
        apiRef: input.apiRef,
        httpStatus: response.status,
        response: providerBodySummary(responseText),
      });
      return {
        ok: false,
        error: "intasend_invalid_response",
        message: "The payment provider returned an invalid checkout response. Please try again.",
      };
    }

    logIntasend("info", "checkout.create.succeeded", {
      operationId,
      apiRef: input.apiRef,
      providerInvoiceId: invoiceId,
      httpStatus: response.status,
    });
    return { ok: true, url, id: providerId, invoiceId };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    logIntasend("error", timedOut ? "checkout.create.timeout" : "checkout.create.network_error", {
      operationId,
      apiRef: input.apiRef,
      error: errorDetails(error),
    });
    return {
      ok: false,
      error: timedOut ? "intasend_timeout" : "intasend_connection_error",
      message: timedOut
        ? "The payment provider took too long to respond. Please try again."
        : "Could not connect to the payment provider. Please try again shortly.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function queryIntasendPaymentStatus(
  invoiceId: string,
): Promise<IntasendPaymentStatus | null> {
  const config = getIntasendConfig();
  const operationId = randomUUID();
  if (!config.publishableKey || config.configurationIssues.some((issue) => issue.includes("key"))) {
    logIntasend("warn", "payment.status.skipped", { operationId, invoiceId });
    return null;
  }

  const { controller, timer } = withTimeout();
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/payment/status/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IntaSend-Public-API-Key": config.publishableKey,
        ...(config.secretKey ? { Authorization: `Bearer ${config.secretKey}` } : {}),
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
      signal: controller.signal,
    });
    const responseText = await response.text().catch(() => "");
    if (!response.ok) {
      logIntasend("warn", "payment.status.provider_rejected", {
        operationId,
        invoiceId,
        httpStatus: response.status,
        provider: providerBodySummary(responseText),
      });
      return null;
    }

    const data = parseJsonRecord(responseText);
    const statusPayload = isRecord(data?.data) ? data.data : data;
    const invoice = isRecord(statusPayload?.invoice) ? statusPayload.invoice : statusPayload;
    if (!invoice) return null;

    const rawState = stringValue(invoice.state)?.toUpperCase();
    if (!rawState || !["COMPLETE", "PENDING", "PROCESSING", "FAILED"].includes(rawState)) {
      logIntasend("warn", "payment.status.invalid_state", { operationId, invoiceId });
      return null;
    }

    const value = Number(invoice.value);
    if (!Number.isFinite(value)) {
      logIntasend("warn", "payment.status.invalid_amount", { operationId, invoiceId });
      return null;
    }

    logIntasend("info", "payment.status.received", {
      operationId,
      invoiceId,
      state: rawState,
    });
    return {
      invoiceId: stringValue(invoice.invoice_id) || invoiceId,
      state: rawState as IntasendPaymentStatus["state"],
      provider: stringValue(invoice.provider) || "INTASEND",
      charges: Number(invoice.charges || 0),
      netAmount: Number(invoice.net_amount || invoice.value || 0),
      currency: stringValue(invoice.currency) || "KES",
      value,
      apiRef: stringValue(invoice.api_ref) || "",
      failedReason: stringValue(invoice.failed_reason),
    };
  } catch (error) {
    logIntasend("warn", "payment.status.network_error", {
      operationId,
      invoiceId,
      error: errorDetails(error),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function verifyIntasendWebhookChallenge(challenge: string | null | undefined): boolean {
  const config = getIntasendConfig();
  if (config.webhookChallenge) {
    return Boolean(challenge && challenge === config.webhookChallenge);
  }
  // A missing challenge is tolerable for local development only. Production
  // webhooks must be authenticated before they can settle an invoice.
  return process.env.NODE_ENV !== "production";
}

export { logIntasend };
