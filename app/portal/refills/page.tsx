import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import { cancelRefillAction } from "@/app/actions/portal";
import PortalShell, { Badge, Panel } from "@/app/components/portal/PortalShell";

export const metadata = { title: "My refills" };

export default async function PortalRefillsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const refills = await prisma.refillRequest.findMany({
    where: { customerId: user.customerId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PortalShell user={user} title="Refill requests">
      <div className="mb-4 flex justify-end">
        <Link href="/portal/refills/new" className="btn-primary !py-2.5 text-sm">
          New refill request
        </Link>
      </div>
      <Panel title="All requests">
        {refills.length === 0 ? (
          <p className="text-sm text-[#5a6b62]">No refill requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-teal-900/10 text-xs uppercase tracking-wide text-[#5a6b62]">
                  <th className="pb-2 font-medium">Medicine</th>
                  <th className="pb-2 font-medium">Submitted</th>
                  <th className="pb-2 font-medium">Pickup</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {refills.map((r) => {
                  const meta = refillStatusMeta(r.status);
                  const canCancel = !["collected", "cancelled"].includes(r.status);
                  return (
                    <tr key={r.id} className="border-b border-teal-900/5">
                      <td className="py-3">
                        <p className="font-medium text-[#0c1a14]">{r.medicineName}</p>
                        <p className="text-xs text-[#5a6b62]">{r.rxReference || "—"}</p>
                      </td>
                      <td className="py-3 text-[#5a6b62]">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 capitalize text-[#5a6b62]">{r.pickupPreference}</td>
                      <td className="py-3">
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {canCancel && (
                          <form action={cancelRefillAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="text-xs font-medium text-rose-600 hover:underline">
                              Cancel
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PortalShell>
  );
}
