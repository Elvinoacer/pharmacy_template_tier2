import "server-only";

/**
 * Daraja (Safaricom M-Pesa) client — token cache, STK push, STK query.
 *
 * Env:
 *   DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE,
 *   DARAJA_PASSKEY, DARAJA_ENV (sandbox|production), DARAJA_CALLBACK_URL
 */

const TOKEN_TTL_MS = 55 * 60 * 1000; // refresh before the usual 1h expiry

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export type DarajaEnv = "sandbox" | "production";

export function darajaConfigured(): boolean {
  return Boolean(
    process.env.DARAJA_CONSUMER_KEY?.trim() &&
      process.env.DARAJA_CONSUMER_SECRET?.trim() &&
      process.env.DARAJA_SHORTCODE?.trim() &&
      process.env.DARAJA_PASSKEY?.trim(),
  );
}

export function getDarajaEnv(): DarajaEnv {
  return process.env.DARAJA_ENV?.trim() === "production" ? "production" : "sandbox";
}

function baseUrl(): string {
  return getDarajaEnv() === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/** Normalize to 2547XXXXXXXX (Daraja PartyA / PhoneNumber). */
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

function password(ts: string): string {
  const shortcode = process.env.DARAJA_SHORTCODE!.trim();
  const passkey = process.env.DARAJA_PASSKEY!.trim();
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
}

export async function getDarajaToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  const key = process.env.DARAJA_CONSUMER_KEY?.trim();
  const secret = process.env.DARAJA_CONSUMER_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("daraja_not_configured");
  }

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const r = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`daraja_auth_failed:${r.status}:${body.slice(0, 120)}`);
  }
  const j = (await r.json()) as { access_token?: string; expires_in?: string };
  if (!j.access_token) throw new Error("daraja_auth_failed:no_token");
  tokenCache = {
    token: j.access_token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  return j.access_token;
}

export type StkPushInput = {
  amount: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
  /** Override callback; defaults to DARAJA_CALLBACK_URL */
  callbackUrl?: string;
};

export type StkPushResult = {
  ok: true;
  merchantRequestId: string;
  checkoutRequestId: string;
  customerMessage: string;
} | {
  ok: false;
  error: string;
  detail?: unknown;
};

export async function stkPush(input: StkPushInput): Promise<StkPushResult> {
  if (!darajaConfigured()) {
    return { ok: false, error: "daraja_not_configured" };
  }

  const amount = Math.max(1, Math.round(Number(input.amount)));
  const phone = formatMpesaPhone(input.phone);
  if (phone.length < 12) {
    return { ok: false, error: "invalid_phone" };
  }

  let token: string;
  try {
    token = await getDarajaToken();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "daraja_auth_failed" };
  }

  const shortcode = process.env.DARAJA_SHORTCODE!.trim();
  const ts = timestamp();
  const callbackUrl =
    input.callbackUrl?.trim() ||
    process.env.DARAJA_CALLBACK_URL?.trim() ||
    "";

  if (!callbackUrl) {
    return { ok: false, error: "daraja_callback_url_missing" };
  }

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: input.transactionDesc.slice(0, 13),
    }),
    cache: "no-store",
  });

  const j = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    CustomerMessage?: string;
    errorMessage?: string;
    errorCode?: string;
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
  };
}

export type StkQueryResult = {
  ok: true;
  resultCode: string;
  resultDesc: string;
  /** "0" means success; "1032" user cancelled; "4999" still processing, etc. */
  raw: Record<string, unknown>;
} | {
  ok: false;
  error: string;
  detail?: unknown;
};

/** Query STK push status (long-poll fallback when webhook is slow/missed). */
export async function stkQuery(checkoutRequestId: string): Promise<StkQueryResult> {
  if (!darajaConfigured()) {
    return { ok: false, error: "daraja_not_configured" };
  }
  if (!checkoutRequestId) {
    return { ok: false, error: "missing_checkout_request_id" };
  }

  let token: string;
  try {
    token = await getDarajaToken();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "daraja_auth_failed" };
  }

  const shortcode = process.env.DARAJA_SHORTCODE!.trim();
  const ts = timestamp();

  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password(ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });

  const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ResponseCode?: string;
    ResultCode?: string | number;
    ResultDesc?: string;
    errorMessage?: string;
  };

  if (!res.ok && j.ResultCode === undefined) {
    return {
      ok: false,
      error: j.errorMessage || "stk_query_failed",
      detail: j,
    };
  }

  return {
    ok: true,
    resultCode: String(j.ResultCode ?? j.ResponseCode ?? ""),
    resultDesc: String(j.ResultDesc ?? j.errorMessage ?? ""),
    raw: j,
  };
}
