import { NextResponse } from "next/server";
import { prismaUnscoped, withTenantTx } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import {
  completeDarajaPayment,
  failDarajaPayment,
} from "@/app/lib/services/payments";
import {
  markWebhookProcessed,
  recordInboundWebhook,
} from "@/app/lib/platform/webhooks";
import { completeBillingPayment } from "@/app/lib/platform/billing";
import { verifyDarajaCallback } from "@/app/lib/services/daraja-callback-verification";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { stkQuery } from "@/app/lib/services/daraja";

export const runtime = "nodejs";

type CallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{ Name?: string; Value?: string | number }>;
      };
    };
  };
};

type VerificationParams = Parameters<typeof verifyDarajaCallback>[0];
type VerificationResult = Awaited<ReturnType<typeof verifyDarajaCallback>>;

const PROVIDER_VERIFY_RETRY_MS = [0, 700, 1400] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerVerificationMayLag(error: string) {
  return (
    error.startsWith("provider_verification_failed:") ||
    error.startsWith("provider_not_successful:")
  );
}

async function verifySuccessResult(params: VerificationParams): Promise<VerificationResult> {
  let last: VerificationResult = { ok: false, error: "provider_verification_not_attempted" };

  for (const delay of PROVIDER_VERIFY_RETRY_MS) {
    if (delay) await sleep(delay);
    last = await verifyDarajaCallback(params);
    if (last.ok || !providerVerificationMayLag(last.error)) return last;
  }

  return last;
}

async function verifyFailureResult(opts: {
  pharmacyId: string | null;
  checkoutRequestId: string;
  callbackResultCode: number;
}) {
  const credentials = await resolveDarajaCredentials(opts.pharmacyId);
  if (!credentials) return { ok: false as const, error: "daraja_credentials_unavailable" };

  let lastError = "provider_status_unavailable";
  for (const delay of PROVIDER_VERIFY_RETRY_MS) {
    if (delay) await sleep(delay);
    const provider = await stkQuery(opts.checkoutRequestId, credentials);
    if (!provider.ok) {
      lastError = provider.error;
      continue;
    }
    if (provider.resultCode === "0") {
      lastError = "provider_reports_success";
      continue;
    }
    if (provider.resultCode && provider.resultCode !== String(opts.callbackResultCode)) {
      lastError = `provider_result_mismatch:${provider.resultCode}`;
      continue;
    }
    return { ok: true as const, resultDesc: provider.resultDesc };
  }

  return { ok: false as const, error: lastError };
}

function providerFailureText(resultCode: number, resultDesc?: string) {
  const desc = resultDesc?.trim() || "M-Pesa did not complete the payment.";
  return `M-Pesa result ${resultCode}: ${desc}`;
}

