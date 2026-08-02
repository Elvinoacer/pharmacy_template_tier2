import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { redeemCouponAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, StatCard, EmptyState } from "@/app/components/portal/PortalWidgets";
import {
  Sparkles,
  Gift,
  Tag,
  TrendingUp,
  Award,
  Check,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CopyButton } from "@/app/components/portal/CopyButton";

export const metadata = { title: "Loyalty" };

const TIER_META: Record<string, { color: string; bg: string; ring: string; next?: string; min: number }> = {
  bronze: { color: "text-amber-700", bg: "bg-amber-100", ring: "ring-amber-200", next: "silver", min: 150 },
  silver: { color: "text-slate-700", bg: "bg-slate-200", ring: "ring-slate-300", next: "gold", min: 400 },
  gold: { color: "text-yellow-700", bg: "bg-yellow-100", ring: "ring-yellow-200", next: "platinum", min: 1000 },
  platinum: { color: "text-cyan-700", bg: "bg-cyan-100", ring: "ring-cyan-200", min: 0 },
};

export default async function PortalLoyaltyPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const [account, coupons] = await Promise.all([
    prisma.loyaltyAccount.findUnique({
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
      subtitle="Earn points on every refill and redeem them for exclusive coupons."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tier progress */}
        <Panel title="Your tier" description="Climb the tiers for richer rewards">
          <div className={`mb-4 flex items-center gap-4 rounded-2xl ${tierMeta.bg} ${tierMeta.ring} ring-2 p-5`}>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow ${tierMeta.color}`}>
              <Award className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold uppercase tracking-wide ${tierMeta.color}`}>Current tier</p>
              <p className="text-2xl font-bold capitalize text-[#0c1a14]">{tier}</p>
              {tierMeta.next && (
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  {pointsToNext} more points to reach <strong className="capitalize">{tierMeta.next}</strong>
                </p>
              )}
            </div>
          </div>
          {tierMeta.next && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[#0c1a14]">{balance} pts</span>
                <span className="text-[#5a6b62]">{tierMeta.min} pts → {tierMeta.next}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e3ebe6]">
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
          <div className="rounded-2xl border border-dashed border-[#0d6e5a]/30 bg-[#f0faf6] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">Your code</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="font-mono text-3xl font-bold tracking-wider text-[#0d6e5a]">
                {account?.referralCode || "—"}
              </p>
              {account?.referralCode && <CopyButton value={account.referralCode} />}
            </div>
            <p className="mt-3 text-sm text-[#5a6b62]">
              Earn <strong className="text-[#0d6e5a]">+50 points</strong> for every friend who completes
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
                const canRedeem = c.pointsCost > 0 && balance >= c.pointsCost;
                return (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[#e3ebe6] bg-gradient-to-br from-white to-[#fafbfa] p-4 transition hover:border-[#0d6e5a]/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-base font-bold text-[#084c3f]">{c.code}</p>
                        <p className="mt-0.5 text-xs text-[#5a6b62]">{c.description || "Coupon"}</p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbf4dd] text-[#a08418]">
                        <Gift className="h-5 w-5" />
                      </span>
                    </div>
                    {c.pointsCost > 0 ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge badge-accent">
                          <Sparkles className="h-3 w-3" /> {c.pointsCost} pts
                        </span>
                        <form action={redeemCouponAction}>
                          <input type="hidden" name="couponId" value={c.id} />
                          <button
                            type="submit"
                            disabled={!canRedeem}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#084c3f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            {canRedeem ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> Redeem
                              </>
                            ) : (
                              `Need ${c.pointsCost - balance} more`
                            )}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-[#0d6e5a]">Free with any purchase</p>
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
            <ul className="divide-y divide-[#e3ebe6]">
              {account.transactions.map((t) => {
                const positive = t.points >= 0;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0c1a14]">
                          {t.description || t.type}
                        </p>
                        <p className="text-xs capitalize text-[#5a6b62]">
                          {t.type.replace("_", " ")} · {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold ${positive ? "text-emerald-700" : "text-rose-700"}`}
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
