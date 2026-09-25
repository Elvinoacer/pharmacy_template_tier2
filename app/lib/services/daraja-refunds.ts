import "server-only";

import { timingSafeEqual } from "node:crypto";

import { prisma } from "@/app/lib/db";
import { completeRefund } from "@/app/lib/services/commerce/refunds";
import { requestReversal } from "@/app/lib/services/daraja-operations";

const PENDING_PREFIX = "daraja_reversal_pending:";

function nestedText(value: unknown, names: string[]): string | null {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const queue: unknown[] = [value];
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
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      if (wanted.has(key.toLowerCase()) && child != null && typeof child !== "object") {
        const text = String(child).trim();
        if (text) return text;
      }
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return null;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyDarajaCommandCallbackToken(token: string | null) {
  const expected = process.env.DARAJA_COMMAND_WEBHOOK_SECRET?.trim();
  return Boolean(expected && token && safeEqual(expected, token));
}

export async function initiateDarajaRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { payment: true },
  });
  if (!refund) return { ok: false as const, error: "Refund not found." };
  if (refund.status === "completed") return { ok: true as const, alreadyCompleted: true };
  if (refund.provider !== "daraja" || refund.payment.provider !== "daraja") {
    return { ok: false as const, error: "This refund is not an M-PESA Daraja reversal." };
  }
  if (refund.providerRef?.startsWith(PENDING_PREFIX)) {
    return { ok: true as const, pending: true, providerRef: refund.providerRef };
  }
  if (refund.providerRef === "manual_reversal_required") {
    return { ok: true as const, pending: true, manual: true as const };
  }

  const transactionId = String(refund.payment.providerRef || "").trim();
  if (!transactionId || transactionId.startsWith("ws_CO_")) {
    return { ok: false as const, error: "The original M-PESA receipt is missing. Reconcile the payment before reversing it." };
  }

  const result = await requestReversal({
    pharmacyId: refund.payment.pharmacyId,
    transactionId,
    amountKes: Number(refund.amount),
    remarks: refund.reason || `Afyvia refund ${refund.id.slice(0, 8)}`,
  });
  if (!result.ok) {
    // Preserve the refund intent and make manual processing explicit. No
    // platform reversal is sent for tenant-held funds.
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: "pending", providerRef: "manual_reversal_required" },
    });
    return { ok: true as const, pending: true, manual: true as const };
  }

  const originatorConversationId = nestedText(result.data, ["OriginatorConversationID", "originatorConversationId"]);
  const conversationId = nestedText(result.data, ["ConversationID", "conversationId"]);
  const tracking = originatorConversationId || conversationId;
  if (!tracking) {
    return { ok: false as const, error: "Safaricom accepted the request without a reversal tracking reference. Check Daraja records before retrying." };
  }

  await prisma.refund.update({
    where: { id: refund.id },
    data: { status: "approved", providerRef: `${PENDING_PREFIX}${tracking}` },
  });
  return { ok: true as const, pending: true, providerRef: `${PENDING_PREFIX}${tracking}` };
}

export type DarajaCommandResultFacts = {
  resultCode: string | null;
  resultDesc: string | null;
  originatorConversationId: string | null;
  conversationId: string | null;
  transactionId: string | null;
};

export function parseDarajaCommandResult(payload: unknown): DarajaCommandResultFacts {
  return {
    resultCode: nestedText(payload, ["ResultCode", "resultCode"]),
    resultDesc: nestedText(payload, ["ResultDesc", "resultDesc", "ResultDescription"]),
    originatorConversationId: nestedText(payload, ["OriginatorConversationID", "originatorConversationId"]),
    conversationId: nestedText(payload, ["ConversationID", "conversationId"]),
    transactionId: nestedText(payload, ["TransactionID", "transactionId", "ReceiptNo", "MpesaReceiptNumber"]),
  };
}

export async function processDarajaCommandResult(payload: unknown) {
  const facts = parseDarajaCommandResult(payload);
  const trackingCandidates = [facts.originatorConversationId, facts.conversationId].filter(Boolean) as string[];
  let refund = null as Awaited<ReturnType<typeof prisma.refund.findFirst>>;
  for (const candidate of trackingCandidates) {
    refund = await prisma.refund.findFirst({ where: { providerRef: `${PENDING_PREFIX}${candidate}`, provider: "daraja" } });
    if (refund) break;
  }

  if (!refund) return { ok: true as const, note: "no_pending_refund", facts };
  if (facts.resultCode === "0") {
    await completeRefund(refund.id, {
      providerRef: facts.transactionId || facts.conversationId || facts.originatorConversationId || refund.providerRef,
    });
    return { ok: true as const, note: "refund_completed", refundId: refund.id, facts };
  }

  await prisma.refund.update({
    where: { id: refund.id },
    data: { status: "failed" },
  });
  return { ok: true as const, note: "refund_failed", refundId: refund.id, facts };
}
