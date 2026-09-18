import "server-only";

import { getDarajaToken } from "@/app/lib/services/daraja";
import { resolveDarajaCredentials, type DarajaCredentials } from "@/app/lib/platform/integrations";

export type DarajaOperationResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  ok: boolean;
  status: number;
  data: T;
  error: string | null;
};

function apiBase(credentials: DarajaCredentials) {
  return credentials.env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

async function requestDaraja<T extends Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  credentials: DarajaCredentials,
): Promise<DarajaOperationResult<T>> {
  try {
    const token = await getDarajaToken(credentials);
    const response = await fetch(`${apiBase(credentials)}${path}`, {
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
    const data = (await response.json().catch(() => ({}))) as T;
    const error = response.ok
      ? null
      : String((data as Record<string, unknown>).errorMessage || (data as Record<string, unknown>).ResponseDescription || `HTTP ${response.status}`);
    return { ok: response.ok, status: response.status, data, error };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      data: {} as T,
      error: error instanceof Error ? error.message : "Daraja request failed",
    };
  }
}

function platformCallback(name: "result" | "timeout" | "c2bConfirmation" | "c2bValidation") {
  const envName = {
    result: "DARAJA_RESULT_URL",
    timeout: "DARAJA_TIMEOUT_URL",
    c2bConfirmation: "DARAJA_C2B_CONFIRMATION_URL",
    c2bValidation: "DARAJA_C2B_VALIDATION_URL",
  }[name];
  const explicit = process.env[envName]?.trim();
  if (explicit) return explicit;
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!origin) return null;
  const path = {
    result: "/api/payments/daraja/result",
    timeout: "/api/payments/daraja/timeout",
    c2bConfirmation: "/api/payments/daraja/c2b/confirmation",
    c2bValidation: "/api/payments/daraja/c2b/validation",
  }[name];
  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}

function withSecret(url: string | null, secretEnv: "DARAJA_COMMAND_WEBHOOK_SECRET" | "DARAJA_C2B_WEBHOOK_SECRET") {
  if (!url) return null;
  const secret = process.env[secretEnv]?.trim();
  if (!secret) return null;
  try {
    const parsed = new URL(url);
    if (process.env.DARAJA_ENV?.trim().toLowerCase() === "production" && parsed.protocol !== "https:") return null;
    parsed.searchParams.set("token", secret);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function generateDynamicQr(input: {
  reference: string;
  amountKes: number;
  merchantName?: string;
  transactionCode?: "PB" | "BG" | "WA" | "SM" | "SB";
  size?: number;
  pharmacyId?: string | null;
}) {
  const credentials = await resolveDarajaCredentials(input.pharmacyId ?? null);
  if (!credentials) return { ok: false, status: 503, data: {}, error: "M-PESA is not configured." } satisfies DarajaOperationResult;
  const amount = Math.max(1, Math.round(input.amountKes));
  const size = Math.min(500, Math.max(200, Math.round(input.size || 300)));
  return requestDaraja("/mpesa/qrcode/v1/generate", {
    MerchantName: (input.merchantName || process.env.PLATFORM_BRAND_NAME || "Afyvia").slice(0, 30),
    RefNo: input.reference.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20),
    Amount: amount,
    TrxCode: input.transactionCode || "PB",
    CPI: credentials.shortcode,
    Size: size,
  }, credentials);
}

export async function registerC2BUrls() {
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) return { ok: false, status: 503, data: {}, error: "M-PESA is not configured." } satisfies DarajaOperationResult;
  const confirmation = withSecret(platformCallback("c2bConfirmation"), "DARAJA_C2B_WEBHOOK_SECRET");
  const validation = withSecret(platformCallback("c2bValidation"), "DARAJA_C2B_WEBHOOK_SECRET");
  if (!confirmation || !validation) {
    return { ok: false, status: 503, data: {}, error: "C2B callback configuration is incomplete." } satisfies DarajaOperationResult;
  }
  return requestDaraja("/mpesa/c2b/v1/registerurl", {
    ShortCode: credentials.shortcode,
    ResponseType: "Completed",
    ConfirmationURL: confirmation,
    ValidationURL: validation,
  }, credentials);
}

export async function simulateC2B(input: { amountKes: number; phone: string; reference: string }) {
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) return { ok: false, status: 503, data: {}, error: "M-PESA is not configured." } satisfies DarajaOperationResult;
  if (credentials.env === "production") {
    return { ok: false, status: 400, data: {}, error: "C2B simulation is sandbox-only." } satisfies DarajaOperationResult;
  }
  return requestDaraja("/mpesa/c2b/v1/simulate", {
    ShortCode: credentials.shortcode,
    CommandID: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(input.amountKes)),
    Msisdn: input.phone,
    BillRefNumber: input.reference.slice(0, 20),
  }, credentials);
}

function commandConfig() {
  const initiator = process.env.DARAJA_INITIATOR_NAME?.trim();
  const securityCredential = process.env.DARAJA_SECURITY_CREDENTIAL?.trim();
  const resultUrl = withSecret(platformCallback("result"), "DARAJA_COMMAND_WEBHOOK_SECRET");
  const timeoutUrl = withSecret(platformCallback("timeout"), "DARAJA_COMMAND_WEBHOOK_SECRET");
  if (!initiator || !securityCredential || !resultUrl || !timeoutUrl) return null;
  return { initiator, securityCredential, resultUrl, timeoutUrl };
}

export async function queryTransactionStatus(transactionId: string) {
  const credentials = await resolveDarajaCredentials(null);
  const command = commandConfig();
  if (!credentials || !command) return { ok: false, status: 503, data: {}, error: "Daraja command APIs are not configured." } satisfies DarajaOperationResult;
  return requestDaraja("/mpesa/transactionstatus/v1/query", {
    Initiator: command.initiator,
    SecurityCredential: command.securityCredential,
    CommandID: "TransactionStatusQuery",
    TransactionID: transactionId,
    PartyA: credentials.shortcode,
    IdentifierType: "4",
    ResultURL: command.resultUrl,
    QueueTimeOutURL: command.timeoutUrl,
    Remarks: "Afyvia transaction verification",
    Occasion: "AfyviaPaymentVerification",
  }, credentials);
}

export async function requestReversal(input: { transactionId: string; amountKes: number; remarks?: string }) {
  const credentials = await resolveDarajaCredentials(null);
  const command = commandConfig();
  if (!credentials || !command) return { ok: false, status: 503, data: {}, error: "Daraja reversal is not configured." } satisfies DarajaOperationResult;
  return requestDaraja("/mpesa/reversal/v1/request", {
    Initiator: command.initiator,
    SecurityCredential: command.securityCredential,
    CommandID: "TransactionReversal",
    TransactionID: input.transactionId,
    Amount: Math.max(1, Math.round(input.amountKes)),
    ReceiverParty: credentials.shortcode,
    RecieverIdentifierType: "11",
    ResultURL: command.resultUrl,
    QueueTimeOutURL: command.timeoutUrl,
    Remarks: (input.remarks || "Afyvia payment reversal").slice(0, 100),
    Occasion: "AfyviaReversal",
  }, credentials);
}
