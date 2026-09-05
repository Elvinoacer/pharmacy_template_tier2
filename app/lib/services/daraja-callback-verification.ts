import "server-only";

import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { stkQuery } from "@/app/lib/services/daraja";

export type DarajaCallbackItem = {
  Name?: string;
  Value?: string | number;
};

export type DarajaCallbackEvidence = {
  checkoutRequestId: string;
  merchantRequestId?: string | null;
  resultCode: number;
  resultDesc?: string | null;
  items?: DarajaCallbackItem[];
};

export type VerifiedDarajaEvidence = {
  amount: number;
  receipt: string;
  phone: string | null;
  transactionDate: string | null;
  resultDesc: string;
};

function valueOf(items: DarajaCallbackItem[], name: string): string | number | undefined {
  return items.find((item) => item.Name === name)?.Value;
}

export function parseDarajaCallbackEvidence(
  callback: DarajaCallbackEvidence,
): { ok: true; amount: number; receipt: string; phone: string | null; transactionDate: string | null } | { ok: false; error: string } {
  if (!callback.checkoutRequestId.trim()) {
    return { ok: false, error: "missing_checkout_request_id" };
  }
  if (callback.resultCode !== 0) {
    return { ok: false, error: `provider_result_${callback.resultCode}` };
  }

  const items = callback.items ?? [];
  const rawAmount = valueOf(items, "Amount");
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "missing_or_invalid_provider_amount" };
  }

  const rawReceipt = valueOf(items, "MpesaReceiptNumber");
  const receipt = rawReceipt == null ? "" : String(rawReceipt).trim();
  if (!receipt) {
    return { ok: false, error: "missing_mpesa_receipt" };
  }

  const rawPhone = valueOf(items, "PhoneNumber");
  const rawDate = valueOf(items, "TransactionDate");

  return {
    ok: true,
    amount,
    receipt,
    phone: rawPhone == null ? null : String(rawPhone),
    transactionDate: rawDate == null ? null : String(rawDate),
  };
}

export async function verifyDarajaCallback(opts: {
  pharmacyId: string | null;
  expectedAmount: number;
  expectedCheckoutRequestId: string;
  expectedMerchantRequestId?: string | null;
  expectedShortcode?: string | null;
  callback: DarajaCallbackEvidence;
}): Promise<{ ok: true; evidence: VerifiedDarajaEvidence } | { ok: false; error: string }> {
  const parsed = parseDarajaCallbackEvidence(opts.callback);
  if (!parsed.ok) return parsed;

  if (opts.callback.checkoutRequestId !== opts.expectedCheckoutRequestId) {
    return { ok: false, error: "checkout_request_id_mismatch" };
  }

  if (
    opts.expectedMerchantRequestId &&
    opts.callback.merchantRequestId &&
    opts.callback.merchantRequestId !== opts.expectedMerchantRequestId
  ) {
    return { ok: false, error: "merchant_request_id_mismatch" };
  }

  if (Math.abs(parsed.amount - opts.expectedAmount) > 0.009) {
    return { ok: false, error: "payment_amount_mismatch" };
  }

  const credentials = await resolveDarajaCredentials(opts.pharmacyId);
  if (!credentials) {
    return { ok: false, error: "daraja_credentials_unavailable" };
  }

  if (opts.expectedShortcode && credentials.shortcode !== opts.expectedShortcode) {
    return { ok: false, error: "merchant_shortcode_mismatch" };
  }

  const provider = await stkQuery(opts.expectedCheckoutRequestId, credentials);
  if (!provider.ok) {
    return { ok: false, error: `provider_verification_failed:${provider.error}` };
  }
  if (provider.resultCode !== "0") {
    return { ok: false, error: `provider_not_successful:${provider.resultCode || "unknown"}` };
  }

  return {
    ok: true,
    evidence: {
      amount: parsed.amount,
      receipt: parsed.receipt,
      phone: parsed.phone,
      transactionDate: parsed.transactionDate,
      resultDesc: provider.resultDesc || opts.callback.resultDesc || "Verified by Daraja status query",
    },
  };
}
