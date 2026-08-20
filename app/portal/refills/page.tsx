import { formatDate, formatDateTime } from "@/app/lib/time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import { cancelRefillAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import { computeRefillScheduleMetrics } from "@/app/lib/services/refills";
import {
  Plus,
  Pill,
  Clock,
  MapPin,
  XCircle,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  CreditCard,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export const metadata = { title: "My Refills | Aether Pharmacy" };

export default async function PortalRefillsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const [refills, activePrescriptions] = await Promise.all([
    prisma.refillRequest.findMany({
      where: { customerId: user.customerId },
      include: {
        prescriptionFill: {
          include: {
            order: {
              include: { payments: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: { customerId: user.customerId, status: "active" },
      orderBy: [{ nextRefillDue: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const active = refills.filter((r) => !["collected", "cancelled"].includes(r.status));
  const past = refills.filter((r) => ["collected", "cancelled"].includes(r.status));

  // Compute schedules for active prescriptions
  const schedules = activePrescriptions.map((rx) => {
    const metrics = computeRefillScheduleMetrics(rx);
    const hasOpenRequest = active.some(
      (r) => r.prescriptionId === rx.id || r.medicineName.toLowerCase() === rx.medicineName.toLowerCase(),
    );
    return {
      ...rx,
      metrics,
      hasOpenRequest,
    };
  });

  const STEPS = [
    { id: "submitted", label: "Request Received" },
    { id: "under_review", label: "Pharmacist Review" },
    { id: "approved", label: "Safety Verified" },
    { id: "preparing", label: "Packaging & FEFO Batching" },
    { id: "ready_for_pickup", label: "Ready / Dispatched" },
  ];

  function getStepIndex(status: string) {
    if (status === "submitted") return 0;
    if (status === "under_review") return 1;
    if (status === "approved") return 2;
    if (status === "preparing") return 3;
    if (status === "ready_for_pickup") return 4;
    return 4;
  }

  return (
    <PortalShell
      user={user}
      title="Medication Refills"
      subtitle="Track your refill schedules, request renewals, and manage pickup or home delivery."
      actions={
        <Link href="/portal/refills/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Request a refill
        </Link>
      }
    >
      {/* ── Section 1: Upcoming Refill Schedules ── */}
      <Panel
        title="Active Medication Refill Schedules"
        description="Live tracking of your maintenance days supply and automatic next refill countdowns."
        className="mb-6"
      >
        {schedules.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#5a6b62]">
            You have no active maintenance prescriptions on file.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((rx) => {
              const { metrics } = rx;
              const isDue = metrics.daysRemaining <= 5 && metrics.daysRemaining >= 0;
              const isOverdue = metrics.daysRemaining < 0;
              const totalDays = rx.daysSupply || 30;
              const supplyPercent = Math.max(0, Math.min(100, Math.round((metrics.daysRemaining / totalDays) * 100)));

              return (
                <div
                  key={rx.id}
                  className={`rounded-2xl border p-4 space-y-3 transition ${
                    isOverdue
                      ? "border-rose-300 bg-rose-50/50 shadow-sm"
                      : isDue
                      ? "border-amber-300 bg-amber-50/50 shadow-sm"
                      : "border-[#e3ebe6] bg-white hover:border-[#0d6e5a]/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#0c1a14]">{rx.medicineName}</h4>
                      <p className="text-xs text-[#5a6b62]">{rx.dosage || "Standard regimen"}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (rx.refillsRemaining ?? 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {rx.refillsRemaining ?? 0} Refill{(rx.refillsRemaining ?? 0) === 1 ? "" : "s"} Left
                    </span>
                  </div>

                  {/* Visual Supply Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5a6b62]">Supply Remaining:</span>
                      <strong className={isOverdue ? "text-rose-700" : isDue ? "text-amber-700" : "text-[#0d6e5a]"}>
                        {metrics.daysRemaining > 0 ? `${metrics.daysRemaining} days left` : metrics.statusLabel}
                      </strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverdue ? "bg-rose-500" : isDue ? "bg-amber-500" : "bg-[#0d6e5a]"
                        }`}
                        style={{ width: `${isOverdue ? 100 : supplyPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-[#5a6b62] pt-1">
                    <div className="flex justify-between">
                      <span>Next Due Date:</span>
                      <strong className={isOverdue ? "text-rose-700" : isDue ? "text-amber-700" : "text-[#0c1a14]"}>
                        {formatDate(metrics.projectedDueDate)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rx Number:</span>
                      <span className="font-mono text-[#0c1a14]">{rx.rxReference || "On File"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                    {rx.hasOpenRequest ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-full justify-center">
                        <Sparkles className="h-3 w-3" /> Refill Processing in Queue
                      </span>
                    ) : (
                      <Link
                        href={`/portal/refills/new?prescriptionId=${rx.id}&medicine=${encodeURIComponent(rx.medicineName)}&rx=${encodeURIComponent(rx.rxReference || "")}`}
                        className="btn-primary !py-2 !px-3 text-xs w-full text-center justify-center"
                      >
                        Request This Refill
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Section 2: Active Requests in Progress ── */}
      <Panel
        title="Active Refill Requests in Progress"
        description={`${active.length} request${active.length === 1 ? "" : "s"} currently being prepared.`}
        className="mb-6"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No active refills in queue"
            description="When you submit a refill, you can track every preparation stage right here."
            action={
              <Link href="/portal/refills/new" className="btn-primary !py-2 text-sm">
                <Plus className="h-4 w-4" /> Request a refill
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {active.map((r) => {
              const meta = refillStatusMeta(r.status);
              const currentStepIdx = getStepIndex(r.status);
              const order = r.prescriptionFill?.order;

              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[#e3ebe6] bg-white p-5 space-y-4 shadow-sm"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-[#0c1a14]">{r.medicineName}</h4>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-[#5a6b62]">
                          <span>Submitted {formatDate(r.createdAt)}</span>
                          <span>•</span>
                          <span className="capitalize">{r.pickupPreference === "delivery" ? "🚚 Home Delivery" : "🏢 Branch Pickup"}</span>
                          {r.rxReference && (
                            <>
                              <span>•</span>
                              <span className="font-mono">Rx {r.rxReference}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={meta.color}>{meta.label}</Badge>
                      {r.status === "submitted" && (
                        <form action={cancelRefillAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="btn-icon text-rose-600 hover:bg-rose-50"
                            title="Cancel this refill request"
                            aria-label="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Visual Stepper Tracker */}
                  <div className="pt-2">
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {STEPS.map((step, idx) => {
                        const isDone = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div key={step.id} className="space-y-1.5 text-center">
                            <div className="relative flex items-center justify-center">
                              <div
                                className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold transition ${
                                  isDone
                                    ? "bg-[#0d6e5a] text-white"
                                    : isCurrent
                                    ? "bg-[#0d6e5a] text-white ring-4 ring-[#0d6e5a]/20 animate-pulse"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                {isDone ? "✓" : idx + 1}
                              </div>
                            </div>
                            <p
                              className={`text-[9px] sm:text-[10px] font-semibold leading-tight ${
                                isCurrent
                                  ? "text-[#0d6e5a] font-bold"
                                  : isDone
                                  ? "text-[#0c1a14]"
                                  : "text-gray-400"
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order & Payment Banner if generated */}
                  {order && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f0f9f6] border border-[#d0ece3] p-3 text-xs">
                      <div>
                        <strong className="text-[#0c1a14] block">Refill Order Generated</strong>
                        <span className="text-[#5a6b62]">Total: Kes {Number(order.total).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.amountPaid >= order.total ? (
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                            Paid in Full
                          </span>
                        ) : (
                          <Link
                            href={`/portal/orders`}
                            className="btn-primary !py-1 !px-3 text-xs"
                          >
                            Pay via M-Pesa
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Section 3: Past Refill History ── */}
      <Panel
        title="Refill History & Dispense Receipts"
        description={`${past.length} fulfilled or past refill request${past.length === 1 ? "" : "s"}.`}
      >
        {past.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5a6b62]">No past refill history records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Submitted</th>
                  <th>Completed / Dispensed</th>
                  <th>Fulfillment</th>
                  <th>Receipt / Order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r) => {
                  const meta = refillStatusMeta(r.status);
                  const order = r.prescriptionFill?.order;

                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold text-[#0c1a14]">{r.medicineName}</p>
                        <p className="text-xs text-[#5a6b62]">{r.rxReference || "—"}</p>
                      </td>
                      <td className="text-[#5a6b62]">{formatDate(r.createdAt)}</td>
                      <td className="text-[#5a6b62]">{formatDate(r.statusUpdatedAt)}</td>
                      <td className="capitalize text-[#5a6b62]">
                        {r.pickupPreference === "delivery" ? "🚚 Delivery" : "🏢 Pickup"}
                      </td>
                      <td>
                        {order ? (
                          <span className="font-bold text-xs text-[#0d6e5a]">
                            Kes {Number(order.total).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-[#5a6b62]">—</span>
                        )}
                      </td>
                      <td>
                        <Badge className={meta.color}>{meta.label}</Badge>
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
