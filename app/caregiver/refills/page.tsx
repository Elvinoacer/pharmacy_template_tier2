import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { refillStatusMeta } from "@/app/lib/types";
import { formatDate, formatDateTime } from "@/app/lib/time";
import { Pill, Plus } from "lucide-react";

export const metadata = { title: "Refill requests" };

export default async function CaregiverRefillsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/refills");

  const links = await getActiveCaregiverLinks(user.id);

  // Fetch refill requests for all linked patients.
  const customerIds = links.map((l) => l.customerId);
  const refills = customerIds.length
    ? await prisma.refillRequest.findMany({
        where: { customerId: { in: customerIds } },
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  // Group by status for the columns.
  const groups: Record<string, typeof refills> = {
    submitted: [],
    under_review: [],
    approved: [],
    preparing: [],
    ready_for_pickup: [],
    collected: [],
    cancelled: [],
  };
  for (const r of refills) {
    if (!groups[r.status]) groups[r.status] = [];
    groups[r.status].push(r);
  }

  // Patients for whom the caregiver can request refills.
  const canRequestFor = new Map(
    links.filter((l) => l.canRequestRefills).map((l) => [l.customerId, l.customer.fullName]),
  );

  return (
    <CaregiverShell
      user={user}
      title="Refill requests"
      subtitle="Track every refill request you've submitted on behalf of your patients."
      actions={
        canRequestFor.size > 0 && (
          <Link
            href="/caregiver/refills/new"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084c3f]"
          >
            <Plus className="h-3.5 w-3.5" /> New refill request
          </Link>
        )
      }
    >
      {refills.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-5 text-center sm:p-8">
          <Pill className="mx-auto h-10 w-10 text-[#8a9a92]" />
          <p className="mt-3 font-semibold text-[#0c1a14]">No refill requests yet</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            {canRequestFor.size > 0
              ? "Submit a refill on behalf of a patient to see it tracked here."
              : "Patients have not granted you refill request permission yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Kanban-style columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {(["submitted", "under_review", "approved", "preparing"] as const).map((status) => (
              <RefillColumn
                key={status}
                status={status}
                refills={groups[status] ?? []}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {(["ready_for_pickup", "collected", "cancelled"] as const).map((status) => (
              <RefillColumn
                key={status}
                status={status}
                refills={groups[status] ?? []}
              />
            ))}
          </div>

          {/* Detailed list */}
          <section className="card-premium min-w-0 p-4 sm:p-5 lg:p-6">
            <h2 className="mb-3 text-base font-semibold text-[#0c1a14] lg:text-lg">All requests</h2>

            <div className="space-y-3 sm:hidden">
              {refills.map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <article key={r.id} className="rounded-xl border border-[#e3ebe6] bg-[#fafbfa] p-4">
                    <div className="flex flex-col gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-[#0c1a14]">{r.medicineName}</p>
                        <p className="mt-1 break-words text-sm text-[#5a6b62]">{r.customer?.fullName ?? "—"}</p>
                      </div>
                      <span className={\`inline-flex min-h-9 w-fit items-center rounded-full px-3 py-1.5 text-sm font-semibold \${meta.color}\`}>
                        {meta.label}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-1 gap-3">
                      <div>
                        <dt className="text-sm font-medium text-[#8a9a92]">Submitted</dt>
                        <dd className="mt-0.5 text-sm text-[#0c1a14]">{formatDate(r.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-[#8a9a92]">Last updated</dt>
                        <dd className="mt-0.5 text-sm text-[#0c1a14]">{formatDateTime(r.statusUpdatedAt)}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-[720px] w-full text-sm">
                <thead>
                  <tr className="text-left text-sm uppercase tracking-wide text-[#8a9a92]">
                    <th className="whitespace-nowrap pb-3 pr-4 font-semibold">Patient</th>
                    <th className="whitespace-nowrap pb-3 pr-4 font-semibold">Medication</th>
                    <th className="whitespace-nowrap pb-3 pr-4 font-semibold">Status</th>
                    <th className="whitespace-nowrap pb-3 pr-4 font-semibold">Submitted</th>
                    <th className="whitespace-nowrap pb-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {refills.map((r) => {
                    const meta = refillStatusMeta(r.status);
                    return (
                      <tr key={r.id} className="border-t border-[#e3ebe6]">
                        <td className="py-3 pr-4 font-medium text-[#0c1a14]">{r.customer?.fullName ?? "—"}</td>
                        <td className="py-3 pr-4 text-[#5a6b62]">{r.medicineName}</td>
                        <td className="py-3 pr-4">
                          <span className={\`inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-sm font-semibold \${meta.color}\`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-[#5a6b62]">{formatDate(r.createdAt)}</td>
                        <td className="whitespace-nowrap py-3 text-[#5a6b62]">{formatDateTime(r.statusUpdatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </CaregiverShell>
  );
}

function RefillColumn({
  status,
  refills,
}: {
  status: string;
  refills: Array<{
    id: string;
    medicineName: string;
    customer?: { fullName: string | null } | null;
    createdAt: Date;
  }>;
}) {
  const meta = refillStatusMeta(status);
  return (
    <div className="card-premium min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-block rounded-full px-2 py-0.5 text-sm font-semibold ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-sm text-[#8a9a92]">{refills.length}</span>
      </div>
      {refills.length === 0 ? (
        <p className="text-sm text-[#8a9a92]">No requests in this stage.</p>
      ) : (
        <ul className="space-y-2">
          {refills.map((r) => (
            <li key={r.id} className="rounded-lg bg-[#f4f7f4] px-2.5 py-2 text-sm">
              <p className="font-semibold text-[#0c1a14]">{r.medicineName}</p>
              <p className="text-sm text-[#5a6b62]">
                {r.customer?.fullName ?? "—"}
              </p>
              <p className="text-sm text-[#8a9a92]">{formatDate(r.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
