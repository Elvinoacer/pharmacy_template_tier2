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

export function darajaConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_DARAJA_ENABLED?.trim().toLowerCase() === "false") {
    return false;
  }
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
  return process.env.DARAJA_ENV?.trim() === "production" ? "production" : "sandbox";
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
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function derivedDarajaCallbackUrl(): string | null {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    try {
      const url = new URL("/api/payments/daraja/callback", configuredAppUrl);
      if (url.protocol === "https:") return url.toString();
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

function timestamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function password(creds: DarajaCredentials, ts: string): string {
  return Buffer.from(`${creds.shortcode}${creds.passkey}${ts}`).toString("base64");
}

export async function getDarajaToken(creds?: DarajaCredentials): Promise<string> {
  const resolved = creds ?? (await resolveDarajaCredentials(peekTenant()?.pharmacyId ?? null));
  if (!resolved) throw new Error("daraja_not_configured");
  const cacheKey = `${resolved.shortcode}:${resolved.consumerKey.slice(0, 8)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const auth = Buffer.from(`${resolved.consumerKey}:${resolved.consumerSecret}`).toString("base64");
  const r = await fetch(`${baseUrl(resolved.env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`daraja_auth_failed:${r.status}:${body.slice(0, 120)}`);
  }
  const j = (await r.json()) as { access_token?: string; expires_in?: string };
  if (!j.access_token) throw new Error("daraja_auth_failed:no_token");
  tokenCache.set(cacheKey, {
    token: j.access_token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
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
};

export type StkPushResult =
  | {
      ok: true;
      merchantRequestId: string;
      checkoutRequestId: string;
      customerMessage: string;
      shortcode: string;
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
    return { ok: false, error: e instanceof Error ? e.message : "daraja_auth_failed" };
  }

  const ts = timestamp();
  const callbackUrl = resolveCallbackUrl(input, creds);
  if (!callbackUrl) return { ok: false, error: "daraja_callback_url_missing" };

  let res: Response;
  try {
    res = await fetch(`${baseUrl(creds.env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: creds.shortcode,
        Password: password(creds, ts),
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: creds.shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: input.accountReference.slice(0, 12),
        TransactionDesc: input.transactionDesc.slice(0, 13),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `daraja_unreachable:${error.message}` : "daraja_unreachable",
    };
  }

  const j = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!res.ok || j.ResponseCode !== "0" || !j.CheckoutRequestID) {
    return {
      ok: false,
      error: j.errorMessage || j.ResponseDescription || "stk_failed",
      detail: j,
    };
  }

  return {
    ok: true,
    merchantRequestId: j.MerchantRequestID || "",
    checkoutRequestId: j.CheckoutRequestID,
    customerMessage: j.CustomerMessage || "STK push sent",
    shortcode: creds.shortcode,
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

  const ts = timestamp();
  let res: Response;
  try {
    res = await fetch(`${baseUrl(creds.env)}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: creds.shortcode,
        Password: password(creds, ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `daraja_query_unreachable:${error.message}` : "daraja_query_unreachable",
    };
  }

  const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ResponseCode?: string;
    ResultCode?: string | number;
    ResultDesc?: string;
    errorMessage?: string;
  };

  if (!res.ok && j.ResultCode === undefined) {
    return { ok: false, error: j.errorMessage || "stk_query_failed", detail: j };
  }

  return {
    ok: true,
    resultCode: String(j.ResultCode ?? j.ResponseCode ?? ""),
    resultDesc: String(j.ResultDesc ?? j.errorMessage ?? ""),
    raw: j,
  };
}
