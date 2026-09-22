import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CircleGauge,
  CreditCard,
  FileText,
  Megaphone,
  Package,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  X,
} from "lucide-react";

import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  CancelServiceForm,
  PharmacyEnrolmentPricingSelector,
  PromoCardForm,
  RetryOverdueForm,
} from "@/app/components/onboard/BillingForms";
import { getSessionUser } from "@/app/lib/auth";
import { prisma, prismaUnscoped, withPlatformTx } from "@/app/lib/db";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";
import {
  FREE_MEDICINE_LIMIT,
  FREE_SERVICE_LIMIT,
  FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
  FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT,
} from "@/app/lib/platform/plan-policy";
import { getPrescriptionReferralUsage } from "@/app/lib/platform/prescription-referrals";
import { isIntasendConfigured } from "@/app/lib/services/intasend";
import { withPharmacy } from "@/app/lib/tenant-context";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans & billing · Afyvia" };

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function UsageMeter({
  label,
  used,
  limit,
  icon,
}: {
  label: string;
  used: number;
  limit: number;
  icon: ReactNode;
}) {
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
          {icon}
          {label}
        </div>
        <span className="text-sm font-semibold text-[var(--admin-text-muted)]">
          {used} / {limit}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--admin-inset)]">
        <div
          className="h-full rounded-full bg-[var(--admin-accent)] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-[var(--admin-text-soft)]">
        {used >= limit
          ? "Free-plan allowance reached."
          : `${Math.max(0, limit - used)} remaining on Free.`}
      </p>
    </div>
  );
}

const comparison = [
  {
    group: "Plan & core pharmacy",
    feature: "Monthly platform fee",
    free: "KES 0",
    premium: "KES 500 / month",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Core pharmacy workspace",
    free: "Orders, dispensing, prescriptions & patient records included",
    premium: "Included",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Clinical safety & adherence workflows",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Prescriptions, refills & patient requests",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Customer portal & patient records",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Manual staff messaging & reminders",
    free: "Included",
    premium: "Included + automation",
  },
  {
    group: "Plan & core pharmacy",
    feature: "Shared medication library, barcode & manual entry",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Plan & core pharmacy",
    feature: "CSV medication import",
    free: "Up to 500 rows per batch",
    premium: "Included",
  },
  {
    group: "Storefront & commerce",
    feature: "Basic pharmacy storefront",
    free: "Identity, about & delivery basics",
    premium: "Included",
  },
  {
    group: "Storefront & commerce",
    feature: "Advanced storefront studio",
    free: "Not included",
    premium: "Brand colours, hero, sections, gallery, team, FAQ & CTAs",
  },
  {
    group: "Storefront & commerce",
    feature: "Public medicine listings",
    free: `${FREE_MEDICINE_LIMIT} listings`,
    premium: "Unlimited public listings",
  },
  {
    group: "Storefront & commerce",
    feature: "Active pharmacy services",
    free: `${FREE_SERVICE_LIMIT} services`,
    premium: "Unlimited active services",
  },
  {
    group: "Storefront & commerce",
    feature: "Online orders, reservations & bookings",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Storefront & commerce",
    feature: "Delivery workflow & customer fulfilment",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Storefront & commerce",
    feature: "Your pharmacy M-PESA connection",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Patient acquisition",
    feature: "Direct Afyvia prescription referrals",
    free: `${FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT} / month`,
    premium: "Unlimited",
  },
  {
    group: "Patient acquisition",
    feature: "Campaign launches",
    free: `${FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT} / month`,
    premium: "Unlimited",
  },
  {
    group: "Patient acquisition",
    feature: "Campaign delivery",
    free: "Single channel",
    premium: "Multi-channel",
  },
  {
    group: "Patient acquisition",
    feature: "Campaign scheduling",
    free: "Not included",
    premium: "Included",
  },
  {
    group: "Patient acquisition",
    feature: "Patient groups / segments",
    free: "System groups",
    premium: "Custom reusable audiences",
  },
  {
    group: "Patient acquisition",
    feature: "Reusable message templates",
    free: "Read existing templates",
    premium: "Create & manage custom templates",
  },
  {
    group: "Retention & loyalty",
    feature: "Manual patient reminders",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Retention & loyalty",
    feature: "Automatic refill follow-up",
    free: "Manual follow-up",
    premium: "Automatic + manual",
  },
  {
    group: "Retention & loyalty",
    feature: "Loyalty balances & manual point adjustments",
    free: "Included",
    premium: "Included",
  },
  {
    group: "Retention & loyalty",
    feature: "Loyalty automation & promotional coupons",
    free: "Not included",
    premium: "Birthday, refill & order rewards + coupons",
  },
  {
    group: "Operations & intelligence",
    feature: "Inventory basics",
    free: "Stock, batches, stock-outs, low-stock & expiry",
    premium: "Included",
  },
  {
    group: "Operations & intelligence",
    feature: "Inventory intelligence",
    free: "Not included",
    premium: "Sales velocity & reorder guidance",
  },
  {
    group: "Operations & intelligence",
    feature: "AI-assisted medication import",
    free: "Not included",
    premium: "Included",
  },
  {
    group: "Operations & intelligence",
    feature: "Advanced analytics",
    free: "Core operational views",
    premium: "Advanced reporting",
  },
  {
    group: "Operations & intelligence",
    feature: "POS synchronization",
    free: "Not included",
    premium: "Included",
  },
] as const;

