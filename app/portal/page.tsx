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
        <Link href="/portal/refills/new" className="btn-primary min-h-11">
          <Plus className="h-4 w-4" /> Request refill
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-[1280px] min-w-0">
      <PortalNextSteps readyForPickup={readyForPickup} />
      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&_.card-stat_p:first-child]:!text-sm [&_.card-stat_p:nth-child(3)]:!text-sm">
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
      <div className="grid min-w-0 gap-4 sm:gap-6 md:grid-cols-2 [&_.card-premium>div:first-child>div>p]:!text-sm">
        {/* Active prescriptions */}
        <Panel
          title="Active prescriptions"
          description="Refills available on your current Rx"
          action={
            <Link
              href="/portal/prescriptions"
              className="inline-flex min-h-11 items-center gap-1 py-2 text-sm font-semibold text-[var(--brand-deep)] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.prescriptions.length === 0 ? (
            <div className="[&_p]:!text-sm">
              <EmptyState
                icon={FileText}
                title="No prescriptions on file"
                description="Upload a prescription or ask your pharmacy to add one. You can follow its review here."
                action={<Link href="/prescription" className="btn-primary min-h-11 !py-2 text-sm">Find my medicines</Link>}
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {data.prescriptions.slice(0, 4).map((p) => (
                <li
                  key={p.id}
                  className="flex min-w-0 flex-col items-stretch gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] px-4 py-3 transition hover:border-[#0d6e5a]/30 hover:bg-[var(--brand-tint)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--foreground)]">{p.medicineName}</p>
                    <p className="mt-1 break-words text-sm text-[var(--muted)]">
                      {p.rxReference || "No Rx ref"} · {p.refillsRemaining ?? 0} refills left
                    </p>
                  </div>
                  <Link
                    href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 sm:w-auto sm:rounded-full"
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
              className="inline-flex min-h-11 items-center gap-1 py-2 text-sm font-semibold text-[var(--brand-deep)] hover:underline"
            >
              New request <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.refills.length === 0 ? (
            <div className="[&_p]:!text-sm">
              <EmptyState
                icon={Pill}
                title="No refill requests yet"
                description="Submit your first refill request and our pharmacists will get to work."
                action={
                  <Link href="/portal/refills/new" className="btn-primary min-h-11 !py-2 text-sm">
                    <Plus className="h-4 w-4" /> Request a refill
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {data.refills.slice(0, 5).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li
                    key={r.id}
                    className="flex min-w-0 flex-col items-start gap-3 rounded-xl border border-[var(--line)] px-4 py-3 transition hover:border-[#0d6e5a]/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[var(--foreground)]">{r.medicineName}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Clock className="h-3 w-3" />
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <Badge className={`${meta.color} !px-3 !py-1 !text-sm`}>{meta.label}</Badge>
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
              className="inline-flex min-h-11 items-center gap-1 py-2 text-sm font-semibold text-[var(--brand-deep)] hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.notifications.length === 0 ? (
            <div className="[&_p]:!text-sm">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="New refill updates and messages will land here."
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {data.notifications.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] px-4 py-3"
                >
                  <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-[var(--foreground)]">{n.title}</p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-[var(--muted)]">{n.body}</p>
                    <p className="mt-2 text-sm text-[var(--muted-2)]">
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
            <div className="[&_p]:!text-sm"><EmptyState icon={Activity} title="No activity yet" /></div>
          ) : (
            <ol className="relative space-y-4 pl-4">
              <span className="absolute left-2 top-1 bottom-1 w-px bg-[var(--line)]" />
              {data.timeline.slice(0, 8).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-2 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--brand)] ring-4 ring-[#f4f7f4]">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                  <div className="ml-4">
                    <p className="text-base font-semibold text-[var(--foreground)]">{e.title}</p>
                    {e.description && <p className="mt-1 break-words text-sm leading-relaxed text-[var(--muted)]">{e.description}</p>}
                    <p className="mt-1 text-sm text-[var(--muted-2)]">
                      {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      </div>
    </PortalShell>
  );
}
