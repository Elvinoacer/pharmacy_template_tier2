import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { completeBillingPayment, markInvoicePaid } from "@/app/lib/platform/billing";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { stkQuery } from "@/app/lib/services/daraja";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * Browser-driven fallback reconciliation for pharmacy billing STK payments.
 *
 * Daraja normally settles through the callback endpoint. In practice callbacks
 * can be delayed or omitted even after the handset reports success. This route
 * asks Daraja directly for the authoritative CheckoutRequestID status while the
 * billing page is open, so the UI does not remain stuck on "confirming".
 *
 * Security:
 * - the caller must own the pharmacy;
 * - only already-created billing rows for that pharmacy are queried;
 * - success is accepted only from Daraja's authenticated STK Query endpoint;
 * - returned checkout/merchant IDs are cross-checked when Safaricom includes them.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const pharmacy = await prismaUnscoped.pharmacy.findFirst({
    where: {
      ownerUserId: user.id,
      ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!pharmacy) return NextResponse.json({ ok: false, error: "pharmacy_not_found" }, { status: 404 });

  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) {
    return NextResponse.json({ ok: false, error: "daraja_not_configured" }, { status: 503 });
  }

  const rows = await withPlatformBypass(async () =>
    prismaUnscoped.billingPayment.findMany({
      where: {
        pharmacyId: pharmacy.id,
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
        pharmacyId: pharmacy.id,
        provider: "mpesa",
        status: { in: ["pending", "processing"] },
        checkoutRequestId: { not: null },
      },
    }),
  );

  return NextResponse.json({ ok: true, reconciled, pending, checked: rows.length, stillPending });
}
