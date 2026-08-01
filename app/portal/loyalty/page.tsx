import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import PortalShell, { Panel, StatCard } from "@/app/components/portal/PortalShell";

export const metadata = { title: "Loyalty" };

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

  return (
    <PortalShell user={user} title="Loyalty rewards">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Points balance" value={account?.points ?? 0} />
        <StatCard label="Lifetime" value={(account?.tier ?? "bronze").toUpperCase()} />
        <StatCard label="Lifetime points" value={account?.lifetimePoints ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Referral code">
          <p className="text-2xl font-semibold tracking-wide text-[#0d6e5a]">
            {account?.referralCode || "—"}
          </p>
          <p className="mt-2 text-sm text-[#5a6b62]">
            Share this code with family. Referral rewards credit both of you after their first
            completed refill.
          </p>
        </Panel>

        <Panel title="Available coupons">
          {coupons.length === 0 ? (
            <p className="text-sm text-[#5a6b62]">No active coupons right now.</p>
          ) : (
            <ul className="space-y-3">
              {coupons.map((c) => (
                <li key={c.id} className="rounded-2xl bg-teal-50/60 px-3 py-3">
                  <p className="font-mono text-sm font-semibold text-[#084c3f]">{c.code}</p>
                  <p className="text-xs text-[#5a6b62]">{c.description}</p>
                  {c.pointsCost > 0 && (
                    <p className="mt-1 text-xs text-[#0d6e5a]">{c.pointsCost} points to redeem</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Points history">
          {!account?.transactions.length ? (
            <p className="text-sm text-[#5a6b62]">No transactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {account.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#5a6b62]">{t.description || t.type}</span>
                  <span className={`font-semibold ${t.points >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                    {t.points >= 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
