import PortalNextSteps from "@/app/components/portal/PortalNextSteps";
import { formatDateTime, formatDate } from "@/app/lib/time";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { getCustomerDashboard } from "@/app/lib/services/crm";
import { refillStatusMeta } from "@/app/lib/types";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { StatCard, Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getTenant } from "@/app/lib/tenant";
import {
  FileText,
  Pill,
  Sparkles,
  CalendarClock,
  Plus,
  ArrowRight,
  Bell,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const metadata = { title: "My dashboard" };

export default async function PortalDashboardPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null }));
  const data = await getCustomerDashboard(user.customerId);
  const activeRefills = data.refills.filter(
    (r) => !["collected", "cancelled"].includes(r.status),
  ).length;
  const readyForPickup = data.refills.filter((r) => r.status === "ready_for_pickup").length;
  const firstName = data.profile?.fullName?.split(" ")[0] || "there";

  return (
    <PortalShell
      user={user}
      title={`Hello, ${firstName}`}
      subtitle="Here's a snapshot of your prescriptions, refills, and rewards."
      actions={
        <Link href={tenant.pharmacyId ? "/portal/refills/new" : "/portal/pharmacies"} className="btn-primary">
          <Plus className="h-4 w-4" /> {tenant.pharmacyId ? "Request refill" : "Choose a pharmacy"}
        </Link>
      }
    >
      <PortalNextSteps hasPharmacy={Boolean(tenant.pharmacyId)} readyForPickup={readyForPickup} />
      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active prescriptions"
          value={data.prescriptions.length}
          hint={data.prescriptions.filter((p) => p.status === "active").length + " active"}
          icon={FileText}
          accent="brand"
        />
        <StatCard
          label="Open refills"
          value={activeRefills}
          hint={readyForPickup > 0 ? `${readyForPickup} ready for pickup` : "None ready yet"}
          icon={Pill}
          accent="info"
        />
        <StatCard
          label="Loyalty points"
          value={data.loyalty?.points ?? 0}
          hint={data.loyalty ? `${data.loyalty.tier} tier` : "Sign up to earn"}
          icon={Sparkles}
          accent="accent"
        />
        <StatCard
          label="Upcoming reminders"
          value={data.reminders.length}
          hint={data.reminders[0]?.scheduledFor
            ? `Next: ${formatDate(data.reminders[0].scheduledFor)}`
            : "None scheduled"}
          icon={CalendarClock}
          accent="neutral"
        />
      </div>

      {/* Two-column main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active prescriptions */}
        <Panel
          title="Active prescriptions"
          description="Refills available on your current Rx"
          action={
            <Link
              href="/portal/prescriptions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.prescriptions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No prescriptions on file"
              description="Upload a prescription or ask your pharmacy to add one. You can follow its review here."
              action={<Link href={tenant.pharmacyId ? "/portal/prescriptions" : "/portal/pharmacies"} className="btn-primary !py-2 text-sm">{tenant.pharmacyId ? "Add a prescription" : "Choose a pharmacy"}</Link>}
            />
          ) : (
            <ul className="space-y-2.5">
              {data.prescriptions.slice(0, 4).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3ebe6] bg-[#fafbfa] px-3.5 py-3 transition hover:border-[#0d6e5a]/30 hover:bg-[#f0faf6]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0c1a14]">{p.medicineName}</p>
                    <p className="mt-0.5 text-xs text-[#5a6b62]">
                      {p.rxReference || "No Rx ref"} · {p.refillsRemaining ?? 0} refills left
                    </p>
                  </div>
                  <Link
                    href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
                  >
                    <Plus className="h-3 w-3" /> Refill
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent refill requests */}
        <Panel
          title="Recent refill requests"
          description="Your last 5 submitted requests"
          action={
            <Link
              href="/portal/refills/new"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a] hover:underline"
            >
              New request <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.refills.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No refill requests yet"
              description="Submit your first refill request and our pharmacists will get to work."
              action={
                <Link href="/portal/refills/new" className="btn-primary !py-2 text-sm">
                  <Plus className="h-4 w-4" /> Request a refill
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {data.refills.slice(0, 5).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ebe6] px-3.5 py-3 transition hover:border-[#0d6e5a]/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#0c1a14]">{r.medicineName}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5a6b62]">
                        <Clock className="h-3 w-3" />
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <Badge className={meta.color}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Notifications */}
        <Panel
          title="Notifications"
          description="Updates from your pharmacy team"
          action={
            <Link
              href="/portal/messages"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="You're all caught up"
              description="New refill updates and messages will land here."
            />
          ) : (
            <ul className="space-y-2.5">
              {data.notifications.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-[#e3ebe6] bg-[#fafbfa] px-3.5 py-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f4ef] text-[#0d6e5a]">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0c1a14]">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#5a6b62]">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Activity timeline */}
        <Panel
          title="Activity timeline"
          description="Everything that's happened on your account"
        >
          {data.timeline.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" />
          ) : (
            <ol className="relative space-y-4 pl-4">
              <span className="absolute left-1.5 top-1 bottom-1 w-px bg-[#e3ebe6]" />
              {data.timeline.slice(0, 8).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-2.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#0d6e5a] ring-4 ring-[#f4f7f4]">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-[#0c1a14]">{e.title}</p>
                    {e.description && <p className="text-xs text-[#5a6b62]">{e.description}</p>}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                      {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
