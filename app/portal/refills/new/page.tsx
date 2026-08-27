import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { prisma } from "@/app/lib/db";
import { portalRefillAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import PortalRefillForm from "@/app/components/portal/PortalRefillForm";
import { Info, Clock, Truck, Store } from "lucide-react";

export const metadata = { title: "Request refill" };

export default async function NewRefillPage({
  searchParams,
}: {
  searchParams: Promise<{ prescriptionId?: string; medicine?: string; rx?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  // Spec-named QA page — must enforce onboarding like every other portal route.
  await requireOnboarded();
  const sp = await searchParams;

  const profile = await prisma.customerProfile.findUnique({ where: { id: user.customerId } });
  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: user.customerId, status: "active" },
    orderBy: { medicineName: "asc" },
  });

  return (
    <PortalShell
      user={user}
      title="Request a refill"
      subtitle="A pharmacist will review every request before preparing your medication."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <Info className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">Not a clinical approval</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  Submitting this form starts a refill request. A pharmacist must review and approve
                  every prescription before it is prepared.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="What happens next">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[10px] font-bold text-white">1</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Submitted</p>
                  <p className="text-xs text-[#5a6b62]">Request enters our pharmacist queue</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[10px] font-bold text-white">2</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Under review</p>
                  <p className="text-xs text-[#5a6b62]">Pharmacist verifies the prescription</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[10px] font-bold text-white">3</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Preparing</p>
                  <p className="text-xs text-[#5a6b62]">Medication is being prepared</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[10px] font-bold text-white">4</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Ready for pickup</p>
                  <p className="text-xs text-[#5a6b62]">You will get a notification when it is ready</p>
                </div>
              </li>
            </ol>
          </Panel>
          <Panel>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[#5a6b62]">
                <Clock className="h-4 w-4 text-[#0d6e5a]" />
                <span>Average review time: <strong className="text-[#0c1a14]">2 hours</strong></span>
              </div>
              <div className="flex items-center gap-2 text-[#5a6b62]">
                <Store className="h-4 w-4 text-[#0d6e5a]" />
                <span>Pickup at any branch</span>
              </div>
              <div className="flex items-center gap-2 text-[#5a6b62]">
                <Truck className="h-4 w-4 text-[#0d6e5a]" />
                <span>Home delivery available</span>
              </div>
            </div>
          </Panel>
        </aside>

        <div className="lg:col-span-2">
          <Panel
            title="Refill details"
            description={
              prescriptions.length > 0
                ? "Select a prescription on file — medicine details are locked to your record"
                : "A prescription on file is required before you can request a refill"
            }
          >
            <PortalRefillForm
              action={portalRefillAction}
              prescriptions={prescriptions.map((p) => ({
                id: p.id,
                medicineName: p.medicineName,
                rxReference: p.rxReference,
                refillsRemaining: p.refillsRemaining,
              }))}
              defaults={{
                prescriptionId: sp.prescriptionId || "",
                medicineName: sp.medicine || "",
                rxReference: sp.rx || "",
                phone: profile?.phone || "",
              }}
            />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
