import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { calculateRefillSyncPlan } from "@/app/lib/services/refill-sync";
import { RefillSyncView } from "@/app/components/portal/RefillSyncView";
import Link from "next/link";
import { Calendar, FileText } from "lucide-react";

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
        <div className="mx-auto w-full max-w-7xl min-w-0 rounded-3xl border border-dashed border-[var(--line-2)] bg-card p-4 text-center sm:p-8 md:p-10">
          <Calendar className="mx-auto h-8 w-8 text-brand" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No sync plan yet</h2>
          <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-muted">
            Med sync aligns your recurring prescriptions to one pickup date. Once a pharmacy you use
            has active recurring prescriptions for you, your plan appears here.
          </p>
          <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
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
      title="Refill Synchronization"
      subtitle="Align all your recurring chronic medications to a single monthly pickup or delivery date."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/portal/calendar"
            className="min-w-11 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-card px-3 py-2 text-sm font-semibold text-brand shadow-2xs transition hover:bg-brand-tint sm:w-auto"
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Med Calendar</span>
          </Link>
          <Link
            href="/portal/prescriptions"
            className="min-w-11 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-card px-3 py-2 text-sm font-semibold text-muted shadow-2xs transition hover:bg-brand-tint hover:text-brand sm:w-auto"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>Prescriptions</span>
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <RefillSyncView initialPlan={plan} />
      </div>
    </PortalShell>
  );
}
