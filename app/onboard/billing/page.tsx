import { createTransactionFeeStatement } from "@/app/actions/transaction-fees";
import {
  CancelServiceForm,
  PharmacyEnrolmentPricingSelector,
  PharmacyPaymentForm,
  PromoCardForm,
  RetryOverdueForm,
  WaiverRequestForm,
} from "@/app/components/onboard/BillingForms";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { publicErrorMessage } from "@/app/lib/public-error";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";
import { SUBSCRIPTION_GRACE_DAYS } from "@/app/lib/services/daraja-dunning";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import { withPharmacy } from "@/app/lib/tenant-context";
import { isIntasendConfigured } from "@/app/lib/services/intasend";
import { isPharmacyCommissionEnabled } from "@/app/lib/transaction-fee";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy fees & billing" };

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

function describePaymentOutcome(payment: PaymentView | undefined) {
  if (!payment) return null;
  if (payment.status === "succeeded" || payment.status === "completed") {
    return {
      ok: true,
      title: "Payment confirmed",
      message: "Your payment was confirmed successfully by IntaSend.",
    };
  }
  if (payment.status === "failed") {
    return {
      ok: false,
      title: "Payment requires attention",
      message: publicErrorMessage(
        payment.failureReason,
        "We couldn't confirm this payment. Please try again or choose another payment method.",
      ),
    };
  }
  return null;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function PharmacyBillingPage(props: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard/billing");

  const searchParams = props.searchParams ? await props.searchParams : {};

  const explicitPharmacyId = searchParams.pharmacyId;
  const pharmacy = await db.pharmacy.findFirst({
    where: {
      ownerUserId: user.id,
      ...(explicitPharmacyId ? { id: explicitPharmacyId } : user.activePharmacyId ? { id: user.activePharmacyId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pharmacy) redirect("/onboard");

  // If the pharmacy is still in onboarding and not yet published live,
  // keep them in the canonical onboarding journey rather than mature accounting.
  if (pharmacy.status !== "active" || !pharmacy.listed) {
    const isPostApproval = pharmacy.status === "approved" || pharmacy.status === "active";
    const targetStage = isPostApproval ? "service" : "payment";
    const query = new URLSearchParams();
    query.set("stage", targetStage);
    query.set("pharmacyId", pharmacy.id);
    if (searchParams.status) query.set("status", searchParams.status);
    if (searchParams.payment) query.set("payment", searchParams.payment);
    if (searchParams.invoice) query.set("invoice", searchParams.invoice);
    redirect(`/onboard?${query.toString()}`);
  }

  await ensureVerificationInvoice(pharmacy.id);
  const [invoices, grant, sub, dunning, paymentMethod, waiverRequest] = await Promise.all([
    withPharmacy(pharmacy.id, () =>
      db.invoice.findMany({
        where: { pharmacyId: pharmacy.id },
        include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ),
    withPharmacy(pharmacy.id, () =>
      db.pharmacyPromotionGrant.findUnique({
        where: { pharmacyId: pharmacy.id },
        include: { promotion: { select: { name: true, code: true } } },
      }),
    ),
    withPharmacy(pharmacy.id, () =>
      db.subscription.findFirst({
        where: { pharmacyId: pharmacy.id, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
      }),
    ),
    withPharmacy(pharmacy.id, () =>
      db.dunningCase.findFirst({
        where: { pharmacyId: pharmacy.id, status: { notIn: ["resolved", "written_off"] } },
        orderBy: { updatedAt: "desc" },
      }),
    ),
    withPharmacy(pharmacy.id, () =>
      db.billingPaymentMethod.findFirst({
        where: { pharmacyId: pharmacy.id, isDefault: true },
        orderBy: { createdAt: "desc" },
      }),
    ),
    withPharmacy(pharmacy.id, () =>
      db.pharmacyWaiverRequest.findFirst({
        where: { pharmacyId: pharmacy.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, requestedAmountKes: true, decisionNote: true },
      }),
    ),
  ]);

  const readiness = await loadPharmacySetup(pharmacy.id);
  const commissionEnabled = isPharmacyCommissionEnabled();
  const intasendConfigured = isIntasendConfigured();
  const feeBalance = commissionEnabled
    ? await withPharmacy(pharmacy.id, () =>
        db.usageRecord.aggregate({
          where: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents" },
          _sum: { quantity: true },
        }),
      )
    : null;
  const feeCents = feeBalance?._sum?.quantity || 0;
  const paymentPending = invoices.some((invoice) =>
    isActivePayment(invoice.payments[0] as PaymentView | undefined),
  );

  const verificationInvoice = invoices.find(
    (inv) => inv.number === `KYP-${pharmacy.id}` || inv.number.startsWith("BUNDLE-"),
  );
  const verificationGrantKes = Number(grant?.verificationDiscountKes ?? 0) || (grant?.verification ? 100 : 0);
  const verificationPaid = verificationInvoice?.status === "paid" || verificationGrantKes >= 100;
  const subscriptionActive = sub?.status === "active";
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
      <h1
        className="mt-1 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Simple, frictionless billing.
      </h1>
      <p className="mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-[var(--muted)]">
        Pay KES 600 at once (KES 100 verification + KES 500 first month platform service), or pay KES 100 verification first. Powered by IntaSend with M-PESA, Visa &amp; Mastercard.
      </p>

      {/* PROMO CARD / VOUCHER FORM */}
      <div className="mt-5">
        <PromoCardForm pharmacyId={pharmacy.id} />
      </div>
      <div className="mt-3">
        <WaiverRequestForm
          pharmacyId={pharmacy.id}
          latestRequest={waiverRequest ? {
            status: waiverRequest.status,
            requestedAmountKes: waiverRequest.requestedAmountKes === null ? null : Number(waiverRequest.requestedAmountKes),
            decisionNote: waiverRequest.decisionNote,
          } : null}
        />
      </div>

      {/* ACTIVE PROMOTION BANNER */}
      {grant ? (
        <section className={`${styles.notice} ${styles.noticeOk} mt-3`}>
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <h2>
              Promotional Waiver Applied: {grant.promotion?.name || "Active Benefit"}
              {grant.promotion?.code ? ` (${grant.promotion.code})` : ""}
            </h2>
            <p>
              Verification fee: KES {Math.max(0, 100 - (Number(grant.verificationDiscountKes) || (grant.verification ? 100 : 0)))}. Monthly service:{" "}
              {grant.recurringMonths
                ? `KES ${Math.max(0, 500 - (Number(grant.recurringDiscountKes) || 500))} for ${grant.recurringMonths} month${grant.recurringMonths === 1 ? "" : "s"}, then KES 500/month`
                : "KES 500/month"}
              .
            </p>
          </div>
        </section>
      ) : null}

      {/* PRICING & ENROLMENT SELECTOR */}
      <div className="mt-5">
        <h2 className="text-base font-semibold mb-3">Choose how to activate</h2>
        <PharmacyEnrolmentPricingSelector
          pharmacyId={pharmacy.id}
          grant={grant}
          verificationPaid={verificationPaid}
          subscriptionActive={subscriptionActive}
          defaultPhone={defaultPhone}
          paymentAvailable={intasendConfigured}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <section className={styles.section}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <ShieldCheck className="h-4 w-4" />
            <span>KES 100 Verification Fee</span>
          </div>
          <h2 className="mt-1 text-sm font-semibold">One-time admin review &amp; anti-clone lock</h2>
          <ul className="mt-2 space-y-1.5 text-xs text-[var(--muted)]">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>Regulatory Evidence Review:</strong> PPB, premises and pharmacist details are checked when available; missing paperwork does not automatically block intake.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>Anti-Clone Lock:</strong> Locks your pharmacy name &amp; location so impostors cannot copy you.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>IntaSend Multi-Rail:</strong> M-PESA STK prompt, Card, or Bank transfer.</span>
            </li>
          </ul>
          <p className="mt-2 rounded-lg bg-[var(--brand-soft)] p-2 text-[11px] font-semibold text-[var(--brand)]">
            💰 Paid once. Secure verified badge for life.
          </p>
        </section>

        <section className={styles.section}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Sparkles className="h-4 w-4" />
            <span>KES 500 / Month Subscription</span>
          </div>
          <h2 className="mt-1 text-sm font-semibold">~KES 17 a day · Only after you launch</h2>
          <ul className="mt-2 space-y-1.5 text-xs text-[var(--muted)]">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>Storefront &amp; AI:</strong> Dedicated neighborhood chemist profile with 1,400+ pre-loaded Kenyan medicines.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>WhatsApp Refills:</strong> Automated patient refill reminders keep chronic regulars coming back.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
              <span><strong>No Locked Contracts:</strong> Pay month-to-month on your schedule with hosted IntaSend checkout.</span>
            </li>
          </ul>
          <p className="mt-2 rounded-lg bg-[var(--brand-soft)] p-2 text-[11px] font-semibold text-[var(--brand)]">
            💡 Just 1 saved chronic refill covers 5 full months of Afyvia.
          </p>
        </section>
      </div>

      <section className={`${styles.notice} ${styles.noticeOk} mt-3.5`}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <h2>Zero Stored Card Data · Secure Checkout</h2>
          <p>
            Payments are processed through IntaSend&apos;s PCI-DSS compliant checkout. You approve every transaction directly on your phone or browser; we never store your PIN or CVV.
          </p>
        </div>
      </section>

      {dunning ? (
        <section
          className={`${styles.notice} ${billingSuspended ? styles.noticeWarn : styles.noticeOk} mt-4`}
          role="status"
        >
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <h2>
              {billingSuspended
                ? "Service paused — your data is safe"
                : `${graceRemaining} day${graceRemaining === 1 ? "" : "s"} of grace remaining`}
            </h2>
            <p>
              {billingSuspended
                ? "Your public listing and new orders are paused. Settle the overdue invoice with IntaSend to restore your pharmacy immediately."
                : "The pharmacy remains live during your grace window. Renew now with IntaSend."}
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
                  : subscriptionActive
                    ? "Active Platform Subscription"
                    : "Subscription Renewal Due"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {sub.cancelAt
                  ? `Auto-renewal is off. Access ends ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.`
                  : `Current period active through ${sub.currentPeriodEnd.toLocaleDateString("en-KE")}.`}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>

          {dunning ? (
            <RetryOverdueForm pharmacyId={pharmacy.id} suspended={billingSuspended} />
          ) : null}
          {!sub.cancelAt ? <CancelServiceForm pharmacyId={pharmacy.id} /> : null}
        </section>
      ) : null}

      {/* INVOICES SECTION */}
      <div className="mt-5 grid gap-3">
        <h2 className="text-base font-semibold">Invoice history</h2>
        {invoices.map((inv) => {
          const latestPayment = inv.payments[0] as PaymentView | undefined;
          const pending = isActivePayment(latestPayment);
          const outcome = describePaymentOutcome(latestPayment);
          const isMonthly = Boolean(inv.subscriptionId);

          return (
            <section key={inv.id} className={styles.invoice}>
              <div className={styles.invoiceTop}>
                <h2 className="font-semibold">
                  {inv.number.startsWith("BUNDLE-")
                    ? "Launch-Ready Bundle (Verification + 1st Month)"
                    : inv.number.startsWith("TXF-")
                      ? "Transaction fees"
                      : isMonthly
                        ? "Monthly platform service"
                        : "Pharmacy verification"}
                </h2>
                <strong>
                  KES {Number(inv.totalKes).toLocaleString("en-KE")} ·{" "}
                  <span className={inv.status === "paid" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}>
                    {inv.status}
                  </span>
                </strong>
              </div>
              {isMonthly ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {inv.periodStart.toLocaleDateString("en-KE")} –{" "}
                  {inv.periodEnd.toLocaleDateString("en-KE")}
                </p>
              ) : null}
              <ul className="my-2.5 text-xs text-[var(--muted)] space-y-1">
                {inv.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.description}</span>
                    <span className="font-mono">KES {Number(item.totalKes).toLocaleString("en-KE")}</span>
                  </li>
                ))}
              </ul>

              {outcome ? (
                <div
                  className={`${styles.notice} ${outcome.ok ? styles.noticeOk : styles.noticeWarn} mb-3`}
                  role={outcome.ok ? "status" : "alert"}
                >
                  <div>
                    <h3 className="text-xs font-semibold">{outcome.title}</h3>
                    <p className="text-xs">{outcome.message}</p>
                  </div>
                </div>
              ) : null}

              {["open", "overdue"].includes(inv.status) ? (
                pending ? (
                  <p
                    role="status"
                    className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] p-3 text-xs leading-5 text-[var(--foreground)]"
                  >
                    Payment confirmation is in progress with IntaSend. Please allow a moment for confirmation.
                  </p>
                ) : (
                  <PharmacyPaymentForm
                    pharmacyId={pharmacy.id}
                    invoiceId={inv.id}
                    invoiceNumber={inv.number}
                    checkoutAvailable={intasendConfigured}
                  />
                )
              ) : null}
            </section>
          );
        })}
      </div>

      {commissionEnabled ? (
        <section className={`${styles.section} mt-5`}>
          <h2 className="font-semibold">1% transaction fee</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Customer-order collections remain separate from the platform subscription ledger. The 1% platform fee is billed as its own statement.
          </p>
          <p className="mt-3 font-semibold">KES {(feeCents / 100).toFixed(2)} awaiting a statement</p>
          <form action={createTransactionFeeStatement} className="mt-3">
            <button disabled={feeCents < 100} className="btn-ghost" type="submit">
              Create fee statement
            </button>
          </form>
          <p className={styles.fieldHint}>
            Statements collect whole shillings. Remaining cents carry forward without rounding up.
          </p>
        </section>
      ) : null}

      <PaymentStatusRefresh pending={paymentPending} />

      {sub ? (
        <Link href="/admin/setup" className="btn-primary mt-5 inline-flex justify-center">
          Continue to launch checklist
        </Link>
      ) : readiness.profileReady ? (
        <section className={`${styles.section} mt-4`}>
          <h2 className="font-semibold">Ready to activate</h2>
          <p className="mb-4 mt-2 text-sm text-[var(--muted)]">
            Activate your first month with IntaSend to begin serving patients.
          </p>
          <PharmacyPaymentForm pharmacyId={pharmacy.id} checkoutAvailable={intasendConfigured} />
        </section>
      ) : (
        <Link
          href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"}
          className="btn-primary mt-5 inline-flex justify-center"
        >
          {pharmacy.verifiedAt ? "Continue setup" : "Continue application"}
        </Link>
      )}
    </div>
  );
}
