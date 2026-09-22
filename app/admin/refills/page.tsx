import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { REFILL_STATUSES } from "@/app/lib/types";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { RefillManagementView } from "@/app/components/admin/RefillManagementView";
import {
  getRefillDashboardSummary,
  getRefillSchedules,
  getMissingRefillsPatients,
} from "@/app/lib/services/refills";

export const metadata = { title: "Medication Refills & Schedules" };

export default async function AdminRefillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; tab?: string }>;
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
            { phone: { contains: sp.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Fetch all dashboard data concurrently
  const [
    stats,
    allStatusCounts,
    activeRefillRows,
    schedulesResult,
    missingPatients,
    historyRowsRaw,
  ] = await Promise.all([
    getRefillDashboardSummary(),
    prisma.refillRequest.groupBy({ by: ["status"], _count: true }),
    prisma.refillRequest.findMany({
      where,
      include: {
        customer: true,
        assignedTo: { select: { email: true } },
        prescription: { select: { id: true, attachmentUrls: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getRefillSchedules({ query: sp.q, pageSize: 100 }),
    getMissingRefillsPatients({ query: sp.q }),
    prisma.refillRequest.findMany({
      where: {
        status: { in: ["collected", "cancelled", "ready_for_pickup"] },
      },
      include: {
        customer: true,
        prescriptionFill: {
          include: {
            dispensedBy: { select: { email: true } },
            order: {
              include: { payments: true },
            },
          },
        },
      },
      orderBy: { statusUpdatedAt: "desc" },
      take: 100,
    }),
  ]);

  const refillCounts: Record<string, number> = {};
  for (const r of allStatusCounts) refillCounts[r.status] = r._count;

  const activeRefills = activeRefillRows.map((r) => ({
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
    notes: r.notes,
    attachmentUrls: r.prescription?.attachmentUrls || [],
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));

  const historyRows = historyRowsRaw.map((r) => ({
    id: r.id,
    medicineName: r.medicineName,
    rxReference: r.rxReference,
    customerName: r.customerName,
    customerFullName: r.customer?.fullName ?? null,
    customerId: r.customerId,
    phone: r.phone,
    email: r.email,
    pickupPreference: (r.pickupPreference === "delivery" ? "delivery" : "pickup") as "delivery" | "pickup",
    status: r.status,
    source: r.source,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    statusUpdatedAt: r.statusUpdatedAt ? r.statusUpdatedAt.toISOString() : new Date().toISOString(),
    prescriptionFill: r.prescriptionFill
      ? {
          id: r.prescriptionFill.id,
          fillNumber: r.prescriptionFill.fillNumber,
          filledAt: r.prescriptionFill.filledAt ? r.prescriptionFill.filledAt.toISOString() : null,
          dispatchedAt: r.prescriptionFill.dispatchedAt ? r.prescriptionFill.dispatchedAt.toISOString() : null,
          netAmount: Number(r.prescriptionFill.netAmount ?? 0),
          quantity: r.prescriptionFill.quantity ?? 1,
          dispensedBy: r.prescriptionFill.dispensedBy,
          order: r.prescriptionFill.order
            ? {
                id: r.prescriptionFill.order.id,
                status: r.prescriptionFill.order.status,
                total: Number(r.prescriptionFill.order.total ?? 0),
                amountPaid: Number(r.prescriptionFill.order.amountPaid ?? 0),
                amountDue: Number(r.prescriptionFill.order.amountDue ?? 0),
                payments: (r.prescriptionFill.order.payments || []).map((p) => ({
                  provider: p.provider,
                  status: p.status,
                  providerRef: p.providerRef ?? null,
                })),
              }
            : null,
        }
      : null,
  }));

  return (
    <AdminShell
      user={user}
      title="Refills & schedules"
      subtitle={`${stats.totalPrescriptionsOnRefill} maintenance prescriptions · ${stats.activeRequestsCount} active requests · ${stats.dueInNext7DaysCount} due this week`}
    >
      <div className="mx-auto w-full min-w-0 max-w-[1280px]">
        <RefillManagementView
          stats={stats}
          activeRefills={activeRefills}
          refillCounts={refillCounts}
          currentStatusFilter={statusFilter || "all"}
          searchQuery={sp.q}
          schedules={schedulesResult.items}
          missingPatients={missingPatients}
          historyRows={historyRows}
        />
      </div>
    </AdminShell>
  );
}
