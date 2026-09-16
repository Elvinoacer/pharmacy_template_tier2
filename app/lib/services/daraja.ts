import "server-only";

import {
  resolveDarajaCredentials,
  type DarajaCredentials,
} from "@/app/lib/platform/integrations";
import { peekTenant } from "@/app/lib/tenant-context";

const TOKEN_TTL_MS = 55 * 60 * 1000;

type TokenCache = { token: string; expiresAt: number };
const tokenCache = new Map<string, TokenCache>();

export type DarajaEnv = "sandbox" | "production";
export type DarajaTransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export function darajaConfigured(): boolean {
  return Boolean(
    process.env.DARAJA_CONSUMER_KEY?.trim() &&
      process.env.DARAJA_CONSUMER_SECRET?.trim() &&
      process.env.DARAJA_SHORTCODE?.trim() &&
      process.env.DARAJA_PASSKEY?.trim(),
  );
}

export async function darajaConfiguredFor(pharmacyId?: string | null): Promise<boolean> {
  const creds = await resolveDarajaCredentials(pharmacyId ?? peekTenant()?.pharmacyId ?? null);
  return Boolean(creds);
}

export function getDarajaEnv(): DarajaEnv {
  const value = process.env.DARAJA_ENV?.trim().toLowerCase();
  return value === "production" || value === "live" ? "production" : "sandbox";
}

function baseUrl(env: DarajaEnv): string {
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function validHttpsUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:") return url.toString();
    if (process.env.NODE_ENV !== "production" && url.protocol === "http:") return url.toString();
    return null;
  } catch {
    return null;
  }
}

function derivedDarajaCallbackUrl(): string | null {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    try {
      const url = new URL("/api/payments/daraja/callback", configuredAppUrl);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
        return url.toString();
      }
    } catch {
      // Fall through to Vercel's deployment host.
    }
  }

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!vercelHost) return null;
  return validHttpsUrl(
    `https://${vercelHost.replace(/^https?:\/\//, "")}/api/payments/daraja/callback`,
  );
}

function resolveCallbackUrl(input: StkPushInput, creds: DarajaCredentials): string | null {
  return (
    validHttpsUrl(input.callbackUrl) ||
    validHttpsUrl(creds.callbackUrl) ||
    derivedDarajaCallbackUrl()
  );
}

export function formatMpesaPhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (p.startsWith("254")) return p;
  if (p.length === 9) return "254" + p;
  return p;
}

export function phoneLast9(phone: string): string {
  return formatMpesaPhone(phone).slice(-9);
}

/**
 * M-Pesa Express authenticates the request with
 * Base64(BusinessShortCode + Passkey + Timestamp). The timestamp is Kenya
 * local time (Africa/Nairobi / EAT) in YYYYMMDDHHmmss format and the exact
 * same value must be used in both the password and request body.
 *
 * Vercel functions run in UTC. Using Date#toISOString() therefore signs an
 * STK request three hours behind M-Pesa's clock. Daraja can accept the prompt
 * for processing and still finish it with ResultCode 2001 after the customer
 * enters a PIN. Generate the timestamp explicitly in Africa/Nairobi instead.
 */
