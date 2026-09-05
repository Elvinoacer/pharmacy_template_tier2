import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { getPendingFollowUpOutreach, getFollowUpHistory } from "@/app/lib/services/adherence-outreach";
import { getRefillSyncCandidates, getRefillSyncEnrollments } from "@/app/lib/services/refill-sync";
import { getChronicCareDashboardData } from "@/app/lib/services/chronic-care";
import { getMissingRefillsPatients } from "@/app/lib/services/refills";
import { AdminAdherenceCommandCenter } from "@/app/components/admin/AdminAdherenceCommandCenter";

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
      subtitle={`${outreachQueue.length} clinical follow-ups pending · ${enrollments.length} Med Sync patients · ${chronicData.summary.totalChronicPatients} chronic maintenance patients`}
    >
      <AdminAdherenceCommandCenter
        initialOutreachQueue={outreachQueue}
        initialOutreachHistory={outreachHistory}
        initialCandidates={candidates}
        initialEnrollments={enrollments}
        initialChronicData={chronicData}
        initialLapsedPatients={lapsedPatients}
      />
    </AdminShell>
  );
}
