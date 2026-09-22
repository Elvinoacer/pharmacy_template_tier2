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
        <section aria-label="Adherence priorities" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminCard label="Follow-ups pending" value={outreachQueue.length} hint="Needs staff outreach" icon={Activity} accent={outreachQueue.length > 0 ? "danger" : "neutral"} />
          <AdminCard label="Med Sync patients" value={enrollments.length} hint={`${candidates.length} possible enrollments`} icon={RefreshCw} accent="info" />
          <AdminCard label="Chronic patients" value={chronicData.summary.totalChronicPatients} hint="Maintenance therapy" icon={HeartPulse} accent="ai" />
          <AdminCard label="Lapsed refills" value={lapsedPatients.length} hint="7+ day refill gap" icon={ShieldAlert} accent={lapsedPatients.length > 0 ? "danger" : "neutral"} />
        </section>

        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-accent-soft)] px-4 py-3 text-sm leading-5 admin-muted">
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
          .adherence-ux { min-width: 0; }
          .adherence-ux .admin-table-region {
            max-width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: contain;
            scrollbar-gutter: stable;
          }
          .adherence-ux .admin-table-region table { min-width: 860px; }
          .adherence-ux .admin-table-region th:first-child,
          .adherence-ux .admin-table-region td:first-child {
            position: sticky;
            left: 0;
            z-index: 1;
            background: var(--admin-card);
          }
          .adherence-ux .admin-table-region thead th:first-child { z-index: 2; }
          .adherence-ux button,
          .adherence-ux input:not([type="hidden"]),
          .adherence-ux select,
          .adherence-ux textarea,
          .adherence-ux a[href^="tel:"],
          .adherence-ux a[href^="https://wa.me/"] { min-height: 44px; }
          .adherence-ux .text-xs {
            font-size: 14px !important;
            line-height: 20px !important;
          }
          .adherence-ux .fixed.inset-0 {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          .adherence-ux .fixed.inset-0 > div {
            width: 100%;
            max-height: 94dvh !important;
            border-radius: 24px 24px 0 0 !important;
            padding: 16px !important;
            padding-bottom: calc(16px + env(safe-area-inset-bottom)) !important;
          }
          .adherence-ux .grid.grid-cols-6 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .adherence-ux [class~="p-5"] { padding: 16px !important; }
          html[data-theme="dark"] .adherence-ux [class~="bg-rose-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-amber-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-blue-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-slate-100"],
          html[data-theme="dark"] .adherence-ux [class~="bg-emerald-50"],
          html[data-theme="dark"] .adherence-ux [class~="bg-emerald-100"] { background: var(--admin-inset) !important; }
          html[data-theme="dark"] .adherence-ux [class~="text-rose-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-rose-700"] { color: #fb7185 !important; }
          html[data-theme="dark"] .adherence-ux [class~="text-amber-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-amber-600"] { color: #fbbf24 !important; }
          html[data-theme="dark"] .adherence-ux [class~="text-blue-800"] { color: #7dd3fc !important; }
          html[data-theme="dark"] .adherence-ux [class~="text-slate-700"] { color: var(--admin-text-muted) !important; }
          html[data-theme="dark"] .adherence-ux [class~="text-emerald-800"],
          html[data-theme="dark"] .adherence-ux [class~="text-emerald-700"],
          html[data-theme="dark"] .adherence-ux [class~="text-teal-700"] { color: #5eead4 !important; }
          html[data-theme="dark"] .adherence-ux tbody { border-color: var(--admin-border) !important; }
          @media (min-width: 640px) {
            .adherence-ux .fixed.inset-0 {
              align-items: center !important;
              padding: 16px !important;
            }
            .adherence-ux .fixed.inset-0 > div {
              max-height: 90vh !important;
              border-radius: 24px !important;
              padding: 24px !important;
            }
            .adherence-ux .grid.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
            .adherence-ux [class~="p-5"] { padding: 24px !important; }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}
