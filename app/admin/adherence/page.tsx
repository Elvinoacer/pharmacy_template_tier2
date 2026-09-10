import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminCard } from "@/app/components/admin/AdminUI";
import { getPendingFollowUpOutreach, getFollowUpHistory } from "@/app/lib/services/adherence-outreach";
import { getRefillSyncCandidates, getRefillSyncEnrollments } from "@/app/lib/services/refill-sync";
import { getChronicCareDashboardData } from "@/app/lib/services/chronic-care";
import { getMissingRefillsPatients } from "@/app/lib/services/refills";
import { AdminAdherenceCommandCenter } from "@/app/components/admin/AdminAdherenceCommandCenter";
import { Activity, HeartPulse, RefreshCw, ShieldAlert } from "lucide-react";

export const metadata = { title: "Adherence & Chronic Care Command Center" };

export default async function AdminAdherencePage() {
  const user = await getSessionUser();
  if (!user || user.role === "customer" || user.role === "caregiver") {
    redirect("/login");
  }

  const [
    outreachQueue,
    outreachHistory,
    candidates,
    enrollments,
    chronicData,
    lapsedPatients,
  ] = await Promise.all([
    getPendingFollowUpOutreach(),
    getFollowUpHistory({ limit: 30 }),
    getRefillSyncCandidates(),
    getRefillSyncEnrollments(),
    getChronicCareDashboardData(),
    getMissingRefillsPatients({ minGapDays: 7 }),
  ]);

  return (
    <AdminShell
      user={user}
      title="Adherence & follow-up"
      subtitle="Work the highest-risk follow-ups first, then manage Med Sync and chronic-care continuity."
    >
      <div className="adherence-ux space-y-4 sm:space-y-6">
        <section aria-label="Adherence priorities" className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <AdminCard label="Follow-ups pending" value={outreachQueue.length} hint="Needs staff outreach" icon={Activity} accent={outreachQueue.length > 0 ? "danger" : "neutral"} />
          <AdminCard label="Med Sync patients" value={enrollments.length} hint={`${candidates.length} possible enrollments`} icon={RefreshCw} accent="info" />
          <AdminCard label="Chronic patients" value={chronicData.summary.totalChronicPatients} hint="Maintenance therapy" icon={HeartPulse} accent="ai" />
          <AdminCard label="Lapsed refills" value={lapsedPatients.length} hint="7+ day refill gap" icon={ShieldAlert} accent={lapsedPatients.length > 0 ? "danger" : "neutral"} />
        </section>

        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-3.5 py-3 text-xs leading-5 admin-muted sm:px-4">
          <strong className="admin-text">Mobile workflow:</strong> use the tabs as a task switcher. Dense clinical tables stay horizontally scrollable rather than squeezing critical fields into unreadable columns.
        </div>

        <AdminAdherenceCommandCenter
          initialOutreachQueue={outreachQueue}
          initialOutreachHistory={outreachHistory}
          initialCandidates={candidates}
          initialEnrollments={enrollments}
          initialChronicData={chronicData}
          initialLapsedPatients={lapsedPatients}
        />

        <style>{`
          .adherence-ux .admin-table-region {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
            scrollbar-gutter: stable;
          }
          .adherence-ux .admin-table-region table {
            min-width: 860px;
          }
          .adherence-ux a[href^="tel:"],
          .adherence-ux a[href^="https://wa.me/"] {
            min-height: 44px;
          }
          @media (max-width: 639px) {
            .adherence-ux .admin-table-region {
              margin-inline: -4px;
              padding-bottom: 4px;
            }
            .adherence-ux [class*="rounded-3xl"] {
              border-radius: 18px;
            }
            .adherence-ux [class*="p-5"],
            .adherence-ux [class*="sm:p-6"] {
              max-width: 100%;
            }
          }
          html[data-theme="dark"] .adherence-ux [class~="bg-rose-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-amber-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-blue-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-slate-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-emerald-50"],
          html[data-theme="dark"] .adherence-ux [class~="bg-emerald-100"] {
            background: var(--admin-inset) !important;
          }
          html[data-theme="dark"] .adherence-ux [class~="text-rose-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-rose-700"] {
            color: #fb7185 !important;
          }
          html[data-theme="dark"] .adherence-ux [class~="text-amber-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-amber-600"] {
            color: #fbbf24 !important;
          }
          html[data-theme="dark"] .adherence-ux [class~="text-blue-800"] {
            color: #7dd3fc !important;
          }
          html[data-theme="dark"] .adherence-ux [class~="text-slate-700"] {
            color: var(--admin-text-muted) !important;
          }
          html[data-theme="dark"] .adherence-ux [class~="text-emerald-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-emerald-700"],
          html[data-theme="dark"] .adherence-ux [class~="text-teal-700"] {
            color: #5eead4 !important;
          }
          html[data-theme="dark"] .adherence-ux tbody {
            border-color: var(--admin-border) !important;
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
