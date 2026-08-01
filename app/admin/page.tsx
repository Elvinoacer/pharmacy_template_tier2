import { getSessionUser } from "@/app/lib/auth";
import { getAdminAnalytics } from "@/app/lib/services/crm";
import { refillStatusMeta } from "@/app/lib/types";
import AdminShell, { AdminCard, AdminPanel } from "@/app/components/admin/AdminShell";
import { redirect } from "next/navigation";

export const metadata = { title: "CRM Analytics" };

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const a = await getAdminAnalytics();

  return (
    <AdminShell user={user} title="Engagement analytics">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard label="Total customers" value={a.totalCustomers} hint={`${a.newCustomers} new (30d)`} />
        <AdminCard label="Open refills" value={a.activeRefills} hint={`${a.completedRefills} collected`} />
        <AdminCard label="Messages (30d)" value={a.messagesSent} />
        <AdminCard label="Open enquiries" value={a.openEnquiries} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Customer growth & retention">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-teal-100/60">Active customer records</dt>
              <dd className="font-semibold">{a.totalCustomers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-teal-100/60">New registrations (30 days)</dt>
              <dd className="font-semibold">{a.newCustomers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-teal-100/60">Avg feedback rating</dt>
              <dd className="font-semibold">
                {a.feedbackAvg ? Number(a.feedbackAvg).toFixed(1) : "—"} ({a.feedbackCount})
              </dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel title="Refill pipeline">
          <ul className="space-y-2">
            {a.refillByStatus.map((row) => {
              const meta = refillStatusMeta(row.status);
              return (
                <li key={row.status} className="flex items-center justify-between text-sm">
                  <span className="text-teal-100/70">{meta.label}</span>
                  <span className="font-semibold">{row._count}</span>
                </li>
              );
            })}
            {a.refillByStatus.length === 0 && (
              <li className="text-sm text-teal-100/50">No refill data yet.</li>
            )}
          </ul>
          <p className="mt-4 text-xs text-teal-100/40">
            Cancelled: {a.cancelledRefills} · Collected: {a.completedRefills}
          </p>
        </AdminPanel>

        <AdminPanel title="AI assistant">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-teal-100/60">Conversations</dt>
              <dd className="font-semibold">{a.aiConversations}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-teal-100/60">Escalations</dt>
              <dd className="font-semibold">{a.aiEscalations}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel title="Campaigns">
          <p className="text-3xl font-semibold">{a.campaigns}</p>
          <p className="mt-1 text-sm text-teal-100/50">Total campaigns created</p>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
