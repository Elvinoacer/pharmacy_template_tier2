import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { completeBillingPayment, markInvoicePaid, completeIntasendBillingPayment, failIntasendBillingPayment } from "@/app/lib/platform/billing";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { stkQuery } from "@/app/lib/services/daraja";
import { queryIntasendPaymentStatus } from "@/app/lib/services/intasend";
import { withPlatformBypass } from "@/app/lib/tenant-context";

function providerStillProcessing(resultCode: string, resultDesc: string) {
  const code = resultCode.trim();
  const desc = resultDesc.toLowerCase();
  return (
    !code ||
    code === "4999" ||
    desc.includes("being processed") ||
    desc.includes("processing") ||
    desc.includes("pending")
  );
}

/**
 * Reconcile pending platform-billing payments directly against IntaSend (and fallback to Daraja).
 * Ensures instant settlement when customer returns to the onboarding billing page.
 */
export async function reconcilePharmacyBillingStk(pharmacyId: string) {
  let reconciled = 0;
  let stillPending = 0;
  let checked = 0;

  // 1. Reconcile IntaSend billing payments
  const intasendRows = await withPlatformBypass(async () =>
    prismaUnscoped.billingPayment.findMany({
      where: {
        pharmacyId,
        provider: "intasend",
        status: { in: ["pending", "processing"] },
      },
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  );

  checked += intasendRows.length;

  for (const row of intasendRows) {
    if (row.invoice.status === "paid") {
      await withPlatformBypass(async () =>
        prismaUnscoped.billingPayment.update({
          where: { id: row.id },
          data: { status: "succeeded", paidAt: new Date() },
        }),
      );
      reconciled++;
      continue;
    }

    const queryRef = row.checkoutRequestId || row.providerRef;
    if (queryRef && !queryRef.startsWith("is_mock_") && !queryRef.startsWith("is_fallback_")) {
      const status = await queryIntasendPaymentStatus(queryRef).catch(() => null);
      if (status) {
        if (status.state === "COMPLETE") {
          await completeIntasendBillingPayment({
            apiRef: row.invoice.number,
            intasendInvoiceId: status.invoiceId,
            amount: Number(status.value || row.invoice.totalKes),
            provider: status.provider || "INTASEND",
          }).catch((err) => console.error("[reconcile][intasend] complete error:", err));
          reconciled++;
          continue;
        } else if (status.state === "FAILED") {
          await failIntasendBillingPayment({
            apiRef: row.invoice.number,
            reason: status.failedReason || "Payment marked failed by IntaSend",
          }).catch((err) => console.error("[reconcile][intasend] fail error:", err));
          reconciled++;
          continue;
        }
      }
    }
    stillPending++;
  }

  // 2. Legacy Daraja M-Pesa reconciliation (if configured)
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    const pending = await withPlatformBypass(async () =>
      prismaUnscoped.billingPayment.count({
        where: {
          pharmacyId,
          status: { in: ["pending", "processing"] },
        },
      }),
    );
    return { ok: true as const, checked, reconciled, pending, stillPending };
  }

  const rows = await withPlatformBypass(async () =>
    prismaUnscoped.billingPayment.findMany({
      where: {
        pharmacyId,
        provider: "mpesa",
        status: { in: ["pending", "processing"] },
        checkoutRequestId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  );

  checked += rows.length;

  for (const row of rows) {
    const checkoutRequestId = row.checkoutRequestId;
    if (!checkoutRequestId) continue;

    const provider = await stkQuery(checkoutRequestId, credentials);
    if (!provider.ok) {
      stillPending++;
      console.warn("[billing][daraja-status] query unavailable", {
        paymentId: row.id,
        checkoutRequestId,
        error: provider.error,
      });
      continue;
    }

    const providerCheckout = String(provider.raw.CheckoutRequestID ?? "").trim();
    const providerMerchant = String(provider.raw.MerchantRequestID ?? "").trim();
    if (providerCheckout && providerCheckout !== checkoutRequestId) {
      stillPending++;
      console.error("[billing][daraja-status] checkout mismatch", {
        paymentId: row.id,
        expected: checkoutRequestId,
        received: providerCheckout,
      });
      continue;
    }
    if (row.merchantRequestId && providerMerchant && providerMerchant !== row.merchantRequestId) {
      stillPending++;
      console.error("[billing][daraja-status] merchant mismatch", {
        paymentId: row.id,
        checkoutRequestId,
      });
      continue;
    }

    if (provider.resultCode === "0") {
      const claimed = await withPlatformBypass(async () =>
        prismaUnscoped.billingPayment.updateMany({
          where: { id: row.id, status: { in: ["pending", "processing"] } },
          data: {
            status: "succeeded",
            paidAt: new Date(),
            failureReason: null,
            providerRef: row.providerRef || `daraja-query:${checkoutRequestId}`,
          },
        }),
      );

      if (claimed.count) {
        await withPlatformBypass(async () => {
          await markInvoicePaid(row.invoiceId);
        });
        reconciled++;
        console.info("[billing][daraja-status] payment confirmed by STK query", {
          paymentId: row.id,
          invoiceId: row.invoiceId,
          checkoutRequestId,
          environment: credentials.env,
        });
      }
      continue;
    }

    if (providerStillProcessing(provider.resultCode, provider.resultDesc)) {
      stillPending++;
      continue;
    }

    const numericResult = Number(provider.resultCode);
    await withPlatformBypass(async () => {
      await completeBillingPayment({
        checkoutRequestId,
        merchantRequestId: row.merchantRequestId,
        resultCode: Number.isFinite(numericResult) ? numericResult : 1,
        resultDesc: provider.resultDesc || `M-Pesa result ${provider.resultCode}`,
      });
    });
    reconciled++;
    console.info("[billing][daraja-status] payment closed from STK query", {
      paymentId: row.id,
      checkoutRequestId,
      resultCode: provider.resultCode,
      resultDesc: provider.resultDesc,
    });
  }

  const pending = await withPlatformBypass(async () =>
    prismaUnscoped.billingPayment.count({
      where: {
        pharmacyId,
        provider: "mpesa",
        status: { in: ["pending", "processing"] },
        checkoutRequestId: { not: null },
      },
    }),
  );

  return { ok: true as const, reconciled, pending, checked: rows.length, stillPending };
}

export { reconcilePharmacyBillingStk as reconcilePharmacyBilling };
