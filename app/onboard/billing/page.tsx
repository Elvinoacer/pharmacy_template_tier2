import { createTransactionFeeStatement } from "@/app/actions/transaction-fees";
import { withPharmacy } from "@/app/lib/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";
import PaymentStatusRefresh from "@/app/components/onboard/PaymentStatusRefresh";
import { PharmacyPaymentForm, CancelServiceForm } from "@/app/components/onboard/BillingForms";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy fees" };

export default async function PharmacyBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard/billing");
  const pharmacy = await db.pharmacy.findFirst({
    where: { ownerUserId: user.id, ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!pharmacy) redirect("/onboard");
  await ensureVerificationInvoice(pharmacy.id);
  const [invoices, grant, sub] = await withPharmacy(pharmacy.id, () =>
    Promise.all([
      db.invoice.findMany({
        where: { pharmacyId: pharmacy.id },
        include: { items: true, payments: { where: { status: { in: ["pending", "processing"] } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: pharmacy.id } }),
      db.subscription.findFirst({ where: { pharmacyId: pharmacy.id, status: { not: "cancelled" } } }),
    ]),
  );

  const readiness = await loadPharmacySetup(pharmacy.id);
  const feeBalance = await withPharmacy(pharmacy.id, () => db.usageRecord.aggregate({ where: { pharmacyId: pharmacy.id, metric: "transaction_fee_cents" }, _sum: { quantity: true } }));
  const feeCents = feeBalance._sum.quantity || 0;
  const paymentPending = invoices.some((invoice) => invoice.payments.length > 0);

  return (
    <div className={styles.narrow}>
      <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className={styles.quietLink}>
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {pharmacy.verifiedAt ? "Setup" : "Application"}
      </Link>

      <p className={`${styles.kicker} mt-5`}>{pharmacy.name}</p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Your next step, paid simply
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        KES 100 verification. KES 500/month when you activate service.
      </p>


      {grant ? (
        <section className={`${styles.notice} ${styles.noticeOk} mt-5`}>
          <div>
            <h2>Promotion applied</h2>
            <p>
              Verification: {grant.verification ? "waived" : "KES 100"}. Monthly:{" "}
              {grant.recurringMonths
                ? `${grant.recurringMonths} free month${grant.recurringMonths === 1 ? "" : "s"} after launch, then KES 500`
                : "KES 500 / month"}
              .
            </p>
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-3">
        {invoices.map((inv) => (
          <section key={inv.id} className={styles.invoice}>
            <div className={styles.invoiceTop}>
              <h2 className="font-semibold">{inv.number.startsWith("TXF-") ? "Transaction fees" : inv.subscriptionId ? "Monthly service" : "Verification"}</h2>
              <strong>
                KES {Number(inv.totalKes).toLocaleString("en-KE")} · {inv.status}
              </strong>
            </div>
            {inv.subscriptionId ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {inv.periodStart.toLocaleDateString("en-KE")} – {inv.periodEnd.toLocaleDateString("en-KE")}
              </p>
            ) : null}
            <ul className="my-3 text-sm text-[var(--muted)]">
              {inv.items.map((item) => (
                <li key={item.id}>
                  {item.description}: KES {Number(item.totalKes)}
                </li>
              ))}
            </ul>
            {["open", "overdue"].includes(inv.status) ? (
              inv.payments.length ? (
                <p role="status" className="text-sm">
                  Payment is confirming. Don’t pay again until this updates.
                </p>
              ) : (
                <PharmacyPaymentForm pharmacyId={pharmacy.id} invoiceId={inv.id} />
              )
            ) : null}
          </section>
        ))}
      </div>

      <section className={`${styles.section} mt-5`}>
        <h2 className="font-semibold">1% transaction fee</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Customers pay the listed total to your connected M-Pesa account. Your 1% platform fee is billed separately.</p>
        <p className="mt-3 font-semibold">KES {(feeCents / 100).toFixed(2)} awaiting a statement</p>
        <form action={createTransactionFeeStatement} className="mt-3"><button disabled={feeCents < 100} className="btn-ghost" type="submit">Create fee statement</button></form>
        <p className={styles.fieldHint}>Statements collect whole shillings. Remaining cents carry forward without rounding up.</p>
      </section>
      <PaymentStatusRefresh pending={paymentPending} />
      {sub ? <Link href="/admin/setup" className="btn-primary mt-5 inline-flex justify-center">Continue to launch checklist</Link> : null}
      {sub ? (
        <section className={`${styles.section} mt-4`}>
          <h2 className="font-semibold capitalize">{sub.status.replaceAll("_", " ")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {sub.cancelAt ? "Ends" : "Current period ends"} {sub.currentPeriodEnd.toLocaleDateString("en-KE")}
          </p>
          {!sub.cancelAt ? <CancelServiceForm pharmacyId={pharmacy.id} /> : null}
        </section>
      ) : readiness.profileReady ? (
        <section className={`${styles.section} mt-4`}>
          <h2 className="font-semibold">Go live when ready</h2>
          <p className="mb-4 mt-2 text-sm text-[var(--muted)]">
            Finish verification and setup first. Starting service creates this month’s invoice.
          </p>
          <PharmacyPaymentForm pharmacyId={pharmacy.id} />
        </section>
      ) : (
        <Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className="btn-primary mt-5 inline-flex justify-center">{pharmacy.verifiedAt ? "Continue setup" : "Continue application"}</Link>
      )}

    </div>
  );
}
