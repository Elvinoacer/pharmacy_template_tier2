import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { REFILL_STATUSES, refillStatusMeta } from "@/app/lib/types";
import { adminUpdateRefillAction } from "@/app/actions/admin";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
import {
  Pill,
  Clock,
  Phone,
  Mail,
  Save,
} from "lucide-react";
import { RefillFilter } from "@/app/components/admin/RefillFilter";

export const metadata = { title: "Refill management" };

export default async function AdminRefillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const statusFilter = sp.status && REFILL_STATUSES.some((s) => s.value === sp.status)
    ? (sp.status as typeof REFILL_STATUSES[number]["value"])
    : undefined;

  const refills = await prisma.refillRequest.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(sp.q
        ? {
            OR: [
              { medicineName: { contains: sp.q, mode: "insensitive" } },
              { rxReference: { contains: sp.q, mode: "insensitive" } },
              { customerName: { contains: sp.q, mode: "insensitive" } },
              { customer: { fullName: { contains: sp.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      customer: true,
      assignedTo: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Status counts for the filter chips
  const allRefills = await prisma.refillRequest.groupBy({
    by: ["status"],
    _count: true,
  });
  const counts: Record<string, number> = {};
  for (const r of allRefills) counts[r.status] = r._count;

  return (
    <AdminShell
      user={user}
      title="Refill management"
      subtitle={`${refills.length} request${refills.length === 1 ? "" : "s"}${statusFilter ? ` · ${refillStatusMeta(statusFilter).label}` : ""}`}
    >
      {/* Filter chips */}
      <RefillFilter counts={counts} active={statusFilter || "all"} search={sp.q} />

      <AdminPanel>
        {refills.length === 0 ? (
          <AdminEmptyState
            icon={Pill}
            title="No refills match your filters"
            description="Try clearing the status filter or search query."
          />
        ) : (
          <div className="overflow-x-auto scroll-thin-dark">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Medicine</th>
                  <th>Source</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {refills.map((r) => {
                  const meta = refillStatusMeta(r.status);
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold text-white">
                          {r.customerName || r.customer?.fullName || "Guest"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-[#ecfdf5]/45">
                          {r.phone && (
                            <span className="inline-flex items-center gap-0.5">
                              <Phone className="h-2.5 w-2.5" /> {r.phone}
                            </span>
                          )}
                          {r.email && (
                            <span className="inline-flex items-center gap-0.5">
                              <Mail className="h-2.5 w-2.5" /> {r.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-white">{r.medicineName}</p>
                        <p className="font-mono text-[10px] text-[#ecfdf5]/45">{r.rxReference || "—"}</p>
                      </td>
                      <td>
                        <span className="inline-flex items-center rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium capitalize text-[#ecfdf5]/70">
                          {r.source}
                        </span>
                      </td>
                      <td className="text-xs text-[#ecfdf5]/55">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <form action={adminUpdateRefillAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={r.id} />
                          <select
                            name="status"
                            defaultValue={r.status}
                            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-xs text-white focus:border-[#2dd4bf]/60 focus:outline-none"
                          >
                            {REFILL_STATUSES.map((s) => (
                              <option key={s.value} value={s.value} className="bg-[#122620]">
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2dd4bf]/20 px-2 py-1 text-[10px] font-semibold text-[#2dd4bf] transition hover:bg-[#2dd4bf]/30"
                            title="Save status"
                          >
                            <Save className="h-3 w-3" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
