import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCouponAction, adminLoyaltyAdjustAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import LoyaltyForm from "@/app/components/admin/LoyaltyForm";
import CouponForm from "@/app/components/admin/CouponForm";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { Sparkles, Tag, Gift, Award, TrendingUp, Percent, DollarSign, Clock, Zap, Search, X } from "lucide-react";
import { formatTimeAgo } from "@/app/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";

export const metadata = { title: "Loyalty" };

const PAGE_SIZE = 25;

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-700",
  silver: "bg-slate-300/15 text-slate-200",
  gold: "bg-yellow-400/15 text-yellow-300",
  platinum: "bg-cyan-400/15 text-cyan-700",
};

export default async function AdminLoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cq?: string; page?: string; cpage?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const accountWhere: Prisma.LoyaltyAccountWhereInput = sp.q
    ? {
        OR: [
          { customer: { fullName: { contains: sp.q, mode: "insensitive" } } },
          { customer: { user: { email: { contains: sp.q, mode: "insensitive" } } } },
          { referralCode: { contains: sp.q, mode: "insensitive" } },
        ],
      }
    : {};

  const couponWhere: Prisma.CouponWhereInput = sp.cq
    ? {
        OR: [
          { code: { contains: sp.cq, mode: "insensitive" } },
          { description: { contains: sp.cq, mode: "insensitive" } },
        ],
      }
    : {};

  const [accountTotal, couponTotal, rules, recentTx, statsAgg] = await Promise.all([
    prisma.loyaltyAccount.count({ where: accountWhere }),
    prisma.coupon.count({ where: couponWhere }),
    prisma.loyaltyRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.loyaltyTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { account: { include: { customer: true } } },
    }),
    prisma.loyaltyAccount.aggregate({
      _sum: { points: true, lifetimePoints: true },
      _count: true,
    }),
  ]);

  const page = parsePageParam(sp.page, accountTotal, PAGE_SIZE);
  const cpage = parsePageParam(sp.cpage, couponTotal, PAGE_SIZE);

  const [accounts, coupons] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: accountWhere,
      include: {
        customer: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { points: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.coupon.findMany({
      where: couponWhere,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (cpage - 1) * PAGE_SIZE,
    }),
  ]);

  // For coupon form collision checks, load just codes (bounded).
  const couponCodes = await prisma.coupon.findMany({
    select: {
      id: true,
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      pointsCost: true,
      maxRedemptions: true,
      redemptions: true,
      validFrom: true,
      validUntil: true,
      active: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalPoints = Number(statsAgg._sum.points ?? 0);
  const totalLifetime = Number(statsAgg._sum.lifetimePoints ?? 0);
  const memberCount = statsAgg._count;
  const activeCoupons = await prisma.coupon.count({ where: { active: true } });

  return (
    <AdminShell
      user={user}
      title="Loyalty & rewards"
      subtitle="Manage points, coupons, and earning rules for your patients and customers."
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Active points</p>
            <Sparkles className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{totalPoints.toLocaleString()}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Lifetime points</p>
            <TrendingUp className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{totalLifetime.toLocaleString()}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Active coupons</p>
            <Tag className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{activeCoupons}</p>
        </div>
        <div className="admin-stat p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Members</p>
            <Award className="h-3.5 w-3.5 admin-accent-text" />
          </div>
          <p className="mt-1 text-2xl font-bold admin-text">{memberCount}</p>
        </div>
      </div>

      <AdminPanel
        title="Automation rules"
        description="These earning rules are checked daily. Review the active rules before adjusting points."
        className="mb-6"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <Zap className="h-2.5 w-2.5" /> Cron-backed
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { trigger: "birthday", label: "Birthday", points: 25, desc: "Annual birthday bonus if birthdayMessages enabled" },
            { trigger: "refill_completed", label: "Refill collected", points: 10, desc: "When a refill is marked collected in the last 24h" },
            { trigger: "order_paid", label: "Order paid", points: 0, multiplier: "1 pt / KES 100", desc: "Paid orders in the last 24h" },
          ].map((r) => (
            <div key={r.trigger} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold admin-text">{r.label}</p>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
              </div>
              <p className="mt-0.5 text-xs admin-soft">{r.desc}</p>
              <p className="mt-2 text-sm font-bold admin-accent-text">
                {r.points > 0 ? `+${r.points} pts` : r.multiplier}
              </p>
            </div>
          ))}
          {rules.map((r) => (
            <div key={r.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold admin-text">{r.name}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${r.active ? "bg-emerald-500/10 text-emerald-700" : "bg-slate-500/10 text-slate-500"}`}>
                  {r.active ? "DB rule" : "Inactive"}
                </span>
              </div>
              <p className="mt-0.5 text-xs admin-soft">Trigger: {r.trigger}</p>
              <p className="mt-2 text-sm font-bold admin-accent-text">
                +{r.points} pts{r.multiplier ? ` · ×${r.multiplier}` : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs admin-soft">
          Schedule via external cron provider (daily 06:00) hitting <code className="md-code">/api/cron/loyalty</code> with secret parameter or header.
        </p>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Adjust points"
          description="Add or remove points from a customer's balance"
          action={
            recentTx[0] ? (
              <span className="text-xs uppercase tracking-wide admin-soft">
                Last update {formatTimeAgo(recentTx[0].createdAt)}
              </span>
            ) : undefined
          }
        >
          <LoyaltyForm action={adminLoyaltyAdjustAction} />
        </AdminPanel>

        <AdminPanel
          title={couponCodes.length > 0 ? "Create / manage coupon" : "Create coupon"}
          description="Issue a new redeemable coupon, or edit/archive existing ones"
        >
          <CouponForm
            action={adminCreateCouponAction}
            coupons={couponCodes.map((c) => ({
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

        <AdminPanel title="Coupons" description={`${couponTotal} matching`}>
          <form className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 admin-soft" />
              <input
                name="cq"
                defaultValue={sp.cq || ""}
                placeholder="Search code…"
                className="w-full rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] py-1.5 pl-8 pr-2 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <button type="submit" className="btn-admin-sm"><Search className="h-3 w-3" /></button>
            {sp.cq && (
              <Link href={`/admin/loyalty${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} className="btn-admin-sm !bg-[var(--admin-inset-2)]">
                <X className="h-3 w-3" />
              </Link>
            )}
          </form>
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
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${c.active ? "bg-emerald-500/15 text-emerald-700" : "bg-slate-500/15 text-slate-500"}`}>
                        {c.active ? "active" : "archived"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs admin-muted">
                      {c.description || "No description"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs admin-muted">
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
          <Pagination
            page={cpage}
            total={couponTotal}
            pageSize={PAGE_SIZE}
            basePath="/admin/loyalty"
            queryParams={{ q: sp.q, cq: sp.cq, page: sp.page }}
            pageParam="cpage"
            variant="admin"
          />
        </AdminPanel>

        <AdminPanel title="Member balances" description={`${accountTotal} matching`}>
          <form className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 admin-soft" />
              <input
                name="q"
                defaultValue={sp.q || ""}
                placeholder="Search member…"
                className="w-full rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] py-1.5 pl-8 pr-2 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
            {sp.cq && <input type="hidden" name="cq" value={sp.cq} />}
            <button type="submit" className="btn-admin-sm"><Search className="h-3 w-3" /></button>
            {sp.q && (
              <Link href={`/admin/loyalty${sp.cq ? `?cq=${encodeURIComponent(sp.cq)}` : ""}`} className="btn-admin-sm !bg-[var(--admin-inset-2)]">
                <X className="h-3 w-3" />
              </Link>
            )}
          </form>
          {accounts.length === 0 ? (
            <AdminEmptyState icon={Award} title="No loyalty members yet" />
          ) : (
            <ul className="space-y-1.5">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium admin-text">{a.customer.fullName}</p>
                    <p className="text-xs admin-soft">
                      Lifetime: {a.lifetimePoints} · Referral: {a.referralCode}
                      {a.transactions[0] && (
                        <> · Last: {formatTimeAgo(a.transactions[0].createdAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold admin-text">{a.points}</span>
                    <span className="text-xs admin-soft">pts</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${TIER_COLOR[a.tier]}`}>
                      {a.tier}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            total={accountTotal}
            pageSize={PAGE_SIZE}
            basePath="/admin/loyalty"
            queryParams={{ q: sp.q, cq: sp.cq, cpage: sp.cpage }}
            variant="admin"
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
