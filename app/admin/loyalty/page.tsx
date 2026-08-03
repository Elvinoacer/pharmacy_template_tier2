import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCouponAction, adminLoyaltyAdjustAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LoyaltyForm from "@/app/components/admin/LoyaltyForm";
import CouponForm from "@/app/components/admin/CouponForm";
import { Sparkles, Tag, Gift, Award, TrendingUp, Percent, DollarSign, Clock, Zap } from "lucide-react";
import { formatTimeAgo } from "@/app/lib/time";

export const metadata = { title: "Loyalty" };

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-700",
  silver: "bg-slate-300/15 text-slate-200",
  gold: "bg-yellow-400/15 text-yellow-300",
  platinum: "bg-cyan-400/15 text-cyan-700",
};

export default async function AdminLoyaltyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [accounts, coupons, rules, recentTx] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      include: {
        customer: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { points: "desc" },
    }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.loyaltyRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.loyaltyTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { account: { include: { customer: true } } },
    }),
  ]);

  const totalPoints = accounts.reduce((sum, a) => sum + a.points, 0);
  const totalLifetime = accounts.reduce((sum, a) => sum + a.lifetimePoints, 0);

  return (
    <AdminShell
      user={user}
      title="Loyalty program"
      subtitle="Adjust points, manage coupons, and automate earning rules"
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Active points</p>
            <Sparkles className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{Number(totalPoints).toLocaleString()}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Lifetime points</p>
            <TrendingUp className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{Number(totalLifetime).toLocaleString()}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Active coupons</p>
            <Tag className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{coupons.filter((c) => c.active).length}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Members</p>
            <Award className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{accounts.length}</p>
        </div>
      </div>

      {/* Automation rules banner */}
      <AdminPanel
        title="Automation rules"
        description="Cron-job driven — points are credited automatically when these events fire"
        className="mb-6"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Zap className="h-2.5 w-2.5" /> Active
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { trigger: "refill_completed", label: "Refill completed", points: 10, desc: "Customer collects a refill" },
            { trigger: "order_paid", label: "Order paid", points: 0, multiplier: 0.01, desc: "1 point per KES 100 spent" },
            { trigger: "first_order", label: "First order", points: 50, desc: "Welcome bonus on first paid order" },
            { trigger: "birthday", label: "Birthday", points: 25, desc: "Annual birthday bonus" },
            { trigger: "referral_completed", label: "Referral completed", points: 50, desc: "When referee completes first refill" },
            { trigger: "feedback_submitted", label: "Feedback submitted", points: 5, desc: "Customer submits feedback" },
          ].map((r) => (
            <div
              key={r.trigger}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
            >
              <p className="text-xs font-semibold admin-text">{r.label}</p>
              <p className="mt-0.5 text-[10px] admin-soft">{r.desc}</p>
              <p className="mt-2 text-sm font-bold admin-accent-text">
                {r.points > 0 ? `+${r.points} pts` : `${r.multiplier}× spend`}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] admin-soft">
          A daily cron at 06:00 reviews completed refills, paid orders, and birthdays from the
          previous day, then credits points accordingly. No manual taps required.
        </p>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Adjust points"
          description="Add or remove points from a customer's balance"
          action={
            accounts.length > 0 ? (
              <span className="text-[10px] uppercase tracking-wide admin-soft">
                Last update {formatTimeAgo(recentTx[0]?.createdAt)}
              </span>
            ) : undefined
          }
        >
          <LoyaltyForm action={adminLoyaltyAdjustAction} />
        </AdminPanel>

        <AdminPanel
          title={coupons.length > 0 ? "Create / manage coupon" : "Create coupon"}
          description="Issue a new redeemable coupon, or edit/delete existing ones"
        >
          <CouponForm
            action={adminCreateCouponAction}
            coupons={coupons.map((c) => ({
              id: c.id,
              code: c.code,
              description: c.description,
              discountType: c.discountType,
              discountValue: String(c.discountValue),
              pointsCost: c.pointsCost,
              maxRedemptions: c.maxRedemptions,
              redemptions: c.redemptions,
              validFrom: c.validFrom?.toISOString() ?? null,
              validUntil: c.validUntil?.toISOString() ?? null,
              active: c.active,
              updatedAt: c.updatedAt.toISOString(),
            }))}
          />
        </AdminPanel>

        <AdminPanel
          title="Coupons"
          description={`${coupons.length} created`}
        >
          {coupons.length === 0 ? (
            <AdminEmptyState icon={Gift} title="No coupons yet" />
          ) : (
            <ul className="space-y-2">
              {coupons.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold admin-accent-text">{c.code}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-500"}`}>
                        {c.active ? "active" : "off"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs admin-muted">
                      {c.description || "No description"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] admin-muted">
                      <span className="inline-flex items-center gap-0.5">
                        {c.discountType === "percent" ? <Percent className="h-2.5 w-2.5" /> : <DollarSign className="h-2.5 w-2.5" />}
                        {Number(c.discountValue)}
                      </span>
                      <span>·</span>
                      <span>{c.pointsCost} pts</span>
                      <span>·</span>
                      <span>
                        {c.redemptions}
                        {c.maxRedemptions ? `/${c.maxRedemptions}` : ""} redeemed
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatTimeAgo(c.updatedAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Member balances"
          description="Top members by points · last update shown"
        >
          {accounts.length === 0 ? (
            <AdminEmptyState icon={Award} title="No loyalty members yet" />
          ) : (
            <ul className="space-y-1.5">
              {accounts.slice(0, 20).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium admin-text">{a.customer.fullName}</p>
                    <p className="text-[10px] admin-soft">
                      Lifetime: {a.lifetimePoints} · Referral: {a.referralCode}
                      {a.transactions[0] && (
                        <> · Last: {formatTimeAgo(a.transactions[0].createdAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold admin-text">{a.points}</span>
                    <span className="text-[10px] admin-soft">pts</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TIER_COLOR[a.tier]}`}>
                      {a.tier}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
