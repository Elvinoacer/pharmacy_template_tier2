import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { calculateRefillSyncPlan } from "@/app/lib/services/refill-sync";
import { RefillSyncView } from "@/app/components/portal/RefillSyncView";
import Link from "next/link";
import { Calendar, Pill, FileText } from "lucide-react";

export const metadata = { title: "Refill Synchronization (Med Sync)" };

export default async function PortalRefillSyncPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const plan = await calculateRefillSyncPlan(user.customerId);
  if (!plan) {
    // No syncable prescriptions in context (e.g. no pharmacy chosen yet).
    return (
      <PortalShell user={user} title="Refill Synchronization">
        <div className="rounded-3xl border border-dashed border-teal-900/20 bg-white/80 p-10 text-center">
          <Calendar className="mx-auto h-8 w-8 text-[#0d6e5a]" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-[#0c1a14]">No sync plan yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5a6b62]">
            Med sync aligns your recurring prescriptions to one pickup date. Once a pharmacy you use
            has active recurring prescriptions for you, your plan appears here.
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
      title="Refill Synchronization"
      subtitle="Align all your recurring chronic medications to a single monthly pickup or delivery date."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portal/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#0d6e5a] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Med Calendar</span>
          </Link>
          <Link
            href="/portal/prescriptions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] shadow-2xs transition"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Prescriptions</span>
          </Link>
        </div>
      }
    >
      <RefillSyncView initialPlan={plan} />
    </PortalShell>
  );
}
