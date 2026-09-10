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
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
        <aside className="order-2 min-w-0 space-y-3 lg:order-1 lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Info className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Not a clinical approval</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Submitting this form starts a refill request. A pharmacist must review and approve
                  every prescription before it is prepared.
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="What happens next">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">1</span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Submitted</p>
                  <p className="text-xs text-muted">Request enters our pharmacist queue</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">2</span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Under review</p>
                  <p className="text-xs text-muted">Pharmacist verifies the prescription</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">3</span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Preparing</p>
                  <p className="text-xs text-muted">Medication is being prepared</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">4</span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Ready for pickup</p>
                  <p className="text-xs text-muted">You will get a notification when it is ready</p>
                </div>
              </li>
            </ol>
          </Panel>
          <Panel>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-muted">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>Average review time: <strong className="text-foreground">2 hours</strong></span>
              </div>
              <div className="flex items-start gap-2 text-muted">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>Pickup at any branch</span>
              </div>
              <div className="flex items-start gap-2 text-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>Home delivery available</span>
              </div>
            </div>
          </Panel>
        </aside>

        <div className="order-1 min-w-0 lg:order-2 lg:col-span-2">
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
