import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCouponAction, adminLoyaltyAdjustAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LoyaltyForm from "@/app/components/admin/LoyaltyForm";
import CouponForm from "@/app/components/admin/CouponForm";
import { Sparkles, Tag, Gift, Award, TrendingUp, Percent, DollarSign } from "lucide-react";

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

  const [accounts, coupons] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      include: { customer: true },
      orderBy: { points: "desc" },
    }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const totalPoints = accounts.reduce((sum, a) => sum + a.points, 0);
  const totalLifetime = accounts.reduce((sum, a) => sum + a.lifetimePoints, 0);

  return (
    <AdminShell
      user={user}
      title="Loyalty program"
      subtitle="Adjust points, create coupons, and track member engagement"
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

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Adjust points" description="Add or remove points from a customer's balance">
          <LoyaltyForm
            action={adminLoyaltyAdjustAction}
            customers={accounts.map((a) => ({
              id: a.customerId,
              fullName: a.customer.fullName,
              points: a.points,
            }))}
          />
        </AdminPanel>

        <AdminPanel title="Create coupon" description="Issue a new redeemable coupon">
          <CouponForm action={adminCreateCouponAction} />
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
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Member balances"
          description="Top members by points"
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
