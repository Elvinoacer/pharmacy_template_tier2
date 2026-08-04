import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { CaregiverRefillForm } from "@/app/components/caregiver/CaregiverRefillForm";
import { requireCanRequestRefills } from "@/app/lib/services/caregiver-permissions";
import { Info, Clock, Truck, Store } from "lucide-react";

export const metadata = { title: "Request refill" };

export default async function CaregiverNewRefillPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; prescriptionId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/refills/new");
  const sp = await searchParams;
  if (!sp.customerId) redirect("/caregiver/refills");

  // Verify the caregiver has refill permission for this patient.
  let link;
  try {
    link = await requireCanRequestRefills(user, sp.customerId);
  } catch {
    notFound();
  }

  const patient = await prisma.customerProfile.findUnique({
    where: { id: sp.customerId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      user: { select: { email: true } },
      prescriptions: {
        where: { status: "active" },
        orderBy: { medicineName: "asc" },
      },
    },
  });
  if (!patient) notFound();

  return (
    <CaregiverShell
      user={user}
      title={`Request refill for ${patient.fullName}`}
      subtitle="A pharmacist will review every request before preparing the medication."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <div className="card-premium p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <Info className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">Submitting on behalf</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  This refill request will be attributed to <strong>{patient.fullName}</strong> and tagged as submitted by you ({link.caregiverName}).
                </p>
              </div>
            </div>
          </div>
          <div className="card-premium p-4">
            <p className="mb-3 text-sm font-semibold text-[#0c1a14]">What happens next</p>
            <ol className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[9px] font-bold text-white">1</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Submitted</p>
                  <p className="text-[#5a6b62]">Request enters the pharmacist queue</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[9px] font-bold text-white">2</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Under review</p>
                  <p className="text-[#5a6b62]">Pharmacist verifies the prescription</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[9px] font-bold text-white">3</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Preparing</p>
                  <p className="text-[#5a6b62]">Medication is being prepared</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-[9px] font-bold text-white">4</span>
                <div>
                  <p className="font-medium text-[#0c1a14]">Ready for pickup</p>
                  <p className="text-[#5a6b62]">Patient/caregiver notified automatically</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="card-premium p-4">
            <div className="space-y-2 text-xs">
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
          </div>
        </aside>

        <div className="lg:col-span-2">
          <div className="card-premium p-5">
            <p className="mb-1 text-sm font-semibold text-[#0c1a14]">Refill details</p>
            <p className="mb-4 text-xs text-[#5a6b62]">
              Select a prescription on file — medicine details are locked to the patient's record.
            </p>
            <CaregiverRefillForm
              customerId={patient.id}
              customerName={patient.fullName}
              prescriptions={patient.prescriptions.map((p) => ({
                id: p.id,
                medicineName: p.medicineName,
                dosage: p.dosage,
                rxReference: p.rxReference,
                refillsRemaining: p.refillsRemaining,
              }))}
            />
          </div>
        </div>
      </div>
    </CaregiverShell>
  );
}