export function darajaTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}${part("month")}${part("day")}${part("hour")}${part("minute")}${part("second")}`;
}

function password(creds: DarajaCredentials, ts: string): string {
  return Buffer.from(`${creds.shortcode}${creds.passkey}${ts}`).toString("base64");
}

function darajaText(value: string, maxLength: number, fallback: string): string {
  const clean = value
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fallback).slice(0, maxLength);
}

function safeProviderDetail(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const allowed = [
    "requestId",
    "errorCode",
    "errorMessage",
    "ResponseCode",
    "ResponseDescription",
    "CustomerMessage",
    "MerchantRequestID",
    "CheckoutRequestID",
  ];
  const detail: Record<string, unknown> = {};
  for (const key of allowed) {
    if (raw[key] !== undefined) detail[key] = raw[key];
  }
  return Object.keys(detail).length ? detail : undefined;
}

export async function getDarajaToken(creds?: DarajaCredentials): Promise<string> {
  const resolved = creds ?? (await resolveDarajaCredentials(peekTenant()?.pharmacyId ?? null));
  if (!resolved) throw new Error("daraja_not_configured");
  const cacheKey = `${resolved.env}:${resolved.shortcode}:${resolved.consumerKey.slice(0, 8)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const auth = Buffer.from(`${resolved.consumerKey}:${resolved.consumerSecret}`).toString("base64");
  let r: Response;
  try {
    r = await fetch(`${baseUrl(resolved.env)}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error ? `daraja_auth_unreachable:${error.message}` : "daraja_auth_unreachable",
    );
  }

  const raw = await r.text().catch(() => "");
  let j: { access_token?: string; expires_in?: string; errorCode?: string; errorMessage?: string } = {};
  try {
    j = raw ? JSON.parse(raw) : {};
  } catch {
    // Non-JSON provider responses are surfaced below without leaking credentials.
  }

  if (!r.ok) {
    const providerMessage = j.errorMessage || raw.slice(0, 160) || "oauth_request_failed";
    throw new Error(`daraja_auth_failed:${r.status}:${providerMessage}`);
  }
  if (!j.access_token) throw new Error("daraja_auth_failed:no_token");

  const providerTtl = Number(j.expires_in);
  const ttlMs = Number.isFinite(providerTtl) && providerTtl > 120
    ? Math.max(60_000, (providerTtl - 60) * 1000)
    : TOKEN_TTL_MS;
  tokenCache.set(cacheKey, {
    token: j.access_token,
    expiresAt: Date.now() + ttlMs,
  });
  return j.access_token;
}

export type StkPushInput = {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
  credentials?: DarajaCredentials | null;
  transactionType?: DarajaTransactionType;
};

export type StkPushResult =
  | {
      ok: true;
      merchantRequestId: string;
      checkoutRequestId: string;
      customerMessage: string;
      shortcode: string;
      environment: DarajaEnv;
    }
  | {
      ok: false;
      error: string;
      detail?: unknown;
    };

export async function stkPush(input: StkPushInput): Promise<StkPushResult> {
  const creds =
    input.credentials ??
    (await resolveDarajaCredentials(peekTenant()?.pharmacyId ?? null));
  if (!creds) return { ok: false, error: "daraja_not_configured" };

  const amount = Math.max(1, Math.round(Number(input.amount)));
  const phone = formatMpesaPhone(input.phone);
  if (!/^254[17]\d{8}$/.test(phone)) return { ok: false, error: "invalid_phone" };

  let token: string;
  try {
    token = await getDarajaToken(creds);
  } catch (e) {
    const error = e instanceof Error ? e.message : "daraja_auth_failed";
    console.error("[daraja][stk] OAuth failed", { environment: creds.env, error });
    return { ok: false, error };
  }

  const ts = darajaTimestamp();
  const callbackUrl = resolveCallbackUrl(input, creds);
  if (!callbackUrl) return { ok: false, error: "daraja_callback_url_missing" };

  const configuredTransactionType: DarajaTransactionType =
    process.env.DARAJA_TRANSACTION_TYPE?.trim() === "CustomerBuyGoodsOnline"
      ? "CustomerBuyGoodsOnline"
      : "CustomerPayBillOnline";
  const transactionType = input.transactionType ?? configuredTransactionType;
  const accountReference = darajaText(input.accountReference, 12, "Aether");
  const transactionDesc = darajaText(input.transactionDesc, 19, "Payment");

  let res: Response;
  try {
    res = await fetch(`${baseUrl(creds.env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        BusinessShortCode: creds.shortcode,
        Password: password(creds, ts),
        Timestamp: ts,
        TransactionType: transactionType,
        Amount: amount,
        PartyA: phone,
        PartyB: creds.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? `daraja_unreachable:${error.message}` : "daraja_unreachable";
    console.error("[daraja][stk] request failed", { environment: creds.env, error: message });
    return { ok: false, error: message };
  }

  const raw = await res.text().catch(() => "");
  let j: {
    requestId?: string;
    errorCode?: string;
    errorMessage?: string;
    ResponseCode?: string | number;
    ResponseDescription?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    CustomerMessage?: string;
  } = {};
  try {
    j = raw ? JSON.parse(raw) : {};
  } catch {
    // Preserve the HTTP status as the primary diagnostic below.
  }

  const responseCode = j.ResponseCode === undefined ? "" : String(j.ResponseCode);
  if (!res.ok || responseCode !== "0" || !j.CheckoutRequestID) {
    const providerMessage =
      j.errorMessage ||
      j.ResponseDescription ||
      raw.slice(0, 180) ||
      "stk_failed";
    const providerCode = j.errorCode ? `:${j.errorCode}` : "";
    const error = `daraja_stk_failed:${res.status}${providerCode}:${providerMessage}`;
    console.error("[daraja][stk] rejected", {
      environment: creds.env,
      httpStatus: res.status,
      shortcode: creds.shortcode,
      transactionType,
      callbackHost: (() => {
        try {
          return new URL(callbackUrl).host;
        } catch {
          return "invalid";
        }
      })(),
      detail: safeProviderDetail(j),
    });
    return { ok: false, error, detail: safeProviderDetail(j) };
  }

  console.info("[daraja][stk] accepted", {
    environment: creds.env,
    shortcode: creds.shortcode,
    transactionType,
    timestampZone: "Africa/Nairobi",
    checkoutRequestId: j.CheckoutRequestID,
    merchantRequestId: j.MerchantRequestID || "",
  });

  return {
    ok: true,
    merchantRequestId: j.MerchantRequestID || "",
    checkoutRequestId: j.CheckoutRequestID,
    customerMessage: j.CustomerMessage || "STK push sent",
    shortcode: creds.shortcode,
    environment: creds.env,
  };
}

export type StkQueryResult =
  | {
      ok: true;
      resultCode: string;
      resultDesc: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
      detail?: unknown;
    };

export async function stkQuery(
  checkoutRequestId: string,
  credentials?: DarajaCredentials | null,
): Promise<StkQueryResult> {
  const creds =
    credentials ?? (await resolveDarajaCredentials(peekTenant()?.pharmacyId ?? null));
  if (!creds) return { ok: false, error: "daraja_not_configured" };
  if (!checkoutRequestId) return { ok: false, error: "missing_checkout_request_id" };

  let token: string;
  try {
    token = await getDarajaToken(creds);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "daraja_auth_failed" };
  }

  const ts = darajaTimestamp();
  let res: Response;
  try {
    res = await fetch(`${baseUrl(creds.env)}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        BusinessShortCode: creds.shortcode,
        Password: password(creds, ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `daraja_query_unreachable:${error.message}` : "daraja_query_unreachable",
    };
  }

  const raw = await res.text().catch(() => "");
  let j: Record<string, unknown> & {
    ResponseCode?: string | number;
    ResultCode?: string | number;
    ResultDesc?: string;
    errorCode?: string;
    errorMessage?: string;
  } = {};
  try {
    j = raw ? JSON.parse(raw) : {};
  } catch {
    // Preserve the HTTP status below.
  }

  if (!res.ok && j.ResultCode === undefined) {
    return {
      ok: false,
      error: j.errorMessage || raw.slice(0, 180) || `stk_query_failed:${res.status}`,
      detail: safeProviderDetail(j),
    };
  }

  return {
    ok: true,
    resultCode: String(j.ResultCode ?? j.ResponseCode ?? ""),
    resultDesc: String(j.ResultDesc ?? j.errorMessage ?? ""),
    raw: j,
  };
}
