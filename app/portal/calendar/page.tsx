import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { getMedicationCalendarData } from "@/app/lib/services/medication-calendar";
import { MedicationCalendarView } from "@/app/components/portal/MedicationCalendarView";
import Link from "next/link";
import { Plus, RefreshCw, Pill } from "lucide-react";

export const metadata = { title: "Medication Calendar & Dosing Schedule" };

export default async function PortalMedicationCalendarPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const calendarData = await getMedicationCalendarData(user.customerId);
  if (!calendarData) {
    redirect("/portal/prescriptions");
  }

  return (
    <PortalShell
      user={user}
      title="Medication Calendar"
      subtitle="Visual daily schedule, adherence history, and refill milestones."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portal/sync"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#0d6e5a] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Med Sync</span>
          </Link>
          <Link
            href="/portal/prescriptions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <Pill className="h-3.5 w-3.5" />
            <span>Prescriptions</span>
          </Link>
        </div>
      }
    >
      <MedicationCalendarView initialData={calendarData} />
    </PortalShell>
  );
}
