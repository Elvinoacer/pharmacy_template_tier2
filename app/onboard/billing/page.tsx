import { createTransactionFeeStatement } from "@/app/actions/transaction-fees";
import {
  CancelServiceForm,
  PharmacyPaymentForm,
  RecurringMpesaSetupForm,
  RetryOverdueForm,
} from "@/app/components/onboard/BillingForms";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";
import { darajaConfigured } from "@/app/lib/services/daraja";
import { SUBSCRIPTION_GRACE_DAYS } from "@/app/lib/services/daraja-dunning";
import { ratibaConfigured } from "@/app/lib/services/daraja-ratiba";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";
import { ArrowLeft, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy fees" };

type PaymentView = {
  provider: string;
  status: string;
  failureReason: string | null;
  providerRef: string | null;
  createdAt: Date;
};

function isActivePayment(payment: PaymentView | undefined) {
  return Boolean(payment && ["pending", "processing"].includes(payment.status));
}

function describeMpesaOutcome(payment: PaymentView | undefined) {
  if (!payment || !(payment.provider.startsWith("daraja") || payment.provider === "mpesa")) return null;
  if (payment.status === "succeeded") {
    return { ok: true, title: "M-PESA payment confirmed", message: "Safaricom confirmed this payment successfully." };
  }
  if (payment.status === "failed") {
    return {
      ok: false,
      title: "M-PESA payment needs attention",
      message: publicErrorMessage(
        payment.failureReason,
        "We couldn't confirm this M-PESA payment. Check the number and try again.",
      ),
    };
  }
  return null;
}

export default async function PharmacyBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard/billing");

  const pharmacy = await db.pharmacy.findFirst({
    where: { ownerUserId: user.id, ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!pharmacy) redirect("/onboard");

  await ensureVerificationInvoice(pharmacy.id);
  const [invoices, grant, sub, dunning, paymentMethod] = await Promise.all([
    withPharmacy(pharmacy.id, () => db.invoice.findMany({
      where: { pharmacyId: pharmacy.id },
      include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })),
    withPharmacy(pharmacy.id, () => db.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: pharmacy.id } })),
    withPharmacy(pharmacy.id, () => db.subscription.findFirst({
      where: { pharmacyId: pharmacy.id, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    })),
    withPharmacy(pharmacy.id, () => db.dunningCase.findFirst({
      where: { pharmacyId: pharmacy.id, status: { notIn: ["resolved", "written_off"] } },
      orderBy: { updatedAt: "desc" },
    })),
    withPharmacy(pharmacy.id, () => db.billingPaymentMethod.findFirst({
      where: { pharmacyId: pharmacy.id, isDefault: true, type: "mpesa" },
      orderBy: { createdAt: "desc" },
    })),
  ]);

  const readiness = await loadPharmacySetup(pharmacy.id);
  const feeBalance = await withPharmacy(pharmacy.id, () => db.usageRecord.aggregate({
    where: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents" },
    _sum: { quantity: true },
  }));
  const feeCents = feeBalance._sum.quantity || 0;
  const paymentPending = invoices.some((invoice) => isActivePayment(invoice.payments[0] as PaymentView | undefined));
  const checkoutAvailable = darajaConfigured();
  const recurringAvailable = ratibaConfigured();
  const ratibaActive = Boolean(sub?.externalSubscriptionId?.startsWith("daraja_ratiba:"));
  const ratibaPending = Boolean(sub?.externalSubscriptionId?.startsWith("daraja_ratiba_pending:"));
  const freePeriodWithoutRatiba = Boolean(sub?.status === "active" && !ratibaActive && !ratibaPending && grant?.recurringMonths);
  const billingSuspended = dunning?.status === "suspended" || sub?.status === "unpaid";
  const graceRemaining = dunning?.graceUntil
    ? Math.max(0, Math.ceil((dunning.graceUntil.getTime() - Date.now()) / 86_400_000))
    : SUBSCRIPTION_GRACE_DAYS;
  const defaultPhone = paymentMethod?.mpesaPhone || pharmacy.phone || null;

  return (
    <div className={styles.narrow}>
      <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className={styles.quietLink}>
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {pharmacy.verifiedAt ? "Setup" : "Application"}
      </Link>

      <p className={`${styles.kicker} mt-5`}>{pharmacy.name}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
        M-PESA now. Ratiba every month.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        KES 100 one-time verification. KES 500/month when service is active. All collections run through Safaricom Daraja.
      </p>

      <section className={`${styles.notice} ${styles.noticeOk} mt-4`}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <h2>Your M-PESA PIN stays on your phone</h2>
          <p>STK Push and Ratiba authorization are completed inside M-PESA. Aether receives transaction references and status from Safaricom, never your PIN.</p>
        </div>
      </section>

      {dunning ? (
        <section className={`${styles.notice} ${billingSuspended ? styles.noticeWarn : styles.noticeOk} mt-4`} role="status">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <h2>{billingSuspended ? "Service paused — your data is safe" : `${graceRemaining} day${graceRemaining === 1 ? "" : "s"} of grace remaining`}</h2>
            <p>
              {billingSuspended
                ? "Your public listing and new customer activity are paused. Pay the overdue invoice through M-PESA to restore the pharmacy automatically."
                : `The pharmacy remains available during the grace period. If Ratiba did not collect automatically, you can settle the invoice immediately with an M-PESA prompt.`}
            </p>
          </div>
        </section>
      ) : null}

      {grant ? (
        <section className={`${styles.notice} ${styles.noticeOk} mt-4`}>
          <div>
            <h2>Promotion applied</h2>
            <p>
              Verification: {grant.verification ? "waived" : "KES 100"}. Monthly:{" "}
              {grant.recurringMonths ? `${grant.recurringMonths} free month${grant.recurringMonths === 1 ? "" : "s"}, then KES 500/month` : "KES 500/month"}.
            </p>
          </div>
        </section>
      ) : null}

      {sub ? (
        <section className={`${styles.section} mt-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={styles.kicker}>Monthly service</p>
              <h2 className="mt-1 font-semibold">
                {billingSuspended
                  ? "Payment required to restore service"
                  : ratibaActive
                    ? "Automatic M-PESA renewal active"
                    : ratibaPending
                      ? "Ratiba authorization awaiting Safaricom"
                      : freePeriodWithoutRatiba
                        ? "Free service period active"
                        : "M-PESA Ratiba not yet authorized"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {sub.cancelAt ? `Auto-renewal is off. Access ends ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.` : `Current period ends ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.`}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <Smartphone className="h-4 w-4" />
            </span>
          </div>

          {!sub.cancelAt && !ratibaActive ? (
            recurringAvailable ? (
              <div className="mt-4">
                <RecurringMpesaSetupForm
                  pharmacyId={pharmacy.id}
                  defaultPhone={defaultPhone}
                  authorising={ratibaPending}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
                M-PESA Ratiba is not provisioned on the platform shortcode yet. Nothing falls back to another gateway: monthly invoices remain payable through Daraja STK Push until Ratiba is enabled by Safaricom.
              </p>
            )
          ) : null}

          {freePeriodWithoutRatiba ? (
            <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
              No monthly charge is due during your promotion. You can authorize Ratiba now so the first paid month is collected automatically when the free period ends.
            </p>
          ) : null}

          {dunning ? (
            <RetryOverdueForm pharmacyId={pharmacy.id} defaultPhone={defaultPhone} suspended={billingSuspended} />
          ) : null}
          {!sub.cancelAt ? <CancelServiceForm pharmacyId={pharmacy.id} /> : null}
        </section>
      ) : null}

      <div className="mt-4 grid gap-3">
        {invoices.map((inv) => {
          const latestPayment = inv.payments[0] as PaymentView | undefined;
          const pending = isActivePayment(latestPayment);
          const outcome = describeMpesaOutcome(latestPayment);
          const isMonthly = Boolean(inv.subscriptionId);

          return (
            <section key={inv.id} className={styles.invoice}>
              <div className={styles.invoiceTop}>
                <h2 className="font-semibold">{inv.number.startsWith("TXF-") ? "Transaction fees" : isMonthly ? "Monthly service" : "Verification"}</h2>
                <strong>KES {Number(inv.totalKes).toLocaleString("en-KE")} · {inv.status}</strong>
              </div>
              {isMonthly ? <p className="mt-2 text-sm text-[var(--muted)]">{inv.periodStart.toLocaleDateString("en-KE")} – {inv.periodEnd.toLocaleDateString("en-KE")}</p> : null}
              <ul className="my-3 text-sm text-[var(--muted)]">{inv.items.map((item) => <li key={item.id}>{item.description}: KES {Number(item.totalKes)}</li>)}</ul>

              {outcome ? <div className={`${styles.notice} ${outcome.ok ? styles.noticeOk : styles.noticeWarn} mb-3`} role="status"><div><h3>{outcome.title}</h3><p>{outcome.message}</p></div></div> : null}

              {["open", "overdue"].includes(inv.status) ? (
                pending ? (
                  <p role="status" className="rounded-xl border border-[var(--line-2)] p-3 text-sm leading-6 text-[var(--muted)]">
                    M-PESA confirmation is still in progress. Do not start another payment for this invoice.
                  </p>
                ) : isMonthly && ratibaActive && !dunning ? (
                  <p className="rounded-xl border border-[var(--line-2)] p-3 text-sm leading-6 text-[var(--muted)]">
                    Ratiba is authorized for this subscription. Aether will reconcile the invoice when Safaricom reports the monthly collection.
                  </p>
                ) : (
                  <PharmacyPaymentForm
                    pharmacyId={pharmacy.id}
                    invoiceId={inv.id}
                    invoiceNumber={inv.number}
                    checkoutAvailable={checkoutAvailable}
                    defaultPhone={defaultPhone}
                  />
                )
              ) : null}
            </section>
          );
        })}
      </div>

      <section className={`${styles.section} mt-5`}>
        <h2 className="font-semibold">1% transaction fee</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Customer-order collections remain separate from the platform subscription ledger, but settlement still uses Daraja. The 1% platform fee is billed as its own statement.</p>
        <p className="mt-3 font-semibold">KES {(feeCents / 100).toFixed(2)} awaiting a statement</p>
        <form action={createTransactionFeeStatement} className="mt-3"><button disabled={feeCents < 100} className="btn-ghost" type="submit">Create fee statement</button></form>
        <p className={styles.fieldHint}>Statements collect whole shillings. Remaining cents carry forward without rounding up.</p>
      </section>

      <PaymentStatusRefresh pending={paymentPending || Boolean(["past_due", "unpaid"].includes(sub?.status || "")) || ratibaPending} />

      {sub ? (
        <Link href="/admin/setup" className="btn-primary mt-5 inline-flex justify-center">Continue to launch checklist</Link>
      ) : readiness.profileReady ? (
        <section className={`${styles.section} mt-4`}>
          <h2 className="font-semibold">Ready to activate</h2>
          <p className="mb-4 mt-2 text-sm text-[var(--muted)]">Pay the first due month with M-PESA. After confirmation, authorize Ratiba once for future monthly renewals.</p>
          <PharmacyPaymentForm pharmacyId={pharmacy.id} checkoutAvailable={checkoutAvailable} defaultPhone={defaultPhone} />
        </section>
      ) : (
        <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className="btn-primary mt-5 inline-flex justify-center">{pharmacy.verifiedAt ? "Continue setup" : "Continue application"}</Link>
      )}
    </div>
  );
}
