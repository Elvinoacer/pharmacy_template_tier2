import { prisma } from "@/app/lib/db";
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
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export const metadata = { title: "Pharmacy workspace" };

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (user.activePharmacyId) {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: user.activePharmacyId }, select: { setupCompletedAt: true } });
    if (pharmacy && !pharmacy.setupCompletedAt) redirect("/admin/setup");
  }

  const premiumActive = user.activePharmacyId
    ? await hasPremiumPlan(user.activePharmacyId)
    : false;

  const [a, inv, discoverableMedicines, publishedServices] = await Promise.all([
    getAdminAnalytics(),
    getInventoryHealth({ expiryDays: 30, salesLookbackDays: 30 }),
    prisma.pharmacyInventory.count({ where: { active: true, publicListing: true, currentStock: { gt: 0 }, pharmacy: { status: "active", listed: true } } }),
    prisma.pharmacyService.count({ where: { active: true, pharmacy: { status: "active", listed: true } } }),
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
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Link href="/admin/refills" className="btn-admin justify-center">
            <Pill className="h-4 w-4" /> Refill queue
          </Link>
          <Link href="/admin/inventory" className="btn-admin justify-center">
            <Package className="h-4 w-4" /> Inventory
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="[&_.admin-task-card_p]:!text-sm [&_.admin-task-card>span:last-child]:!text-sm [&_.admin-task-grid]:!grid-cols-1 sm:[&_.admin-task-grid]:!grid-cols-2 lg:[&_.admin-task-grid]:!grid-cols-3">
          <AdminToday user={user} refills={a.activeRefills} enquiries={a.openEnquiries} escalations={a.aiEscalations} />
        </div>

        <section aria-label="Manage what customers discover" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["/admin/medications", `${discoverableMedicines} medicines discoverable`, "Publish medicines and keep stock and prices current. Your pharmacy must be active and listed."],
            ["/admin/refills", "Incoming medicine requests", "Review requests from prescription searches and update customers as you prepare their medicines."],
            ["/admin/services", `${publishedServices} services discoverable`, "Publish services, set prices and manage online booking availability."],
          ].map(([href, title, description]) => <Link key={href} href={href} className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"><h2 className="text-sm font-semibold admin-text">{title}</h2><p className="mt-2 text-sm leading-5 admin-muted">{description}</p></Link>)}
        </section>

        <section aria-labelledby="stock-priority-heading">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="admin-eyebrow mb-1">Operational priority</p>
              <h2 id="stock-priority-heading" className="text-base font-semibold admin-text sm:text-lg">Stock to check</h2>
            </div>
            <Link href="/admin/inventory" className="inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-accent-text hover:underline sm:w-auto sm:justify-start sm:bg-transparent">
              Open stock <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <Link href="/admin/inventory#low" className="block h-full">
              <AdminCard label="Low stock" value={inv.counts.lowStock} hint="At or below threshold" icon={AlertTriangle} accent={inv.counts.lowStock > 0 ? "danger" : "neutral"} />
            </Link>
            <Link href="/admin/inventory#out" className="block h-full">
              <AdminCard label="Out of stock" value={inv.counts.outOfStock} hint={`${inv.counts.totalActive} active medicines`} icon={PackageX} accent={inv.counts.outOfStock > 0 ? "danger" : "neutral"} />
            </Link>
            <Link href="/admin/inventory#expiry" className="block h-full">
              <AdminCard label="Expiring within 30 days" value={inv.counts.expiringLots} hint={`${inv.counts.expiredLots} expired lots`} icon={Clock} accent={inv.counts.expiredLots > 0 || inv.counts.expiringLots > 0 ? "danger" : "neutral"} />
            </Link>
            {premiumActive ? (
              <Link href="/admin/inventory#reorder" className="block h-full">
                <AdminCard label="Reorder now" value={inv.counts.reorder} hint="Based on sales and stock levels" icon={Truck} accent={inv.counts.reorder > 0 ? "accent" : "neutral"} />
              </Link>
            ) : (
              <Link href="/admin/billing" className="block h-full">
                <AdminCard label="Inventory intelligence" value="Premium" hint="Velocity-based reorder guidance" icon={Truck} accent="accent" />
              </Link>
            )}
          </div>
        </section>

        <details className="admin-dashboard-details">
          <summary className="flex min-h-11 flex-col justify-center">
            Performance at a glance
            <span className="!text-sm">Patients, communication, and refill activity</span>
          </summary>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <AdminCard label="Total customers" value={a.totalCustomers} hint={`+${a.newCustomers} new (30d)`} icon={Users} accent="ai" />
            <AdminCard label="Open refills" value={a.activeRefills} hint={`${a.completedRefills} collected · ${a.cancelledRefills} cancelled`} icon={Pill} accent="accent" />
            <AdminCard label="Messages (30d)" value={a.messagesSent} hint="Outbound notifications" icon={MessageSquare} accent="info" />
            <AdminCard label="Open enquiries" value={a.openEnquiries} hint="Needs response" icon={Mail} accent="danger" />
            <AdminCard label="AI conversations" value={a.aiConversations} hint={`${a.aiEscalations} escalated`} icon={Brain} accent="ai" />
            <AdminCard label="Campaigns" value={a.campaigns} hint="Total created" icon={Megaphone} accent="accent" />
            <AdminCard label="Avg feedback" value={avgRating} hint={`${a.feedbackCount} ratings`} icon={Star} accent="accent" />
            <AdminCard label="Refill pipeline" value={totalRefills} hint="All statuses" icon={Activity} accent="info" />
          </div>
        </details>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <AdminPanel
            title="Refill pipeline"
            description="Distribution of all refill requests by status"
            className="md:col-span-2 lg:col-span-2"
            action={
              <Link href="/admin/refills" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)] sm:w-auto sm:bg-transparent">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {a.refillByStatus.length === 0 ? (
              <AdminEmptyState icon={Pill} title="No refill data yet" description="Once customers submit refills, the pipeline will visualise here." />
            ) : (
              <div className="space-y-3">
                {["submitted", "under_review", "approved", "preparing", "ready_for_pickup", "collected", "cancelled"].map((status) => {
                  const row = a.refillByStatus.find((r) => r.status === status);
                  if (!row) return null;
                  const meta = refillStatusMeta(status);
                  const pct = pipelinePct(status);
                  return (
                    <div key={status} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
                      <span className="break-words text-sm font-medium admin-muted">{meta.label}</span>
                      <span className="text-sm font-bold admin-text">{row._count}</span>
                      <div className="admin-progress col-span-2">
                        <div className="admin-progress-bar transition-[width] duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="Customer growth & retention" description="Last 30 days">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] pb-2"><dt className="admin-muted">Active customer records</dt><dd className="font-bold admin-text">{a.totalCustomers}</dd></div>
              <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] pb-2"><dt className="admin-muted">New registrations (30d)</dt><dd className="font-bold text-emerald-600">+{a.newCustomers}</dd></div>
              <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] pb-2"><dt className="admin-muted">Avg feedback rating</dt><dd className="font-bold admin-text">{avgRating} <span className="text-sm admin-soft">({a.feedbackCount})</span></dd></div>
              <div className="flex justify-between gap-4"><dt className="admin-muted">Cancelled refills</dt><dd className="font-bold text-rose-500">{a.cancelledRefills}</dd></div>
            </dl>
          </AdminPanel>

          <AdminPanel title="AI assistant" description="Customer self-service usage">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--admin-inset)] p-3"><div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide admin-muted"><Brain className="h-3 w-3" /> Conversations</div><p className="mt-1 text-2xl font-bold admin-text">{a.aiConversations}</p></div>
              <div className="rounded-xl bg-[var(--admin-inset)] p-3"><div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide admin-muted"><TrendingUp className="h-3 w-3" /> Escalations</div><p className="mt-1 text-2xl font-bold text-amber-500">{a.aiEscalations}</p></div>
            </div>
            <Link href="/admin/ai" className="mt-3 flex min-h-11 items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-accent-text transition hover:bg-[var(--admin-inset-2)]">View escalations <ArrowRight className="h-3.5 w-3.5" /></Link>
          </AdminPanel>

          <AdminPanel title="Campaigns" description="Marketing activity">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 sm:h-14 sm:w-14"><Megaphone className="h-6 w-6 sm:h-7 sm:w-7" /></div><div><p className="text-2xl font-bold admin-text sm:text-3xl">{a.campaigns}</p><p className="text-sm admin-muted">Total campaigns created</p></div></div>
            <Link href="/admin/campaigns" className="mt-3 flex min-h-11 items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-accent-text transition hover:bg-[var(--admin-inset-2)]">Manage campaigns <ArrowRight className="h-3.5 w-3.5" /></Link>
          </AdminPanel>

          <AdminPanel title="Quick actions" description="Jump to common tasks">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/customers" className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm font-medium admin-text transition hover:bg-[var(--admin-inset-2)]"><Users className="h-4 w-4 shrink-0" /> Customers</Link>
              <Link href="/admin/messages" className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm font-medium admin-text transition hover:bg-[var(--admin-inset-2)]"><MessageSquare className="h-4 w-4 shrink-0" /> Messages</Link>
              <Link href="/admin/feedback" className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm font-medium admin-text transition hover:bg-[var(--admin-inset-2)]"><Star className="h-4 w-4 shrink-0" /> Feedback</Link>
              <Link href="/admin/reminders" className="flex min-h-12 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm font-medium admin-text transition hover:bg-[var(--admin-inset-2)]"><Clock className="h-4 w-4 shrink-0" /> Reminders</Link>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
