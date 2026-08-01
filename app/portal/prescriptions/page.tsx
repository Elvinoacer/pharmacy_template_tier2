import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import PortalShell, { Badge, Panel } from "@/app/components/portal/PortalShell";

export const metadata = { title: "Prescriptions" };

export default async function PortalPrescriptionsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: user.customerId },
    orderBy: { nextRefillDue: "asc" },
  });

  return (
    <PortalShell user={user} title="Prescriptions">
      <Panel title="On file">
        {prescriptions.length === 0 ? (
          <p className="text-sm text-[#5a6b62]">No prescriptions linked to your account yet.</p>
        ) : (
          <div className="grid gap-3">
            {prescriptions.map((p) => (
              <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-teal-900/8 p-4">
                <div>
                  <p className="font-semibold text-[#0c1a14]">{p.medicineName}</p>
                  <p className="text-sm text-[#5a6b62]">{p.dosage || "Dosage on file with pharmacy"}</p>
                  <p className="mt-1 text-xs text-[#5a6b62]">
                    Rx {p.rxReference || "—"} · Prescriber {p.prescriber || "—"} ·{" "}
                    {p.refillsRemaining ?? 0} refills remaining
                  </p>
                  {p.nextRefillDue && (
                    <p className="mt-1 text-xs text-[#0d6e5a]">
                      Next refill due {new Date(p.nextRefillDue).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-50 text-teal-800 capitalize">{p.status}</Badge>
                  {p.status === "active" && (
                    <Link
                      href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                      className="rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Request refill
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PortalShell>
  );
}
