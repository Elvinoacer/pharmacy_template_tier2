import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCouponAction, adminLoyaltyAdjustAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
import LoyaltyForm from "@/app/components/admin/LoyaltyForm";
import CouponForm from "@/app/components/admin/CouponForm";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import {
  Award,
  Clock,
  DollarSign,
  Gift,
  Percent,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { formatTimeAgo } from "@/app/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export const metadata = { title: "Loyalty" };

const PAGE_SIZE = 25;

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  silver: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  gold: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300",
  platinum: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300",
};

export default async function AdminLoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cq?: string; page?: string; cpage?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");
  const premiumActive = await hasPremiumPlan(pharmacyId);

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
      subtitle="Operate member balances and coupons first, then review automation rules."
    >
      <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
        {!premiumActive && (
          <PremiumFeatureNotice
            title="Turn loyalty into a repeat-business engine"
            description="Member balances and manual point adjustments stay available on Free. Premium runs birthday, refill and purchase rewards automatically and unlocks promotional coupon management."
            benefits={["Birthday rewards", "Refill rewards", "Order rewards", "Promotional coupons"]}
          />
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="break-words text-sm font-bold uppercase tracking-wide admin-muted">Active points</p>
              <Sparkles className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 break-words text-xl font-black tabular-nums admin-text sm:text-2xl">{totalPoints.toLocaleString()}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="break-words text-sm font-bold uppercase tracking-wide admin-muted">Lifetime</p>
              <TrendingUp className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 break-words text-xl font-black tabular-nums admin-text sm:text-2xl">{totalLifetime.toLocaleString()}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="break-words text-sm font-bold uppercase tracking-wide admin-muted">Coupons</p>
              <Tag className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums admin-text sm:text-2xl">{activeCoupons}</p>
          </div>
          <div className="admin-stat min-w-0 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="break-words text-sm font-bold uppercase tracking-wide admin-muted">Members</p>
              <Award className="h-3.5 w-3.5 shrink-0 admin-accent-text" />
            </div>
            <p className="mt-1 text-xl font-black tabular-nums admin-text sm:text-2xl">{memberCount}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel
            title="Adjust member points"
            description="Add or remove points from a customer balance."
            action={
              recentTx[0] ? (
                <span className="text-sm font-bold uppercase tracking-wide admin-soft">
                  Last update {formatTimeAgo(recentTx[0].createdAt)}
                </span>
              ) : undefined
            }
          >
            <LoyaltyForm action={adminLoyaltyAdjustAction} />
          </AdminPanel>

          <AdminPanel
            title={premiumActive ? (couponCodes.length > 0 ? "Create or manage coupon" : "Create coupon") : "Promotional coupons"}
            description={premiumActive ? "Issue a redeemable coupon, update it, or archive it." : "Coupon automation is part of the Premium growth toolkit."}
          >
            {premiumActive ? (
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
            ) : (
              <PremiumFeatureNotice
                compact
                title="Reward customers without running the programme by hand"
                description="Premium lets you create promotional coupons and combines them with automatic loyalty earning rules."
              />
            )}
          </AdminPanel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel title="Member balances" description={`${accountTotal} matching`}>
            <form className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center" method="get">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  name="q"
                  defaultValue={sp.q || ""}
                  placeholder="Search member or referral code…"
                  className="input-admin min-h-11 pl-9 pr-3"
                />
              </div>
              {sp.cq && <input type="hidden" name="cq" value={sp.cq} />}
              <button type="submit" className="btn-admin min-h-11 !rounded-xl px-3" aria-label="Search members">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
              {sp.q && (
                <Link
                  href={`/admin/loyalty${sp.cq ? `?cq=${encodeURIComponent(sp.cq)}` : ""}`}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:col-auto"
                >
                  <X className="h-3.5 w-3.5" /> Clear member search
                </Link>
              )}
            </form>

            {accounts.length === 0 ? (
              <AdminEmptyState icon={Award} title="No loyalty members found" />
            ) : (
              <ul className="space-y-2">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 transition hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold admin-text">{a.customer.fullName}</p>
                        <p className="mt-1 text-sm leading-5 admin-soft">
                          Lifetime {a.lifetimePoints.toLocaleString()} pts · Referral {a.referralCode}
                          {a.transactions[0] && <> · Last activity {formatTimeAgo(a.transactions[0].createdAt)}</>}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-black tabular-nums admin-text">{a.points.toLocaleString()}</p>
                          <p className="text-sm font-semibold uppercase tracking-wide admin-soft">available points</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold uppercase ${TIER_COLOR[a.tier] || TIER_COLOR.bronze}`}>
                          {a.tier}
                        </span>
                      </div>
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

          <AdminPanel title="Coupons" description={`${couponTotal} matching`}>
            <form className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center" method="get">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  name="cq"
                  defaultValue={sp.cq || ""}
                  placeholder="Search coupon code…"
                  className="input-admin min-h-11 pl-9 pr-3"
                />
              </div>
              {sp.q && <input type="hidden" name="q" value={sp.q} />}
              <button type="submit" className="btn-admin min-h-11 !rounded-xl px-3" aria-label="Search coupons">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
              {sp.cq && (
                <Link
                  href={`/admin/loyalty${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:col-auto"
                >
                  <X className="h-3.5 w-3.5" /> Clear coupon search
                </Link>
              )}
            </form>

            {coupons.length === 0 ? (
              <AdminEmptyState icon={Gift} title="No coupons found" />
            ) : (
              <ul className="space-y-2">
                {coupons.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 transition hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-sm font-black admin-accent-text">{c.code}</span>
                          <span className={`rounded-full px-2 py-1 text-sm font-bold ${c.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300"}`}>
                            {c.active ? "active" : "archived"}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-sm leading-5 admin-muted">{c.description || "No description"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm admin-muted sm:min-w-52 sm:text-right">
                        <span className="inline-flex items-center gap-1 sm:justify-end">
                          {c.discountType === "percent" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                          {Number(c.discountValue)}
                        </span>
                        <span>{c.pointsCost} pts</span>
                        <span>{c.redemptions}{c.maxRedemptions ? `/${c.maxRedemptions}` : ""} redeemed</span>
                        <span className="inline-flex items-center gap-1 sm:justify-end">
                          <Clock className="h-3 w-3" /> {formatTimeAgo(c.updatedAt)}
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
        </div>

        <AdminPanel
          title="Automation rules"
          description="Background earning rules. Review these after the member-facing operations above."
          action={
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
              premiumActive
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-[var(--admin-accent-soft)] admin-accent-text"
            }`}>
              <Zap className="h-3 w-3" /> {premiumActive ? "Cron-backed" : "Premium automation"}
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { trigger: "birthday", label: "Birthday", points: 25, desc: "Annual bonus when birthday messages are enabled." },
              { trigger: "refill_completed", label: "Refill collected", points: 10, desc: "Rewards refills collected in the previous 24 hours." },
              { trigger: "order_paid", label: "Order paid", points: 0, multiplier: "1 pt / KES 100", desc: "Rewards qualifying paid orders from the previous 24 hours." },
            ].map((r) => (
              <div key={r.trigger} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold admin-text">{r.label}</p>
                  <span className={`rounded-full px-2 py-1 text-sm font-bold ${
                    premiumActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-[var(--admin-accent-soft)] admin-accent-text"
                  }`}>
                    {premiumActive ? "Active" : "Premium"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 admin-soft">{r.desc}</p>
                <p className="mt-3 text-sm font-black admin-accent-text">{r.points > 0 ? `+${r.points} pts` : r.multiplier}</p>
              </div>
            ))}
            {rules.map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold admin-text">{r.name}</p>
                  <span className={`rounded-full px-2 py-1 text-sm font-bold ${r.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/10 text-slate-600 dark:text-slate-300"}`}>
                    {r.active ? "DB rule" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 admin-soft">Trigger: {r.trigger}</p>
                <p className="mt-3 text-sm font-black admin-accent-text">+{r.points} pts{r.multiplier ? ` · ×${r.multiplier}` : ""}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 break-words text-sm leading-5 admin-soft">
            {premiumActive
              ? <>The daily worker runs these loyalty automations for this pharmacy.</>
              : <>Automation is paused on Free; existing balances and manual adjustments remain available.</>}
          </p>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
