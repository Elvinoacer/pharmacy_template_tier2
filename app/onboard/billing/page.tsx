import { withPharmacy } from "@/app/lib/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped as db } from "@/app/lib/db";
import { ensureVerificationInvoice } from "@/app/lib/platform/pharmacy-enrolment";
import PharmacyPricing from "@/app/components/onboard/PharmacyPricing";
import { PharmacyPaymentForm, CancelServiceForm } from "@/app/components/onboard/BillingForms";
export const dynamic = "force-dynamic";
export default async function PharmacyBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboard/billing");
  const pharmacy = await db.pharmacy.findFirst({ where: { ownerUserId: user.id, ...(user.activePharmacyId ? { id: user.activePharmacyId } : {}) }, orderBy: { createdAt: "desc" } });
  if (!pharmacy) redirect("/onboard");
  await ensureVerificationInvoice(pharmacy.id);
  const [invoices, grant, sub] = await withPharmacy(pharmacy.id, () => Promise.all([
    db.invoice.findMany({ where: { pharmacyId: pharmacy.id }, include: { items: true, payments: { where: { status: { in: ["pending", "processing"] } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: pharmacy.id },  }),
    db.subscription.findFirst({ where: { pharmacyId: pharmacy.id, status: { not: "cancelled" } } }),
  ]));
  return <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-28"><Link href={pharmacy.verifiedAt ? "/admin/setup" : "/onboard"} className="text-[var(--brand)] underline">← Continue your pharmacy setup</Link><h1 className="mt-5 text-3xl font-bold">Pricing & billing</h1><p className="mt-2 text-[var(--muted)]">{pharmacy.name} · Payments go to the platform for your pharmacy service.</p><PharmacyPricing/>{grant && <section className="my-5 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5"><h2 className="font-semibold">Your allocated promotion: Saved pharmacy promotion</h2><p className="mt-2 text-sm">Verification: {grant.verification ? "waived" : "KES 100"}. Monthly service: {grant.recurringMonths ? `${grant.recurringMonths} free calendar month(s) from activation, then KES 500/month` : "KES 500/month"}.</p></section>}
    {sub && <section className="my-5 rounded-2xl border border-[var(--border)] p-5"><h2 className="font-semibold">Service: {sub.status.replaceAll("_", " ")}</h2><p className="mt-2 text-sm">{sub.cancelAt ? "Service scheduled to end" : "Current period ends"}: {sub.currentPeriodEnd.toLocaleDateString("en-KE")}</p>{!sub.cancelAt && <CancelServiceForm pharmacyId={pharmacy.id}/>}</section>}
    {!sub && <section className="my-5 rounded-2xl border border-[var(--border)] p-5"><h2 className="mb-3 font-semibold">Ready to launch?</h2><p className="mb-4 text-sm text-[var(--muted)]">Finish verification and profile setup first. Activating creates your first monthly invoice and starts your billing period.</p><PharmacyPaymentForm pharmacyId={pharmacy.id}/></section>}
    {invoices.map(inv => <section key={inv.id} className="my-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{inv.subscriptionId ? "Monthly service" : "One-time verification"}</h2><strong>KES {Number(inv.totalKes).toLocaleString("en-KE")} · {inv.status}</strong></div>{inv.subscriptionId && <p className="mt-2 text-sm">{inv.periodStart.toLocaleDateString("en-KE")} – {inv.periodEnd.toLocaleDateString("en-KE")}</p>}<ul className="my-3 text-sm text-[var(--muted)]">{inv.items.map(item => <li key={item.id}>{item.description}: KES {Number(item.totalKes)}</li>)}</ul>{["open", "overdue"].includes(inv.status) && (inv.payments.length ? <p role="status">Payment awaiting confirmation. Refresh this page for the latest result. Do not pay again while reconciliation is pending.</p> : <PharmacyPaymentForm pharmacyId={pharmacy.id} invoiceId={inv.id}/>)}</section>)}<Link href="/onboard/billing" className="inline-block min-h-11 py-3 font-semibold underline">Refresh payment status</Link></main>;
}
