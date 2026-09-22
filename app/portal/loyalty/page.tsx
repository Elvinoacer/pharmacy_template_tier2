import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, StatCard, EmptyState } from "@/app/components/portal/PortalWidgets";
import {
  Sparkles,
  Gift,
  Tag,
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CopyButton } from "@/app/components/portal/CopyButton";
import { RedeemCouponForm } from "@/app/components/portal/RedeemCouponForm";
import { formatDate } from "@/app/lib/time";
import { getTenant } from "@/app/lib/tenant";

export const metadata = { title: "Loyalty" };

const TIER_META: Record<string, { color: string; bg: string; ring: string; next?: string; min: number }> = {
  bronze: { color: "text-amber-700", bg: "bg-amber-100", ring: "ring-amber-200", next: "silver", min: 150 },
  silver: { color: "text-[var(--muted)]", bg: "bg-[var(--card-elev)]", ring: "ring-[var(--line-2)]", next: "gold", min: 400 },
  gold: { color: "text-amber-700", bg: "bg-amber-100", ring: "ring-amber-200", next: "platinum", min: 1000 },
  platinum: { color: "text-[var(--brand-deep)]", bg: "bg-[var(--brand-soft)]", ring: "ring-[var(--line-2)]", min: 0 },
};

export default async function PortalLoyaltyPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  const tenant = await getTenant().catch(() => ({ slug: null as string | null }));

  const [account, coupons] = await Promise.all([
    prisma.loyaltyAccount.findFirst({
      where: { customerId: user.customerId },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
    }),
    prisma.coupon.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const balance = account?.points ?? 0;
  const now = new Date();
  const availableCoupons = coupons.filter((c) => {
    if (c.validFrom && c.validFrom > now) return false;
    if (c.validUntil && c.validUntil < now) return false;
    if (c.maxRedemptions && c.redemptions >= c.maxRedemptions) return false;
    return true;
  });
  const tier = account?.tier ?? "bronze";
  const tierMeta = TIER_META[tier] || TIER_META.bronze;
  const pointsToNext = tierMeta.next ? Math.max(0, tierMeta.min - balance) : 0;
  const progressPct = tierMeta.next ? Math.min(100, Math.round((balance / tierMeta.min) * 100)) : 100;

  return (
    <PortalShell
      user={user}
      title="Loyalty rewards"
      subtitle={`Points and coupons are per pharmacy${tenant.slug ? " — viewing your balance with your active pharmacy" : ""}. Earn on every refill and redeem for exclusive coupons.`}
    >
      <div className="mx-auto mb-6 grid w-full max-w-[1280px] gap-4 sm:grid-cols-3 [&_.card-stat_p:first-child]:text-sm [&_.card-stat_p:nth-child(3)]:text-sm">
        <StatCard
          label="Points balance"
          value={balance}
          hint="Spend on coupons below"
          icon={Sparkles}
          accent="accent"
        />
        <StatCard
          label="Current tier"
          value={tier.toUpperCase()}
          hint={tierMeta.next ? `${pointsToNext} pts to ${tierMeta.next}` : "Top tier reached"}
          icon={Award}
          accent="brand"
        />
        <StatCard
          label="Lifetime points"
          value={account?.lifetimePoints ?? 0}
          hint="All points ever earned"
          icon={TrendingUp}
          accent="info"
        />
      </div>

      <div className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 [&_.card-premium>div:first-child>div>p]:text-sm">
        {/* Tier progress */}
        <Panel title="Your tier" description="Climb the tiers for richer rewards">
          <div className={`mb-4 flex flex-col items-start gap-3 rounded-2xl p-4 ring-2 sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${tierMeta.bg} ${tierMeta.ring}`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--card)] shadow sm:h-14 sm:w-14 ${tierMeta.color}`}>
              <Award className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold uppercase tracking-wide ${tierMeta.color}`}>Current tier</p>
              <p className="break-words text-xl font-bold capitalize text-[var(--foreground)] sm:text-2xl">{tier}</p>
              {tierMeta.next && (
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                  {pointsToNext} more points to reach <strong className="capitalize">{tierMeta.next}</strong>
                </p>
              )}
            </div>
          </div>
          {tierMeta.next && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--foreground)]">{balance} pts</span>
                <span className="text-[var(--muted)]">{tierMeta.min} pts → {tierMeta.next}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-elev)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#2dd4bf] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </Panel>

        {/* Referral code */}
        <Panel title="Referral code" description="Share with family — you both earn after their first refill">
          <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--brand-tint)] p-4 sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Your code</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 break-all font-mono text-xl font-bold tracking-wider text-[var(--brand-deep)] sm:text-3xl">
                {account?.referralCode || "—"}
              </p>
              {account?.referralCode && (
                <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm">
                  <CopyButton value={account.referralCode} />
                </div>
              )}
            </div>
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              Earn <strong className="text-[var(--brand-deep)]">+50 points</strong> for every friend who completes
              their first refill using your code.
            </p>
          </div>
        </Panel>

        {/* Coupons */}
        <Panel
          title="Available coupons"
          description={`${availableCoupons.length} available · ${balance} pts to spend`}
          className="lg:col-span-2"
        >
          {availableCoupons.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No active coupons right now"
              description="Check back soon — new rewards drop every month."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {availableCoupons.map((c) => {
                const alreadyRedeemed = Boolean(account?.transactions.some(
                  (t) => t.type === "redeem" && t.description?.includes(c.code),
                ));
                const canRedeem = c.pointsCost > 0 && balance >= c.pointsCost && !alreadyRedeemed;
                return (
                  <li
                    key={c.id}
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 transition hover:border-[#0d6e5a]/30 hover:shadow-md sm:p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-base font-bold text-[var(--brand-deep)]">{c.code}</p>
                        <p className="mt-1 break-words text-sm leading-relaxed text-[var(--muted)]">{c.description || "Coupon"}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-deep)]">
                        <Gift className="h-5 w-5" />
                      </span>
                    </div>
                    {c.pointsCost > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex min-h-7 items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent-deep)]">
                          <Sparkles className="h-4 w-4" /> {c.pointsCost} pts
                        </span>
                        <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm [&_p]:text-sm">
                          <RedeemCouponForm
                            couponId={c.id}
                            canRedeem={canRedeem}
                            pointsShort={Math.max(0, c.pointsCost - balance)}
                            alreadyRedeemed={alreadyRedeemed}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-[var(--brand-deep)]">Free with any purchase</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Points history */}
        <Panel
          title="Points history"
          description="Your last 20 transactions"
          className="lg:col-span-2"
        >
          {!account?.transactions.length ? (
            <EmptyState icon={TrendingUp} title="No transactions yet" />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {account.transactions.map((t) => {
                const positive = t.points >= 0;
                return (
                  <li key={t.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[var(--foreground)]">
                          {t.description || t.type}
                        </p>
                        <p className="text-sm capitalize leading-relaxed text-[var(--muted)]">
                          {t.type.replace("_", " ")} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-bold ${positive ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {positive ? "+" : ""}
                      {t.points}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
