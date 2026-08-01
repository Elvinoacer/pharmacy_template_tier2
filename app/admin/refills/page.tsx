import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { REFILL_STATUSES, refillStatusMeta } from "@/app/lib/types";
import { adminUpdateRefillAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

export const metadata = { title: "Refill management" };

export default async function AdminRefillsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const refills = await prisma.refillRequest.findMany({
    include: { customer: true, assignedTo: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell user={user} title="Refill management">
      <AdminPanel title={`${refills.length} requests`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-teal-100/50">
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Medicine</th>
                <th className="pb-2 font-medium">Source</th>
                <th className="pb-2 font-medium">Submitted</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {refills.map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-3">
                      <p className="font-medium">{r.customerName || r.customer?.fullName || "Guest"}</p>
                      <p className="text-xs text-teal-100/40">{r.phone || r.email || "—"}</p>
                    </td>
                    <td className="py-3">
                      <p>{r.medicineName}</p>
                      <p className="text-xs text-teal-100/40">{r.rxReference || "—"}</p>
                    </td>
                    <td className="py-3 capitalize text-teal-100/60">{r.source}</td>
                    <td className="py-3 text-teal-100/60">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${meta.color}`}>{meta.label}</span>
                    </td>
                    <td className="py-3">
                      <form action={adminUpdateRefillAction} className="flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <select
                          name="status"
                          defaultValue={r.status}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                        >
                          {REFILL_STATUSES.map((s) => (
                            <option key={s.value} value={s.value} className="text-black">
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-lg bg-teal-500/20 px-2 py-1 text-xs text-teal-100">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
