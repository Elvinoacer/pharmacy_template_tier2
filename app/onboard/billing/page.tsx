import { createTransactionFeeStatement } from "@/app/actions/transaction-fees";
import {
  CancelServiceForm,
  ManageCardForm,
  PharmacyPaymentForm,
  RecurringCardSetupForm,
  RetryOverdueForm,
} from "@/app/components/onboard/BillingForms";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";
import { paystackCheckoutConfigured, paystackSubscriptionConfigured } from "@/app/lib/services/paystack-billing";
import { SUBSCRIPTION_GRACE_DAYS } from "@/app/lib/services/paystack-dunning";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";
import { ArrowLeft, CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
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

function describeCardOutcome(payment: PaymentView | undefined) {
  if (!payment || !payment.provider.startsWith("paystack")) return null;
  if (payment.status === "succeeded") return { ok: true, title: "Card payment confirmed", message: "Paystack confirmed this payment." };
  if (payment.status === "failed") return { ok: false, title: "Card payment needs attention", message: payment.failureReason || "Paystack could not complete this card payment." };
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
  const [invoices, grant, sub, dunning] = await Promise.all([
    withPharmacy(pharmacy.id, () => db.invoice.findMany({
      where: { pharmacyId: pharmacy.id },
      include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })),
    withPharmacy(pharmacy.id, () => db.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: pharmacy.id } })),
    withPharmacy(pharmacy.id, () => db.subscription.findFirst({ where: { pharmacyId: pharmacy.id, status: { not: "cancelled" } }, orderBy: { createdAt: "desc" } })),
    withPharmacy(pharmacy.id, () => db.dunningCase.findFirst({
      where: { pharmacyId: pharmacy.id, status: { notIn: ["resolved", "written_off"] } },
      orderBy: { updatedAt: "desc" },
    })),
  ]);

  const readiness = await loadPharmacySetup(pharmacy.id);
  const feeBalance = await withPharmacy(pharmacy.id, () => db.usageRecord.aggregate({
    where: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents" },
    _sum: { quantity: true },
  }));
  const feeCents = feeBalance._sum.quantity || 0;
  const paymentPending = invoices.some((invoice) => isActivePayment(invoice.payments[0] as PaymentView | undefined));
  const checkoutAvailable = paystackCheckoutConfigured();
  const recurringAvailable = paystackSubscriptionConfigured();
  const paystackBound = Boolean(sub?.externalSubscriptionId?.startsWith("paystack:"));
  const recurringCardActive = Boolean(paystackBound && sub?.status === "active");
  const freePeriodWithoutCard = Boolean(sub?.status === "active" && !paystackBound && grant?.recurringMonths);
  const billingSuspended = dunning?.status === "suspended" || sub?.status === "unpaid";
  const graceRemaining = dunning?.graceUntil
    ? Math.max(0, Math.ceil((dunning.graceUntil.getTime() - Date.now()) / 86_400_000))
    : SUBSCRIPTION_GRACE_DAYS;

  return (
    <div className={styles.narrow}>
      <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className={styles.quietLink}>
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {pharmacy.verifiedAt ? "Setup" : "Application"}
      </Link>

      <p className={`${styles.kicker} mt-5`}>{pharmacy.name}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl" style={{ fontFamily: "var(--font-display), serif" }}>
        Card once. Monthly billing automatic.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">KES 100 one-time verification. KES 500/month when service is active.</p>

      <section className={`${styles.notice} ${styles.noticeOk} mt-4`}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <h2>Recurring billing is handled by Paystack</h2>
          <p>Authorize your card on Paystack&apos;s hosted checkout. Future monthly charges happen automatically; Aether never stores your full card number or CVV.</p>
        </div>
      </section>

      {dunning ? (
        <section className={`${styles.notice} ${billingSuspended ? styles.noticeWarn : styles.noticeOk} mt-4`} role="status">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <h2>{billingSuspended ? "Service paused — your data is safe" : `${graceRemaining} day${graceRemaining === 1 ? "" : "s"} of grace remaining`}</h2>
            <p>
              {billingSuspended
                ? "Your public listing and new customer activity are paused. Update the card if needed, then retry the KES 500 payment to restore the pharmacy automatically."
                : `The pharmacy stays fully available during the ${SUBSCRIPTION_GRACE_DAYS}-day grace period. Aether retries the saved card on days 2, 5, 9 and 13.`}
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
                {billingSuspended ? "Payment required to restore service" : recurringCardActive ? "Automatic card renewal active" : freePeriodWithoutCard ? "Free service period active" : paystackBound ? "Card billing needs attention" : "Card authorization required"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {sub.cancelAt ? `Auto-renewal is off. Access ends ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.` : `Current period ends ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.`}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              {recurringCardActive ? <CreditCard className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            </span>
          </div>

          {!sub.cancelAt && !paystackBound && !freePeriodWithoutCard ? (
            recurringAvailable ? <div className="mt-4"><RecurringCardSetupForm pharmacyId={pharmacy.id} /></div> : (
              <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">Recurring cards are not configured. Add PAYSTACK_SECRET_KEY and PAYSTACK_SUBSCRIPTION_PLAN_CODE.</p>
            )
          ) : null}

          {freePeriodWithoutCard ? (
            <p className="mt-4 rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">
              No charge is due during your free period. If Paystack already has a reusable card authorization it is scheduled for the first paid month; otherwise card setup will be requested before that month begins.
            </p>
          ) : null}

          {!sub.cancelAt && paystackBound ? <ManageCardForm pharmacyId={pharmacy.id} /> : null}
          {dunning && paystackBound ? <RetryOverdueForm pharmacyId={pharmacy.id} suspended={billingSuspended} /> : null}
          {!sub.cancelAt && paystackBound ? <CancelServiceForm pharmacyId={pharmacy.id} /> : null}
        </section>
      ) : null}

      <div className="mt-4 grid gap-3">
        {invoices.map((inv) => {
          const latestPayment = inv.payments[0] as PaymentView | undefined;
          const pending = isActivePayment(latestPayment);
          const outcome = describeCardOutcome(latestPayment);
          const resumableCheckout = pending && latestPayment?.provider.startsWith("paystack") && latestPayment.providerRef?.startsWith("https://") ? latestPayment.providerRef : null;
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
                isMonthly ? (
                  <div className="rounded-xl border border-[var(--line-2)] p-3 text-sm leading-6 text-[var(--muted)]">
                    {billingSuspended
                      ? "This invoice is keeping the pharmacy paused. Update the card if necessary and retry payment above; successful payment restores service automatically."
                      : dunning
                        ? `Service remains available during the ${SUBSCRIPTION_GRACE_DAYS}-day grace period while Aether retries the saved card safely.`
                        : recurringCardActive
                          ? "No manual payment is needed. Paystack charges the authorized card and Aether reconciles the invoice from signed webhooks."
                          : freePeriodWithoutCard
                            ? "This service period is covered by your promotion."
                            : "Complete recurring card authorization above. The first successful Paystack subscription charge settles this invoice automatically."}
                  </div>
                ) : pending ? (
                  <div className="space-y-3">
                    <p role="status" className="text-sm text-[var(--muted)]">Secure card checkout is still in progress. Do not start another payment for this invoice.</p>
                    {resumableCheckout ? <a href={resumableCheckout} className="btn-ghost inline-flex min-h-11 items-center justify-center">Resume secure checkout</a> : null}
                  </div>
                ) : (
                  <PharmacyPaymentForm pharmacyId={pharmacy.id} invoiceId={inv.id} invoiceNumber={inv.number} checkoutAvailable={checkoutAvailable} />
                )
              ) : null}
            </section>
          );
        })}
      </div>

      <section className={`${styles.section} mt-5`}>
        <h2 className="font-semibold">1% transaction fee</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Customer-order collections remain separate from this platform subscription. The 1% platform fee is billed as its own statement.</p>
        <p className="mt-3 font-semibold">KES {(feeCents / 100).toFixed(2)} awaiting a statement</p>
        <form action={createTransactionFeeStatement} className="mt-3"><button disabled={feeCents < 100} className="btn-ghost" type="submit">Create fee statement</button></form>
        <p className={styles.fieldHint}>Statements collect whole shillings. Remaining cents carry forward without rounding up.</p>
      </section>

      <PaymentStatusRefresh pending={paymentPending || Boolean(paystackBound && ["past_due", "unpaid"].includes(sub?.status || ""))} />

      {sub ? (
        <Link href="/admin/setup" className="btn-primary mt-5 inline-flex justify-center">Continue to launch checklist</Link>
      ) : readiness.profileReady ? (
        <section className={`${styles.section} mt-4`}>
          <h2 className="font-semibold">Ready to activate</h2>
          <p className="mb-4 mt-2 text-sm text-[var(--muted)]">Authorize a card once. Paystack handles the recurring KES 500 monthly subscription from then on.</p>
          {recurringAvailable ? <PharmacyPaymentForm pharmacyId={pharmacy.id} /> : <p className="rounded-xl border border-[var(--line-2)] p-3 text-xs leading-5 text-[var(--muted)]">Recurring card billing is not configured yet.</p>}
        </section>
      ) : (
        <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className="btn-primary mt-5 inline-flex justify-center">{pharmacy.verifiedAt ? "Continue setup" : "Continue application"}</Link>
      )}
    </div>
  );
}
