import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer } from "@/app/lib/services/adherence";
import { formatDate } from "@/app/lib/time";
import { User, ArrowRight, Activity, Pill, Bell } from "lucide-react";

export const metadata = { title: "My patients" };

export default async function CaregiverPatientsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/patients");

  const links = await getActiveCaregiverLinks(user.id);

  if (links.length === 0) {
    return (
      <CaregiverShell user={user} title="My patients" subtitle="Patients you are authorised to support.">
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-5 text-center sm:p-8">
          <User className="mx-auto h-10 w-10 text-[#8a9a92]" />
          <p className="mt-3 font-semibold text-[#0c1a14]">No linked patients yet</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Accept a caregiver invitation link from a patient to get started.
          </p>
        </div>
      </CaregiverShell>
    );
  }

  // Fetch summary data per patient.
  const patients = await Promise.all(
    links.map(async (link) => {
      const [prescriptions, refills, stats] = await Promise.all([
        prisma.prescription.count({
          where: { customerId: link.customerId, status: "active" },
        }),
        prisma.refillRequest.count({
          where: {
            customerId: link.customerId,
            status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] },
          },
        }),
        getAdherenceStatsForCustomer(link.customerId, 14),
      ]);
      return { link, prescriptionCount: prescriptions, openRefillCount: refills, stats };
    }),
  );

  return (
    <CaregiverShell
      user={user}
      title="My patients"
      subtitle="Patients you are authorised to support. Click a patient to view their medication schedule and adherence."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {patients.map(({ link, prescriptionCount, openRefillCount, stats }) => (
          <Link
            key={link.id}
            href={`/caregiver/patients/${link.customerId}`}
            className="card-premium min-h-11 min-w-0 p-4 transition sm:p-5 lg:p-6 hover:border-[#0d6e5a]/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-bold lg:text-lg text-[#0c1a14]">{link.customer.fullName}</p>
                <p className="text-sm text-[#5a6b62]">
                  {link.relationship || "Caregiver"}
                  {link.canRequestRefills ? " · Refills ✓" : ""}
                  {link.canLogAdherence ? " · Adherence ✓" : ""}
                  {link.canReceivePickupNotifications ? " · Pickup alerts ✓" : ""}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#0d6e5a]" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-[#f4f7f4] px-3 py-3 text-center">
                <Pill className="mx-auto h-3.5 w-3.5 text-[#0d6e5a]" />
                <p className="mt-1 text-sm font-bold text-[#0c1a14]">{prescriptionCount}</p>
                <p className="text-sm text-[#5a6b62]">active meds</p>
              </div>
              <div className="rounded-xl bg-[#f4f7f4] px-3 py-3 text-center">
                <Bell className="mx-auto h-3.5 w-3.5 text-[#0d6e5a]" />
                <p className="mt-1 text-sm font-bold text-[#0c1a14]">{openRefillCount}</p>
                <p className="text-sm text-[#5a6b62]">open refills</p>
              </div>
              <div className="rounded-xl bg-[#f4f7f4] px-3 py-3 text-center">
                <Activity className="mx-auto h-3.5 w-3.5 text-[#0d6e5a]" />
                <p className="mt-1 text-sm font-bold text-[#0c1a14]">{stats.adherenceRate}%</p>
                <p className="text-sm text-[#5a6b62]">14-day adherence</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </CaregiverShell>
  );
}
