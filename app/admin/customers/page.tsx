import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listCustomers } from "@/app/lib/services/crm";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const customers = await listCustomers(sp.q);

  return (
    <AdminShell user={user} title="Customer CRM">
      <form className="mb-6">
        <input
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Search name, email, or phone…"
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-teal-100/30 outline-none focus:ring-2 focus:ring-teal-500/40"
        />
      </form>

      <AdminPanel title={`${customers.length} customers`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-teal-100/50">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Contact</th>
                <th className="pb-2 font-medium">Segments</th>
                <th className="pb-2 font-medium">Loyalty</th>
                <th className="pb-2 font-medium">Activity</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-teal-200 hover:underline">
                      {c.fullName}
                    </Link>
                    <p className="text-xs text-teal-100/40">{c.user.email}</p>
                  </td>
                  <td className="py-3 text-teal-100/70">{c.phone || "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.segments.slice(0, 3).map((s) => (
                        <span key={s.segmentId} className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] text-teal-200">
                          {s.segment.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 capitalize text-teal-100/70">
                    {c.loyaltyAccount ? `${c.loyaltyAccount.points} pts · ${c.loyaltyAccount.tier}` : "—"}
                  </td>
                  <td className="py-3 text-teal-100/50">
                    {c._count.refillRequests} refills · {c._count.prescriptions} Rx
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
