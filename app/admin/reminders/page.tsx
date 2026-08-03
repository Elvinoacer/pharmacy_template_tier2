import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateReminderAction, adminProcessRemindersAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PendingSubmitButton } from "@/app/components/PendingSubmitButton";
import ReminderForm from "@/app/components/admin/ReminderForm";
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
      title="Reminder engine"
      subtitle="Schedule and dispatch refill, pickup, and wellness reminders"
      actions={
        <form action={adminProcessRemindersAction}>
          <PendingSubmitButton
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-sm font-semibold text-[#422006] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
            pendingChildren={
              <>
                <span className="typing-dot" /> Processing…
              </>
            }
          >
            <Zap className="h-4 w-4" /> Process due now
          </PendingSubmitButton>
        </form>
      }
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.scheduled}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Sent</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.sent}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Failed</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stats.failed}</p>
        </div>
      </div>

      {/* AI auto-reminders banner */}
      <AdminPanel
        title="Automated reminders"
        description="Triggered by cron jobs — no manual scheduling needed"
        className="mb-6"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf]/20 to-[#0d6e5a]/20 px-2 py-0.5 text-[10px] font-semibold admin-accent-text">
            <Sparkles className="h-2.5 w-2.5" /> AI-assisted
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Pill className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Refill due in 3 days</p>
            <p className="mt-1 text-[10px] admin-soft">
              For every active prescription with nextRefillDue in 3 days, send a refill reminder.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Truck className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Pickup ready for 24h</p>
            <p className="mt-1 text-[10px] admin-soft">
              For refills in ready_for_pickup status for over 24h, send a pickup reminder.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <HeartPulse className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Adherence follow-up</p>
            <p className="mt-1 text-[10px] admin-soft">
              If a customer has missed doses for 3+ days, AI drafts a wellness check-in for staff approval.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Cake className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Birthday greeting</p>
            <p className="mt-1 text-[10px] admin-soft">
              On the customer&apos;s birthday, send a personalized greeting (+25 loyalty points).
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <CalendarClock className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Prescription expiring</p>
            <p className="mt-1 text-[10px] admin-soft">
              7 days before a prescription&apos;s endDate, remind the customer to consult their prescriber.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
            <Sparkles className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">AI promotion messages</p>
            <p className="mt-1 text-[10px] admin-soft">
              Monthly, AI suggests promotions for staff approval (flu season, allergy season, etc.).
            </p>
          </div>
        </div>
        <p className="mt-3 text-[10px] admin-soft">
          The cron endpoint <code className="md-code">/api/cron/reminders</code> runs every hour and
          dispatches any due reminders. The AI promotion cron runs daily at 06:00.
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
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] admin-soft">
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
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[r.status]}`}>
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
