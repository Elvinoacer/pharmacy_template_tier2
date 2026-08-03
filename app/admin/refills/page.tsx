import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { REFILL_STATUSES, refillStatusMeta } from "@/app/lib/types";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pill } from "lucide-react";
import { RefillFilter } from "@/app/components/admin/RefillFilter";
import { RefillRow } from "@/app/components/admin/RefillRow";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";

export const metadata = { title: "Refill management" };

const PAGE_SIZE = 25;

export default async function AdminRefillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const statusFilter = sp.status && REFILL_STATUSES.some((s) => s.value === sp.status)
    ? (sp.status as typeof REFILL_STATUSES[number]["value"])
    : undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(sp.q
      ? {
          OR: [
            { medicineName: { contains: sp.q, mode: "insensitive" as const } },
            { rxReference: { contains: sp.q, mode: "insensitive" as const } },
            { customerName: { contains: sp.q, mode: "insensitive" as const } },
            { customer: { fullName: { contains: sp.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, refills, allRefills] = await Promise.all([
    prisma.refillRequest.count({ where }),
    prisma.refillRequest.findMany({
      where,
      include: {
        customer: true,
        assignedTo: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: 0,
    }),
    prisma.refillRequest.groupBy({ by: ["status"], _count: true }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged = page === 1
    ? refills
    : await prisma.refillRequest.findMany({
        where,
        include: { customer: true, assignedTo: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });

  const counts: Record<string, number> = {};
  for (const r of allRefills) counts[r.status] = r._count;

  const queryParams: Record<string, string | undefined> = {
    q: sp.q,
    status: statusFilter,
  };

  return (
    <AdminShell
      user={user}
      title="Refill management"
      subtitle={`${total} request${total === 1 ? "" : "s"}${statusFilter ? ` · ${refillStatusMeta(statusFilter).label}` : ""}`}
    >
      {/* Filter chips + search */}
      <RefillFilter counts={counts} active={statusFilter || "all"} search={sp.q} />

      <AdminPanel>
        {paged.length === 0 ? (
          <AdminEmptyState
            icon={Pill}
            title="No refills match your filters"
            description="Try clearing the status filter or search query."
          />
        ) : (
          <div className="overflow-x-auto scroll-admin">
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
                {paged.map((r) => (
                  <RefillRow
                    key={r.id}
                    refill={{
                      id: r.id,
                      status: r.status,
                      medicineName: r.medicineName,
                      rxReference: r.rxReference,
                      source: r.source,
                      customerName: r.customerName,
                      customerFullName: r.customer?.fullName ?? null,
                      customerId: r.customerId,
                      phone: r.phone,
                      email: r.email,
                      createdAt: r.createdAt,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/refills"
        queryParams={queryParams}
        variant="admin"
      />
    </AdminShell>
  );
}
