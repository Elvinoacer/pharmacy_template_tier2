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
        <div className="rounded-3xl border border-dashed border-teal-900/20 bg-white/80 p-10 text-center">
          <Pill className="mx-auto h-8 w-8 text-[#0d6e5a]" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-[#0c1a14]">Nothing scheduled yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5a6b62]">
            Your medication calendar fills in once a pharmacy you use has an active medication plan
            for you. Pick a pharmacy or check your prescriptions first.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/portal/pharmacies" className="btn-primary btn-primary-sm">My pharmacies</Link>
            <Link href="/portal/prescriptions" className="btn-ghost btn-ghost-sm">View prescriptions</Link>
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