/**
 * Daraja STK push callback.
 *
 * Security model:
 * - tenant is resolved from an existing payment row, never from cookies/body;
 * - a callback is recorded for audit/idempotency but is NOT itself settlement proof;
 * - successful callbacks must contain amount + receipt and are independently
 *   confirmed with Daraja's STK query endpoint before financial state changes;
 * - failed/cancelled callbacks are also confirmed before a pending payment is
 *   transitioned to failed, preventing forged callbacks from creating outages;
 * - a provider-reported failure reason is saved immediately for UX while that
 *   independent confirmation is still catching up.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CallbackBody;
    const cb = body.Body?.stkCallback;
    const checkoutRequestId = cb?.CheckoutRequestID?.trim();
    const resultCode = cb?.ResultCode;
    if (
      !cb ||
      !checkoutRequestId ||
      typeof resultCode !== "number" ||
      !Number.isInteger(resultCode)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_callback" }, { status: 400 });
    }

    const lookedUp = await withPlatformBypass(async () => {
      const payment = await prismaUnscoped.payment.findFirst({
        where: {
          OR: [{ checkoutRequestId }, { providerRef: checkoutRequestId }],
        },
        orderBy: { createdAt: "desc" },
      });
      const billing = await prismaUnscoped.billingPayment.findFirst({
        where: { checkoutRequestId },
        orderBy: { createdAt: "desc" },
      });
      return { payment, billing };
    });

    if (lookedUp.billing && !lookedUp.payment) {
      const billing = lookedUp.billing;
      const inbound = await recordInboundWebhook({
        pharmacyId: billing.pharmacyId,
        provider: "daraja",
        providerEventId: checkoutRequestId,
        eventType: "stk.billing.callback",
        payload: body,
      });
      if (inbound.duplicate && inbound.event.status === "delivered") {
        return NextResponse.json({ ok: true, note: "duplicate" });
      }

      try {
        if (resultCode === 0) {
          const verified = await verifySuccessResult({
            pharmacyId: null,
            expectedAmount: Number(billing.amountKes),
            expectedCheckoutRequestId: checkoutRequestId,
            expectedMerchantRequestId: billing.merchantRequestId,
            callback: {
              checkoutRequestId,
              merchantRequestId: cb.MerchantRequestID,
              resultCode,
              resultDesc: cb.ResultDesc,
              items: cb.CallbackMetadata?.Item ?? [],
            },
          });
          if (!verified.ok) {
            console.warn("[daraja callback][billing] success verification pending", {
              checkoutRequestId,
              error: verified.error,
            });
            await markWebhookProcessed(inbound.event.id, `unverified:${verified.error}`);
            return NextResponse.json(
              { ok: true, note: "billing_callback_unverified" },
              { status: 202 },
            );
          }

          await withPlatformBypass(async () =>
            completeBillingPayment({
              checkoutRequestId,
              merchantRequestId: cb.MerchantRequestID,
              mpesaReceipt: verified.evidence.receipt,
              amount: verified.evidence.amount,
              phone: verified.evidence.phone,
              resultCode: 0,
              resultDesc: verified.evidence.resultDesc,
            }),
          );
          console.info("[daraja callback][billing] payment confirmed", {
            checkoutRequestId,
            resultCode,
          });
        } else {
          // Surface Safaricom's outcome immediately, while keeping the payment
          // processing until the independent STK status query confirms it.
          await withPlatformBypass(() =>
            prismaUnscoped.billingPayment.updateMany({
              where: {
                id: billing.id,
                status: { in: ["pending", "processing"] },
              },
              data: {
                failureReason: providerFailureText(resultCode, cb.ResultDesc),
              },
            }),
          );

          const verifiedFailure = await verifyFailureResult({
            pharmacyId: null,
            checkoutRequestId,
            callbackResultCode: resultCode,
          });
          if (!verifiedFailure.ok) {
            console.warn("[daraja callback][billing] failure verification pending", {
              checkoutRequestId,
              resultCode,
              resultDesc: cb.ResultDesc,
              error: verifiedFailure.error,
            });
            await markWebhookProcessed(inbound.event.id, `unverified_failure:${verifiedFailure.error}`);
            return NextResponse.json(
              { ok: true, note: "billing_failure_unverified" },
              { status: 202 },
            );
          }
          await withPlatformBypass(async () =>
            completeBillingPayment({
              checkoutRequestId,
              merchantRequestId: cb.MerchantRequestID,
              resultCode,
              resultDesc: verifiedFailure.resultDesc || cb.ResultDesc,
            }),
          );
          console.info("[daraja callback][billing] payment failed", {
            checkoutRequestId,
            resultCode,
            resultDesc: verifiedFailure.resultDesc || cb.ResultDesc,
          });
        }

        await markWebhookProcessed(inbound.event.id);
        return NextResponse.json({ ok: true, note: "billing" });
      } catch (err) {
        await markWebhookProcessed(
          inbound.event.id,
          err instanceof Error ? err.message : "billing_callback_failed",
        );
        throw err;
      }
    }

    const payment = lookedUp.payment;
    if (!payment) {
      console.warn("[daraja callback] payment not found", checkoutRequestId);
      return NextResponse.json({ ok: true, note: "payment_not_found" });
    }

    const inbound = await recordInboundWebhook({
      pharmacyId: payment.pharmacyId,
      provider: "daraja",
      providerEventId: checkoutRequestId,
      eventType: "stk.callback",
      payload: body,
    });
    if (inbound.duplicate && inbound.event.status === "delivered") {
      return NextResponse.json({ ok: true, note: "duplicate" });
    }

    try {
      if (resultCode === 0) {
        const verified = await verifySuccessResult({
          pharmacyId: payment.pharmacyId,
          expectedAmount: Number(payment.expectedAmount ?? payment.amount),
          expectedCheckoutRequestId: payment.checkoutRequestId || checkoutRequestId,
          expectedMerchantRequestId: payment.merchantRequestId,
          expectedShortcode: payment.expectedShortcode,
          callback: {
            checkoutRequestId,
            merchantRequestId: cb.MerchantRequestID,
            resultCode,
            resultDesc: cb.ResultDesc,
            items: cb.CallbackMetadata?.Item ?? [],
          },
        });

        if (!verified.ok) {
          await withPharmacy(payment.pharmacyId, async () => {
            await prismaUnscoped.payment.update({
              where: { id: payment.id },
              data: {
                reconciliationNotes: `callback_unverified:${verified.error}`,
              },
            });
          });
          await markWebhookProcessed(inbound.event.id, `unverified:${verified.error}`);
          return NextResponse.json(
            { ok: true, note: "callback_unverified" },
            { status: 202 },
          );
        }

        await withPharmacy(payment.pharmacyId, async () => {
          await withTenantTx(payment.pharmacyId, async () => {
            if (cb.MerchantRequestID && !payment.merchantRequestId) {
              await prismaUnscoped.payment.update({
                where: { id: payment.id },
                data: {
                  merchantRequestId: cb.MerchantRequestID,
                  checkoutRequestId: payment.checkoutRequestId || checkoutRequestId,
                },
              });
            }
            await completeDarajaPayment({
              paymentId: payment.id,
              mpesaReceipt: verified.evidence.receipt,
              resultDesc: verified.evidence.resultDesc,
              providerAmount: verified.evidence.amount,
            });
          });
        });
      } else {
        const verifiedFailure = await verifyFailureResult({
          pharmacyId: payment.pharmacyId,
          checkoutRequestId,
          callbackResultCode: resultCode,
        });
        if (!verifiedFailure.ok) {
          await markWebhookProcessed(inbound.event.id, `unverified_failure:${verifiedFailure.error}`);
          return NextResponse.json(
            { ok: true, note: "failure_unverified" },
            { status: 202 },
          );
        }
        await withPharmacy(payment.pharmacyId, async () => {
          await failDarajaPayment({
            paymentId: payment.id,
            reason:
              verifiedFailure.resultDesc ||
              cb.ResultDesc ||
              "Customer declined or STK timed out",
          });
        });
      }

      await markWebhookProcessed(inbound.event.id);
    } catch (err) {
      await markWebhookProcessed(
        inbound.event.id,
        err instanceof Error ? err.message : "callback_failed",
      );
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[daraja callback]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