export default async function AdminBillingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/billing");

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");

  const membership = user.memberships.find(
    (candidate) =>
      candidate.pharmacyId === pharmacyId && candidate.status === "active",
  );
  if (!membership && !user.platformAdmin) redirect("/admin/select");

  const pharmacy = await prismaUnscoped.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
      status: true,
      listed: true,
      verifiedAt: true,
    },
  });
  if (!pharmacy) redirect("/admin/select");

  const isOwner = pharmacy.ownerUserId === user.id;
  const premiumActive = await hasPremiumPlan(pharmacy.id);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [tenantData, grant, prescriptionReferralUsage] = await Promise.all([
    withPharmacy(pharmacy.id, async () => {
      const [publicMedicines, activeServices, campaignLaunches, subscription, invoices] =
        await Promise.all([
          prisma.pharmacyInventory.count({
            where: { active: true, publicListing: true },
          }),
          prisma.pharmacyService.count({
            where: { active: true },
          }),
          prisma.campaign.count({
            where: {
              OR: [
                { sentAt: { gte: monthStart, lt: nextMonth } },
                { status: "sending", updatedAt: { gte: monthStart, lt: nextMonth } },
              ],
            },
          }),
          prisma.subscription.findFirst({
            where: { status: { not: "cancelled" } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              currentPeriodStart: true,
              currentPeriodEnd: true,
              trialEndsAt: true,
              cancelAt: true,
            },
          }),
          prisma.invoice.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              number: true,
              status: true,
              totalKes: true,
              dueAt: true,
              createdAt: true,
            },
          }),
        ]);
      return { publicMedicines, activeServices, campaignLaunches, subscription, invoices };
    }),
    withPlatformTx((tx) =>
      tx.pharmacyPromotionGrant.findUnique({
        where: { pharmacyId: pharmacy.id },
        include: {
          promotion: {
            select: { name: true, code: true, recurringMonths: true },
          },
        },
      }),
    ).catch(() => null),
    getPrescriptionReferralUsage(pharmacy.id),
  ]);

  const paymentAvailable = isIntasendConfigured();
  const periodEnd = formatDate(tenantData.subscription?.currentPeriodEnd);
  const latestInvoice = tenantData.invoices[0];
  const needsRenewal = ["past_due", "unpaid"].includes(
    tenantData.subscription?.status || "",
  );

  return (
    <AdminShell
      user={user}
      title="Plans & billing"
      subtitle="Keep the free pharmacy workspace, or move to Premium when you need more reach and automation."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1 text-sm font-semibold text-[var(--admin-text-muted)]">
                  {premiumActive ? (
                    <BadgeCheck className="h-3.5 w-3.5 text-[var(--admin-accent)]" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--admin-accent)]" />
                  )}
                  {premiumActive ? "Premium active" : "Free plan"}
                </span>
                {tenantData.subscription?.status && (
                  <span className="rounded-full bg-[var(--admin-inset)] px-3 py-1 text-sm font-semibold capitalize text-[var(--admin-text-soft)]">
                    {tenantData.subscription.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-tight text-[var(--admin-text)] sm:text-3xl">
                {premiumActive
                  ? "Your pharmacy has Premium capacity."
                  : "Start free. Upgrade only when the limits begin to matter."}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
                Free keeps the pharmacy operating and visible. Premium removes growth limits and adds automation: unlimited campaigns and referrals, custom audiences, automatic follow-up, loyalty automation, inventory intelligence, AI-assisted imports, advanced analytics and POS synchronization.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--admin-text-muted)]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-inset)] px-3 py-2">
                  <Store className="h-3.5 w-3.5" /> Storefront stays available on Free
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-inset)] px-3 py-2">
                  <CreditCard className="h-3.5 w-3.5" /> Month-to-month Premium
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--admin-border)] bg-[var(--admin-inset)]/70 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--admin-accent-text)]">
                {premiumActive ? "Current plan" : "Upgrade"}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold tracking-tight text-[var(--admin-text)]">
                  {premiumActive ? "Premium" : "KES 500"}
                </span>
                {!premiumActive && (
                  <span className="pb-1 text-sm text-[var(--admin-text-muted)]">/ month</span>
                )}
              </div>

              {premiumActive ? (
                <div className="mt-4 space-y-3 text-sm text-[var(--admin-text-muted)]">
                  <p className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    Premium entitlements are active.
                  </p>
                  {periodEnd ? <p>Current paid period ends {periodEnd}.</p> : null}
                  {tenantData.subscription?.cancelAt ? (
                    <p className="text-amber-700 dark:text-amber-300">
                      Auto-renewal is set to stop at period end.
                    </p>
                  ) : null}
                  {isOwner && !tenantData.subscription?.cancelAt ? (
                    <details className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
                      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-[var(--admin-text-muted)]">
                        Manage Premium renewal
                      </summary>
                      <div className="border-t border-[var(--admin-border)] p-3">
                        <p className="text-sm leading-5 text-[var(--admin-text-soft)]">
                          Cancelling stops automatic renewal. Premium remains available through the current paid period.
                        </p>
                        <CancelServiceForm pharmacyId={pharmacy.id} />
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : isOwner ? (
                <div className="mt-4">
                  {needsRenewal ? (
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                      <p className="text-sm font-semibold text-[var(--admin-text)]">
                        Premium payment needs attention
                      </p>
                      <p className="mt-1 text-sm leading-5 text-[var(--admin-text-muted)]">
                        Settle the outstanding monthly invoice to restore Premium entitlements. Your Free plan remains available.
                      </p>
                      <RetryOverdueForm
                        pharmacyId={pharmacy.id}
                        suspended={tenantData.subscription?.status === "unpaid"}
                      />
                    </div>
                  ) : (
                    <PharmacyEnrolmentPricingSelector
                      pharmacyId={pharmacy.id}
                      grant={grant}
                      verificationPaid
                      subscriptionActive={false}
                      paymentAvailable={paymentAvailable}
                    />
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 text-sm text-[var(--admin-text-muted)]">
                  The pharmacy owner can activate Premium. You can still review the benefits and current usage here.
                </div>
              )}

              <Link
                href="/onboard/billing"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--admin-accent-text)] hover:underline"
              >
                Billing history & payment management
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {!premiumActive && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--admin-accent-text)]">
                  Free plan usage
                </p>
                <h2 className="mt-1 text-lg font-bold text-[var(--admin-text)]">
                  Know exactly when an upgrade is useful
                </h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <UsageMeter
                label="Public medicine listings"
                used={tenantData.publicMedicines}
                limit={FREE_MEDICINE_LIMIT}
                icon={<Package className="h-4 w-4 text-[var(--admin-accent)]" />}
              />
              <UsageMeter
                label="Active services"
                used={tenantData.activeServices}
                limit={FREE_SERVICE_LIMIT}
                icon={<Stethoscope className="h-4 w-4 text-[var(--admin-accent)]" />}
              />
              <UsageMeter
                label="Direct prescription referrals this month"
                used={prescriptionReferralUsage.used}
                limit={FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT}
                icon={<FileText className="h-4 w-4 text-[var(--admin-accent)]" />}
              />
              <UsageMeter
                label="Campaign launches this month"
                used={tenantData.campaignLaunches}
                limit={FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT}
                icon={<Megaphone className="h-4 w-4 text-[var(--admin-accent)]" />}
              />
            </div>
            <p className="mt-3 text-sm leading-5 text-[var(--admin-text-soft)]">
              The prescription allowance applies only to new referrals generated through the Afyvia marketplace. Existing patients, pharmacy storefront requests, staff-entered prescriptions and in-person care are never blocked by this limit.
            </p>
          </section>
        )}

        <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--admin-accent-text)]">
                Compare plans
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--admin-text)]">
                Free vs Premium
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-5 text-[var(--admin-text-muted)]">
              Compare the essential operating, storefront, patient-growth, retention and intelligence capabilities. Core pharmacy and clinical work stays usable on Free; Premium is for scale, automation and deeper growth tools.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--admin-border)]">
            <div className="hidden grid-cols-[1.3fr_0.85fr_0.85fr] bg-[var(--admin-inset)] text-sm font-bold text-[var(--admin-text)] sm:grid">
              <div className="p-4">Capability</div>
              <div className="border-l border-[var(--admin-border)] p-4">Free</div>
              <div className="border-l border-[var(--admin-border)] p-4">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--admin-accent)]" />
                  Premium
                </span>
              </div>
            </div>
            {comparison.map((row, index) => {
              const startsGroup =
                index === 0 || comparison[index - 1]?.group !== row.group;
              return (
                <div key={row.feature}>
                  {startsGroup ? (
                    <div className="border-t border-[var(--admin-border)] bg-[var(--admin-inset)]/60 px-3 py-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--admin-accent-text)] sm:px-4">
                      {row.group}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 border-t border-[var(--admin-border)] text-sm sm:grid-cols-[1.3fr_0.85fr_0.85fr]">
                    <div className="p-3 font-semibold text-[var(--admin-text)] sm:p-4">
                      {row.feature}
                    </div>
                    <div className="border-t border-[var(--admin-border)] p-3 text-[var(--admin-text-muted)] sm:border-l sm:border-t-0 sm:p-4">
                      <span className="mb-2 block font-bold text-[var(--admin-text)] sm:hidden">Free</span>
                      {row.free === "Not included" ? (
                        <span className="inline-flex items-center gap-2">
                          <X className="h-4 w-4 shrink-0 text-[var(--admin-text-soft)]" />
                          {row.free}
                        </span>
                      ) : row.free === "Included" ? (
                        <span className="inline-flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          Included
                        </span>
                      ) : (
                        row.free
                      )}
                    </div>
                    <div className="border-t border-[var(--admin-border)] p-3 font-medium text-[var(--admin-text)] sm:border-l sm:border-t-0 sm:p-4">
                      <span className="mb-2 block font-bold sm:hidden">Premium</span>
                      <span className="inline-flex items-start gap-2">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                        {row.premium}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Megaphone className="h-5 w-5" />,
              title: "Patient growth engine",
              body: "Combine campaigns, custom audiences, follow-up and loyalty so the pharmacy can bring customers back instead of managing each touch manually.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Intelligence & automation",
              body: "Use inventory velocity, advanced analytics and AI-assisted imports to reduce repetitive work and make better operating decisions.",
            },
            {
              icon: <PlugZap className="h-5 w-5" />,
              title: "Scale-ready operations",
              body: "Remove Free growth limits and connect supported POS workflows while keeping the core pharmacy workspace available on every plan.",
            },
          ].map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--admin-inset)] text-[var(--admin-accent-text)]">
                {benefit.icon}
              </div>
              <h3 className="mt-4 text-sm font-bold text-[var(--admin-text)]">
                {benefit.title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-[var(--admin-text-muted)]">
                {benefit.body}
              </p>
            </article>
          ))}
        </section>

        {isOwner && (
          <details className="group rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">
              <span className="inline-flex items-center gap-2">
                <Tag className="h-4 w-4 text-[var(--admin-accent)]" />
                Have a voucher or promotional code?
              </span>
              <span className="text-sm font-medium text-[var(--admin-text-soft)] group-open:hidden">
                Optional
              </span>
            </summary>
            <div className="border-t border-[var(--admin-border)] p-4">
              <p className="mb-3 text-sm leading-5 text-[var(--admin-text-muted)]">
                Vouchers are optional. Apply one here only if the platform team gave your pharmacy a code.
              </p>
              <PromoCardForm pharmacyId={pharmacy.id} />
            </div>
          </details>
        )}

        <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text)]">
                <CircleGauge className="h-4 w-4 text-[var(--admin-accent)]" />
                Billing snapshot
              </div>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Latest platform invoice activity for {pharmacy.name}.
              </p>
            </div>
            {latestInvoice ? (
              <span className="rounded-full bg-[var(--admin-inset)] px-3 py-1 text-sm font-semibold capitalize text-[var(--admin-text-muted)]">
                Latest: {latestInvoice.status}
              </span>
            ) : null}
          </div>

          {tenantData.invoices.length ? (
            <div className="mt-4 divide-y divide-[var(--admin-border)] overflow-hidden rounded-xl border border-[var(--admin-border)]">
              {tenantData.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-col gap-2 bg-[var(--admin-panel)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--admin-text)]">{invoice.number}</p>
                    <p className="mt-1 text-[var(--admin-text-soft)]">
                      {formatDate(invoice.createdAt)}
                      {invoice.dueAt ? ` · due ${formatDate(invoice.dueAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--admin-text)]">
                      KES {Number(invoice.totalKes).toLocaleString("en-KE")}
                    </span>
                    <span className="rounded-full bg-[var(--admin-inset)] px-2 py-1 font-semibold capitalize text-[var(--admin-text-muted)]">
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--admin-text-muted)]">
              No platform invoices yet.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
