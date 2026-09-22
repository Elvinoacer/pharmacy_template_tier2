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
    // No active medication plan in context (e.g. no pharmacy chosen yet).
    // Explain instead of silently bouncing the user to another page.
    return (
      <PortalShell user={user} title="Medication Calendar">
        <div className="mx-auto w-full max-w-7xl min-w-0 rounded-3xl border border-dashed border-teal-900/20 bg-white/80 p-4 text-center sm:p-8 md:p-10">
          <Pill className="mx-auto h-8 w-8 text-[#0d6e5a]" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-[#0c1a14]">Nothing scheduled yet</h2>
          <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-[#5a6b62]">
            Your medication calendar fills in once a pharmacy you use has an active medication plan
            for you. Pick a pharmacy or check your prescriptions first.
          </p>
          <div className="mx-auto mt-6 flex w-full max-w-sm flex-col justify-center gap-2 sm:flex-row">
            <Link href="/portal/pharmacies" className="min-h-11 min-w-11 btn-primary btn-primary-sm w-full sm:w-auto">My pharmacies</Link>
            <Link href="/portal/prescriptions" className="min-h-11 min-w-11 btn-ghost btn-ghost-sm w-full sm:w-auto">View prescriptions</Link>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      user={user}
      title="Medication Calendar"
      subtitle="Visual daily schedule, adherence history, and refill milestones."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/portal/sync"
            className="min-h-11 min-w-11 inline-flex items-center gap-2 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-sm font-semibold text-[#0d6e5a] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Med Sync</span>
          </Link>
          <Link
            href="/portal/prescriptions"
            className="min-h-11 min-w-11 inline-flex items-center gap-2 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-sm font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <Pill className="h-3.5 w-3.5" />
            <span>Prescriptions</span>
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <MedicationCalendarView initialData={calendarData} />
      </div>
    </PortalShell>
  );
}
