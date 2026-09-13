import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { completeBillingPayment, markInvoicePaid } from "@/app/lib/platform/billing";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { stkQuery } from "@/app/lib/services/daraja";
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
 * Reconcile pending platform-billing STK requests directly against Daraja.
 * The STK query endpoint is authenticated, so ResultCode=0 is authoritative
 * even when Safaricom's asynchronous callback is delayed or omitted.
 */
export async function reconcilePharmacyBillingStk(pharmacyId: string) {
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    return { ok: false as const, error: "daraja_not_configured", checked: 0, reconciled: 0, pending: 0 };
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

  let reconciled = 0;
  let stillPending = 0;

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
