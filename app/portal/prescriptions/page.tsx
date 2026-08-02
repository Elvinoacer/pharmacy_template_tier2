import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import {
  FileText,
  Plus,
  CalendarClock,
  User,
  Hash,
  Pill,
  Activity,
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

  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: user.customerId },
    orderBy: { nextRefillDue: "asc" },
  });

  const active = prescriptions.filter((p) => p.status === "active");
  const others = prescriptions.filter((p) => p.status !== "active");

  return (
    <PortalShell
      user={user}
      title="Prescriptions"
      subtitle="Your active prescriptions on file with Aether Pharmacy."
      actions={
        <Link href="/portal/refills/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Request refill
        </Link>
      }
    >
      <Panel
        title="Active"
        description={`${active.length} active prescription${active.length === 1 ? "" : "s"}`}
        className="mb-6"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No active prescriptions"
            description="When your doctor sends a prescription to Aether, it'll appear here with refill details."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#e3ebe6] bg-white p-4 transition hover:border-[#0d6e5a]/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <Pill className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0c1a14]">{p.medicineName}</p>
                      {p.dosage && <p className="text-xs text-[#5a6b62]">{p.dosage}</p>}
                    </div>
                  </div>
                  <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-600"}>
                    {p.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
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
                      <span>Due {new Date(p.nextRefillDue).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <Link
                  href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
                >
                  <Plus className="h-3.5 w-3.5" /> Request refill
                </Link>
              </li>
            ))}
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
