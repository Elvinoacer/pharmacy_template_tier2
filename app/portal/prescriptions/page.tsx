import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import { AdherenceTracker } from "@/app/components/portal/AdherenceTracker";
import { formatDate } from "@/app/lib/time";
import {
  FileText,
  Plus,
  CalendarClock,
  User,
  Hash,
  Pill,
  Activity,
  TrendingUp,
} from "lucide-react";

export const metadata = { title: "Prescriptions" };

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  expired: "bg-slate-100 text-slate-600",
  discontinued: "bg-rose-100 text-rose-700",
};

export default async function PortalPrescriptionsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: user.customerId },
    orderBy: { nextRefillDue: "asc" },
    include: {
      adherence: {
        orderBy: { takenOn: "desc" },
        take: 30,
      },
    },
  });

  const active = prescriptions.filter((p) => p.status === "active");
  const others = prescriptions.filter((p) => p.status !== "active");

  return (
    <PortalShell
      user={user}
      title="Prescriptions & adherence"
      subtitle="Your medications on file, refill tracking, and dose logging."
      actions={
        <Link href="/portal/refills/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Request refill
        </Link>
      }
    >
      <Panel
        title="Active prescriptions"
        description={`${active.length} active · log doses daily for AI insights`}
        className="mb-6"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No active prescriptions"
            description="When your doctor sends a prescription to Aether, it'll appear here with refill details."
          />
        ) : (
          <ul className="space-y-4">
            {active.map((p) => {
              const last30 = p.adherence.slice(0, 30);
              const taken = last30.filter((a) => a.status === "taken").length;
              const rate = last30.length > 0 ? Math.round((taken / last30.length) * 100) : null;
              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-[#e3ebe6] bg-white p-4 transition hover:border-[#0d6e5a]/30 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                        <Pill className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0c1a14]">{p.medicineName}</p>
                        {p.dosage && <p className="text-xs text-[#5a6b62]">{p.dosage}</p>}
                        {p.schedule && (
                          <p className="text-xs text-[#8a9a92]">{p.schedule}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-600"}>
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {p.rxReference && (
                      <div className="flex items-center gap-1.5 text-[#5a6b62]">
                        <Hash className="h-3 w-3" />
                        <span className="truncate font-mono">{p.rxReference}</span>
                      </div>
                    )}
                    {p.prescriber && (
                      <div className="flex items-center gap-1.5 text-[#5a6b62]">
                        <User className="h-3 w-3" />
                        <span className="truncate">{p.prescriber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[#5a6b62]">
                      <Activity className="h-3 w-3" />
                      <span>{p.refillsRemaining ?? 0} refills left</span>
                    </div>
                    {p.nextRefillDue && (
                      <div className="flex items-center gap-1.5 text-[#0d6e5a]">
                        <CalendarClock className="h-3 w-3" />
                        <span>Due {formatDate(p.nextRefillDue)}</span>
                      </div>
                    )}
                    {(() => {
                      // Course completion estimate from startDate/createdAt + daysSupply × fills.
                      const start = p.startDate || p.createdAt;
                      const days = p.daysSupply;
                      if (!days || days <= 0) return null;
                      const fills = 1 + Math.max(0, p.refillsRemaining ?? 0);
                      const end = new Date(start);
                      end.setDate(end.getDate() + days * fills);
                      return (
                        <div className="flex items-center gap-1.5 text-[#5a6b62]">
                          <CalendarClock className="h-3 w-3" />
                          <span>Course finishes ~ {formatDate(end)}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Adherence rate + graph */}
                  {rate !== null && (
                    <div className="mt-4 rounded-xl bg-[#f4f7f4] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0c1a14]">
                          <TrendingUp className="h-3 w-3 text-[#0d6e5a]" /> Adherence: {rate}%
                        </span>
                        <span className="text-[#8a9a92]">{taken}/{last30.length} doses taken</span>
                      </div>
                      <div className="mt-2 flex h-6 items-end gap-0.5">
                        {last30.slice().reverse().map((a, i) => (
                          <div
                            key={a.id}
                            className={`flex-1 rounded-sm ${
                              a.status === "taken"
                                ? "bg-emerald-400"
                                : a.status === "missed"
                                  ? "bg-rose-400"
                                  : a.status === "skipped"
                                    ? "bg-amber-400"
                                    : "bg-slate-300"
                            }`}
                            style={{ height: "100%" }}
                            title={`${formatDate(a.takenOn)}: ${a.status}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dose logging + refill link */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AdherenceTracker prescriptionId={p.id} />
                    <Link
                      href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        (p.refillsRemaining ?? 0) > 0
                          ? "bg-[#0d6e5a] text-white hover:bg-[#084c3f]"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {(p.refillsRemaining ?? 0) > 0 ? "Request refill" : "No refills remaining"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {others.length > 0 && (
        <Panel title="Other prescriptions" description="On hold, expired, or discontinued">
          <ul className="space-y-2">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ebe6] bg-[#fafbfa] px-3.5 py-3"
              >
                <div>
                  <p className="font-semibold text-[#0c1a14]">{p.medicineName}</p>
                  <p className="text-xs text-[#5a6b62]">
                    {p.rxReference || "No Rx ref"} · {p.prescriber || "Unknown prescriber"}
                  </p>
                </div>
                <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-600"}>
                  {p.status.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PortalShell>
  );
}
