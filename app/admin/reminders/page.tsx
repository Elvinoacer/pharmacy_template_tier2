import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateReminderAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import ReminderForm from "@/app/components/admin/ReminderForm";
import { ProcessRemindersButton } from "@/app/components/admin/ProcessRemindersButton";
import { formatDateTime } from "@/app/lib/time";
import {
  CalendarClock,
  Zap,
  Mail,
  Phone,
  MessageCircle,
  Bell,
  Pill,
  Truck,
  HeartPulse,
  Cake,
  Type,
  Sparkles,
} from "lucide-react";

export const metadata = { title: "Reminders" };

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  refill: Pill,
  pickup: Truck,
  follow_up: HeartPulse,
  wellness: HeartPulse,
  birthday: Cake,
  medication_dose: Pill,
  custom: Type,
};

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  in_app: Bell,
  push: Bell,
};

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-amber-500/15 text-amber-700",
  sent: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-slate-500/15 text-slate-600",
  failed: "bg-rose-500/15 text-rose-600",
};

export default async function AdminRemindersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const reminders = await prisma.reminder.findMany({
    include: { customer: { select: { fullName: true } } },
    orderBy: { scheduledFor: "desc" },
    take: 50,
  });

  const stats = {
    scheduled: reminders.filter((r) => r.status === "scheduled").length,
    sent: reminders.filter((r) => r.status === "sent").length,
    failed: reminders.filter((r) => r.status === "failed").length,
  };

  return (
    <AdminShell
      user={user}
      title="Patient reminders"
      subtitle="Schedule refill, collection, and wellness reminders, then track their delivery."
      actions={<ProcessRemindersButton />}
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.scheduled}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Sent</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.sent}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Failed</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stats.failed}</p>
        </div>
      </div>

      {/* Honest automation status — only claim what the code actually does */}
      <AdminPanel
        title="How reminders work"
        description="Scheduled reminders are checked every five minutes."
        className="mb-6"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <Zap className="h-2.5 w-2.5" /> Live
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <CalendarClock className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Due scheduled reminders</p>
            <p className="mt-1 text-xs admin-soft">
              Sends due reminders to patients who have agreed to receive them.
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Sparkles className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Scheduled campaigns</p>
            <p className="mt-1 text-xs admin-soft">
              Starts scheduled campaigns when they are due, respecting each patient’s marketing preferences.
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Mail className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Scheduled staff messages</p>
            <p className="mt-1 text-xs admin-soft">
              Sends staff messages at their scheduled time.
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <HeartPulse className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Low adherence staff alerts</p>
            <p className="mt-1 text-xs admin-soft">
              Alerts staff when adherence falls below 70% over 14 days. Each prescription is flagged at most once a week.
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Cake className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Birthday greeting + points</p>
            <p className="mt-1 text-xs admin-soft">
              Birthday messages and rewards are managed by the loyalty programme.
            </p>
            <span className="mt-2 inline-block rounded-full bg-blue-500/10 px-1.5 py-0.5 text-xs font-semibold text-blue-700">Loyalty programme</span>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-inset)]/50 p-3 opacity-70">
            <Pill className="h-4 w-4 admin-soft" />
            <p className="mt-2 text-sm font-semibold admin-muted">Auto refill / pickup / promo</p>
            <p className="mt-1 text-xs admin-soft">
              These reminders need to be scheduled using the form below.
            </p>
            <span className="mt-2 inline-block rounded-full bg-slate-500/10 px-1.5 py-0.5 text-xs font-semibold text-slate-500">Not automated</span>
          </div>
        </div>
        <p className="mt-3 text-xs admin-soft">
          Scheduled reminders are processed every five minutes.
          Use <strong>Process due now</strong> to run the same jobs immediately.
        </p>
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Schedule / send reminder" description="Pick a customer and channel">
          <ReminderForm action={adminCreateReminderAction} />
        </AdminPanel>

        <AdminPanel
          title="Scheduled & sent"
          description={`${reminders.length} reminders`}
        >
          {reminders.length === 0 ? (
            <AdminEmptyState
              icon={CalendarClock}
              title="No reminders yet"
              description="Schedule your first reminder using the form on the left."
            />
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => {
                const TypeIcon = TYPE_ICON[r.type] || Type;
                const ChannelIcon = CHANNEL_ICON[r.channel] || Bell;
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] admin-accent-text">
                          <TypeIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold admin-text">{r.title}</p>
                          <p className="text-xs admin-muted">{r.customer.fullName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs admin-soft">
                            <span className="inline-flex items-center gap-0.5 capitalize">
                              <ChannelIcon className="h-2.5 w-2.5" /> {r.channel}
                            </span>
                            <span>·</span>
                            <span className="capitalize">{r.type.replace("_", " ")}</span>
                            <span>·</span>
                            <span>{formatDateTime(r.scheduledFor)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLOR[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
