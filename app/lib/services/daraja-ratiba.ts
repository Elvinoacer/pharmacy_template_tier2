import "server-only";

import { resolveDarajaCredentials, type DarajaCredentials } from "@/app/lib/platform/integrations";
import { formatMpesaPhone, getDarajaToken } from "@/app/lib/services/daraja";

export const DARAJA_RATIBA_PREFIX = "daraja_ratiba:";
export const DARAJA_RATIBA_PENDING_PREFIX = "daraja_ratiba_pending:";

export type RatibaProviderResponse = {
  ok: boolean;
  responseCode: string;
  responseMessage: string;
  responseRefId: string | null;
  standingOrderId: string | null;
  raw: Record<string, unknown>;
};

function apiBase(credentials: DarajaCredentials) {
  return credentials.env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nestedString(root: unknown, keys: string[]): string | null {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [root];
  const seen = new Set<object>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current as object)) continue;
    seen.add(current as object);
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (wanted.has(key.toLowerCase()) && value !== undefined && value !== null) {
        const text = String(value).trim();
        if (text) return text;
      }
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return null;
}

function ymd(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}${part("month")}${part("day")}`;
}

function callbackUrl() {
  const configured = process.env.DARAJA_RATIBA_CALLBACK_URL?.trim();
  let value = configured || "";
  if (!value) {
    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "");
    if (origin) value = new URL("/api/payments/daraja/ratiba/callback", origin).toString();
  }
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const secret = process.env.DARAJA_RATIBA_WEBHOOK_SECRET?.trim();
    if (!secret) return null;
    url.searchParams.set("token", secret);
    return url.toString();
  } catch {
    return null;
  }
}

export function ratibaConfigured() {
  return (
    process.env.DARAJA_RATIBA_ENABLED?.trim().toLowerCase() === "true" &&
    Boolean(process.env.DARAJA_CONSUMER_KEY?.trim()) &&
    Boolean(process.env.DARAJA_CONSUMER_SECRET?.trim()) &&
    Boolean(process.env.DARAJA_SHORTCODE?.trim() || process.env.DARAJA_ENV?.trim().toLowerCase() !== "production") &&
    Boolean(callbackUrl())
  );
}

async function requestRatiba(path: string, body: Record<string, unknown>): Promise<RatibaProviderResponse> {
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    return { ok: false, responseCode: "CONFIG", responseMessage: "Platform M-PESA is not configured.", responseRefId: null, standingOrderId: null, raw: {} };
  }

  let token: string;
  try {
    token = await getDarajaToken(credentials);
  } catch (error) {
    return {
      ok: false,
      responseCode: "AUTH",
      responseMessage: error instanceof Error ? error.message : "Daraja authentication failed",
      responseRefId: null,
      standingOrderId: null,
      raw: {},
    };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase(credentials)}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return {
      ok: false,
      responseCode: "NETWORK",
      responseMessage: error instanceof Error ? error.message : "Daraja Ratiba request failed",
      responseRefId: null,
      standingOrderId: null,
      raw: {},
    };
  }

  const text = await response.text().catch(() => "");
  let raw: Record<string, unknown> = {};
  try {
    raw = asRecord(text ? JSON.parse(text) : {}) ?? {};
  } catch {
    raw = {};
  }

  const responseCode = nestedString(raw, ["ResponseCode", "responseCode", "ResultCode"]) || String(response.status);
  const responseMessage = nestedString(raw, ["ResponseMessage", "responseMessage", "ResponseDescription", "ResultDesc", "errorMessage"]) || (response.ok ? "Accepted" : `HTTP ${response.status}`);
  const responseRefId = nestedString(raw, ["ResponseRefID", "ResponseRefId", "responseRefId", "OriginatorConversationID"]);
  const standingOrderId = nestedString(raw, ["StandingOrderID", "StandingOrderId", "standingOrderId"]);
  const acceptedCode = responseCode === "200" || responseCode === "0";

  return {
    ok: response.ok && acceptedCode,
    responseCode,
    responseMessage,
    responseRefId,
    standingOrderId,
    raw,
  };
}

export function ratibaAccountReference(subscriptionId: string) {
  return `AETH${subscriptionId.replace(/-/g, "").slice(0, 9)}`.slice(0, 13);
}

export function ratibaStandingOrderName(subscriptionId: string) {
  return `Afyvia-${subscriptionId.replace(/-/g, "").slice(0, 12)}`;
}

export async function createMonthlyRatibaStandingOrder(input: {
  subscriptionId: string;
  phone: string;
  amountKes: number;
  startDate: Date;
  endDate: Date;
}) {
  if (!ratibaConfigured()) {
    return { ok: false, responseCode: "NOT_ENABLED", responseMessage: "M-PESA Ratiba is not enabled for this platform.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    return { ok: false, responseCode: "CONFIG", responseMessage: "Platform M-PESA is not configured.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }
  const phone = formatMpesaPhone(input.phone);
  if (!/^254[17]\d{8}$/.test(phone)) {
    return { ok: false, responseCode: "PHONE", responseMessage: "Enter a valid Safaricom M-PESA phone number.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }
  const callback = callbackUrl();
  if (!callback) {
    return { ok: false, responseCode: "CALLBACK", responseMessage: "Ratiba callback configuration is incomplete.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }

  const frequency = Number(process.env.DARAJA_RATIBA_MONTHLY_FREQUENCY || "5");
  const receiverType = process.env.DARAJA_RATIBA_RECEIVER_IDENTIFIER_TYPE?.trim() || "4";
  const transactionType = process.env.DARAJA_RATIBA_TRANSACTION_TYPE?.trim() || "Standing Order Pay Bill External Third Party";

  return requestRatiba("/standingorder/v1/createStandingOrderExternal", {
    StandingOrderName: ratibaStandingOrderName(input.subscriptionId),
    StartDate: ymd(input.startDate),
    EndDate: ymd(input.endDate),
    BusinessShortCode: credentials.shortcode,
    TransactionType: transactionType,
    ReceiverPartyIdentifierType: receiverType,
    Amount: Math.max(1, Math.round(input.amountKes)),
    PartyA: phone,
    CallBackURL: callback,
    AccountReference: ratibaAccountReference(input.subscriptionId),
    TransactionDesc: "Afyvia monthly",
    Frequency: Number.isFinite(frequency) && frequency > 0 ? frequency : 5,
  });
}

export async function queryRatibaStandingOrder(standingOrderId: string) {
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    return { ok: false, responseCode: "CONFIG", responseMessage: "Platform M-PESA is not configured.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }
  return requestRatiba("/standingorder/v1/queryStandingOrder", {
    StandingOrderID: standingOrderId,
    BusinessShortCode: credentials.shortcode,
  });
}

export async function cancelRatibaStandingOrder(standingOrderId: string) {
  const credentials = await resolveDarajaCredentials(null);
  const callback = callbackUrl();
  if (!credentials || !callback) {
    return { ok: false, responseCode: "CONFIG", responseMessage: "Ratiba cancellation is not configured.", responseRefId: null, standingOrderId: null, raw: {} } satisfies RatibaProviderResponse;
  }
  return requestRatiba("/standingorder/v1/cancelStandingOrderExternal", {
    StandingOrderID: standingOrderId,
    BusinessShortCode: credentials.shortcode,
    CallBackURL: callback,
  });
}

export function ratibaStandingOrderId(externalSubscriptionId: string | null | undefined) {
  if (!externalSubscriptionId?.startsWith(DARAJA_RATIBA_PREFIX)) return null;
  return externalSubscriptionId.slice(DARAJA_RATIBA_PREFIX.length) || null;
}

export function ratibaPendingRef(externalSubscriptionId: string | null | undefined) {
  if (!externalSubscriptionId?.startsWith(DARAJA_RATIBA_PENDING_PREFIX)) return null;
  return externalSubscriptionId.slice(DARAJA_RATIBA_PENDING_PREFIX.length) || null;
}
