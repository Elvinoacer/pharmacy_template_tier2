import { getSessionUser } from "@/app/lib/auth";
import { getAdminAnalytics } from "@/app/lib/services/crm";
import { refillStatusMeta } from "@/app/lib/types";
import { AdminCard, AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { redirect } from "next/navigation";
import {
  Users,
  Pill,
  MessageSquare,
  Mail,
  Brain,
  Megaphone,
  Star,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "CRM Analytics" };

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const a = await getAdminAnalytics();
  const avgRating = a.feedbackAvg ? Number(a.feedbackAvg).toFixed(1) : "—";
  const totalRefills = a.refillByStatus.reduce((s, r) => s + r._count, 0);
  const pipelinePct = (status: string) => {
    if (totalRefills === 0) return 0;
    const found = a.refillByStatus.find((r) => r.status === status);
    return found ? Math.round((found._count / totalRefills) * 100) : 0;
  };

  return (
    <AdminShell
      user={user}
      title="Engagement analytics"
      subtitle="Live snapshot of customers, refills, and engagement across Aether Pharmacy."
      actions={
        <Link
          href="/admin/refills"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2 text-sm font-semibold text-[#042f2e] transition hover:brightness-110"
        >
          <Pill className="h-4 w-4" /> Refill queue
        </Link>
      }
    >
      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard
          label="Total customers"
          value={a.totalCustomers}
          hint={`+${a.newCustomers} new (30d)`}
          icon={Users}
          accent="ai"
        />
        <AdminCard
          label="Open refills"
          value={a.activeRefills}
          hint={`${a.completedRefills} collected · ${a.cancelledRefills} cancelled`}
          icon={Pill}
          accent="accent"
        />
        <AdminCard
          label="Messages (30d)"
          value={a.messagesSent}
          hint="Outbound notifications"
          icon={MessageSquare}
          accent="info"
        />
        <AdminCard
          label="Open enquiries"
          value={a.openEnquiries}
          hint="Needs response"
          icon={Mail}
          accent="danger"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard label="AI conversations" value={a.aiConversations} hint={`${a.aiEscalations} escalated`} icon={Brain} accent="ai" />
        <AdminCard label="Campaigns" value={a.campaigns} hint="Total created" icon={Megaphone} accent="accent" />
        <AdminCard label="Avg feedback" value={avgRating} hint={`${a.feedbackCount} ratings`} icon={Star} accent="accent" />
        <AdminCard label="Refill pipeline" value={totalRefills} hint="All statuses" icon={Activity} accent="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Refill pipeline (largest) */}
        <AdminPanel
          title="Refill pipeline"
          description="Distribution of all refill requests by status"
          className="lg:col-span-2"
          action={
            <Link href="/admin/refills" className="inline-flex items-center gap-1 text-xs font-semibold text-[#2dd4bf] hover:underline">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {a.refillByStatus.length === 0 ? (
            <AdminEmptyState icon={Pill} title="No refill data yet" description="Once customers submit refills, the pipeline will visualise here." />
          ) : (
            <div className="space-y-3">
              {[
                "submitted",
                "under_review",
                "approved",
                "preparing",
                "ready_for_pickup",
                "collected",
                "cancelled",
              ].map((status) => {
                const row = a.refillByStatus.find((r) => r.status === status);
                if (!row) return null;
                const meta = refillStatusMeta(status);
                const pct = pipelinePct(status);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <span className="text-xs font-medium text-[#ecfdf5]/70">{meta.label}</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] transition-all"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 shrink-0 text-right">
                      <span className="font-bold text-white">{row._count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>

        {/* Quick stats */}
        <AdminPanel title="Customer growth & retention" description="Last 30 days">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/[0.05] pb-2">
              <dt className="text-[#ecfdf5]/55">Active customer records</dt>
              <dd className="font-bold text-white">{a.totalCustomers}</dd>
            </div>
            <div className="flex justify-between border-b border-white/[0.05] pb-2">
              <dt className="text-[#ecfdf5]/55">New registrations (30d)</dt>
              <dd className="font-bold text-emerald-400">+{a.newCustomers}</dd>
            </div>
            <div className="flex justify-between border-b border-white/[0.05] pb-2">
              <dt className="text-[#ecfdf5]/55">Avg feedback rating</dt>
              <dd className="font-bold text-white">{avgRating} <span className="text-xs text-[#ecfdf5]/45">({a.feedbackCount})</span></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#ecfdf5]/55">Cancelled refills</dt>
              <dd className="font-bold text-rose-400">{a.cancelledRefills}</dd>
            </div>
          </dl>
        </AdminPanel>

        {/* AI assistant */}
        <AdminPanel title="AI assistant" description="Customer self-service usage">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">
                <Brain className="h-3 w-3" /> Conversations
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{a.aiConversations}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">
                <TrendingUp className="h-3 w-3" /> Escalations
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-400">{a.aiEscalations}</p>
            </div>
          </div>
          <Link
            href="/admin/ai"
            className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#2dd4bf] transition hover:bg-white/[0.08]"
          >
            View escalations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AdminPanel>

        {/* Campaigns */}
        <AdminPanel title="Campaigns" description="Marketing activity">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[#042f2e]">
              <Megaphone className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{a.campaigns}</p>
              <p className="text-xs text-[#ecfdf5]/55">Total campaigns created</p>
            </div>
          </div>
          <Link
            href="/admin/campaigns"
            className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#2dd4bf] transition hover:bg-white/[0.08]"
          >
            Manage campaigns <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AdminPanel>

        {/* Quick links */}
        <AdminPanel title="Quick actions" description="Jump to common tasks">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/customers" className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#ecfdf5]/80 transition hover:bg-white/[0.08] hover:text-white">
              <Users className="h-4 w-4" /> Customers
            </Link>
            <Link href="/admin/messages" className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#ecfdf5]/80 transition hover:bg-white/[0.08] hover:text-white">
              <MessageSquare className="h-4 w-4" /> Messages
            </Link>
            <Link href="/admin/feedback" className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#ecfdf5]/80 transition hover:bg-white/[0.08] hover:text-white">
              <Star className="h-4 w-4" /> Feedback
            </Link>
            <Link href="/admin/reminders" className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-[#ecfdf5]/80 transition hover:bg-white/[0.08] hover:text-white">
              <Clock className="h-4 w-4" /> Reminders
            </Link>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
