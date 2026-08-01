import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminLoyaltyAdjustAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import LoyaltyForm from "@/app/components/admin/LoyaltyForm";

export const metadata = { title: "Loyalty" };

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

  return (
    <AdminShell user={user} title="Loyalty program">
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Adjust points">
          <LoyaltyForm
            action={adminLoyaltyAdjustAction}
            customers={accounts.map((a) => ({
              id: a.customerId,
              fullName: a.customer.fullName,
              points: a.points,
            }))}
          />
        </AdminPanel>
        <AdminPanel title="Coupons">
          <ul className="space-y-2 text-sm">
            {coupons.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 px-3 py-2">
                <span className="font-mono text-teal-200">{c.code}</span> — {c.description}{" "}
                <span className="text-teal-100/40">({c.active ? "active" : "off"})</span>
              </li>
            ))}
          </ul>
        </AdminPanel>
        <AdminPanel title="Member balances">
          <ul className="space-y-2 text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-white/5 py-2">
                <span>{a.customer.fullName}</span>
                <span className="capitalize text-teal-100/70">
                  {a.points} pts · {a.tier}
                </span>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
