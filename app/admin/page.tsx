import { getSessionUser } from "@/app/lib/auth";
import { getAdminAnalytics } from "@/app/lib/services/crm";
import { getInventoryHealth } from "@/app/lib/services/stock";
import { refillStatusMeta } from "@/app/lib/types";
import { AdminCard, AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminToday } from "@/app/components/admin/AdminToday";
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
  Package,
  AlertTriangle,
  PackageX,
  Truck,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Pharmacy workspace" };

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [a, inv] = await Promise.all([
    getAdminAnalytics(),
    getInventoryHealth({ expiryDays: 30, salesLookbackDays: 30 }),
  ]);
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
      title="Today’s workspace"
      subtitle="Start with open requests, patient follow-ups, and stock that needs attention."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/inventory" className="btn-admin">
            <Package className="h-4 w-4" /> Inventory
          </Link>
          <Link href="/admin/refills" className="btn-admin">
            <Pill className="h-4 w-4" /> Refill queue
          </Link>
        </div>
      }
    >
      <AdminToday refills={a.activeRefills} enquiries={a.openEnquiries} escalations={a.aiEscalations} />
      <h2 className="mb-4 text-lg font-semibold admin-text">Stock to check</h2>
      {/* Inventory health strip */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/inventory#low" className="block">
          <AdminCard
            label="Low stock"
            value={inv.counts.lowStock}
            hint="At or below threshold"
            icon={AlertTriangle}
            accent={inv.counts.lowStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="/admin/inventory#out" className="block">
          <AdminCard
            label="Out of stock"
            value={inv.counts.outOfStock}
            hint={`${inv.counts.totalActive} active medicines`}
            icon={PackageX}
            accent={inv.counts.outOfStock > 0 ? "danger" : "neutral"}
          />
        </Link>
        <Link href="/admin/inventory#expiry" className="block">
          <AdminCard
            label="Expiring within 30 days"
            value={inv.counts.expiringLots}
            hint={`${inv.counts.expiredLots} expired lots`}
            icon={Clock}
            accent={
              inv.counts.expiredLots > 0 || inv.counts.expiringLots > 0 ? "danger" : "neutral"
            }
          />
        </Link>
        <Link href="/admin/inventory#reorder" className="block">
          <AdminCard
            label="Reorder now"
            value={inv.counts.reorder}
            hint="Based on sales and stock levels"
            icon={Truck}
            accent={inv.counts.reorder > 0 ? "accent" : "neutral"}
          />
        </Link>
      </div>

      <details className="admin-dashboard-details">
      <summary>Performance at a glance <span>Patients, communication, and refill activity</span></summary>
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

      </details>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Refill pipeline (largest) */}
        <AdminPanel
          title="Refill pipeline"
          description="Distribution of all refill requests by status"
          className="lg:col-span-2"
          action={
            <Link href="/admin/refills" className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline">
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
                      <span className="text-xs font-medium admin-muted">{meta.label}</span>
                    </div>
                    <div className="flex-1">
                      <div className="admin-progress">
                        <div
                          className="admin-progress-bar transition-all"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 shrink-0 text-right">
                      <span className="font-bold admin-text">{row._count}</span>
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
            <div className="flex justify-between border-b border-[var(--admin-border)] pb-2">
              <dt className="admin-muted">Active customer records</dt>
              <dd className="font-bold admin-text">{a.totalCustomers}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--admin-border)] pb-2">
              <dt className="admin-muted">New registrations (30d)</dt>
              <dd className="font-bold text-emerald-600">+{a.newCustomers}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--admin-border)] pb-2">
              <dt className="admin-muted">Avg feedback rating</dt>
              <dd className="font-bold admin-text">{avgRating} <span className="text-xs admin-soft">({a.feedbackCount})</span></dd>
            </div>
            <div className="flex justify-between">
              <dt className="admin-muted">Cancelled refills</dt>
              <dd className="font-bold text-rose-500">{a.cancelledRefills}</dd>
            </div>
          </dl>
        </AdminPanel>

        {/* AI assistant */}
        <AdminPanel title="AI assistant" description="Customer self-service usage">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide admin-muted">
                <Brain className="h-3 w-3" /> Conversations
              </div>
              <p className="mt-1 text-2xl font-bold admin-text">{a.aiConversations}</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide admin-muted">
                <TrendingUp className="h-3 w-3" /> Escalations
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-500">{a.aiEscalations}</p>
            </div>
          </div>
          <Link
            href="/admin/ai"
            className="mt-3 flex items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-xs font-medium admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
          >
            View escalations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AdminPanel>

        {/* Campaigns */}
        <AdminPanel title="Campaigns" description="Marketing activity">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-[var(--admin-btn-fg)]">
              <Megaphone className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold admin-text">{a.campaigns}</p>
              <p className="text-xs admin-muted">Total campaigns created</p>
            </div>
          </div>
          <Link
            href="/admin/campaigns"
            className="mt-3 flex items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-xs font-medium admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
          >
            Manage campaigns <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AdminPanel>

        {/* Quick links */}
        <AdminPanel title="Quick actions" description="Jump to common tasks">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/admin/customers" className="flex items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-xs font-medium admin-text transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]">
              <Users className="h-4 w-4" /> Customers
            </Link>
            <Link href="/admin/messages" className="flex items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-xs font-medium admin-text transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]">
              <MessageSquare className="h-4 w-4" /> Messages
            </Link>
            <Link href="/admin/feedback" className="flex items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-xs font-medium admin-text transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]">
              <Star className="h-4 w-4" /> Feedback
            </Link>
            <Link href="/admin/reminders" className="flex items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 text-xs font-medium admin-text transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]">
              <Clock className="h-4 w-4" /> Reminders
            </Link>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
