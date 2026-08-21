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
    redirect("/portal/prescriptions");
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
