import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateReminderAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
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
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

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

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");
  const premiumActive = await hasPremiumPlan(pharmacyId);

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
      subtitle="Schedule refill, collection, and wellness reminders, then track delivery without losing the urgent work in the noise."
      actions={<ProcessRemindersButton />}
    >
      {!premiumActive && (
        <div className="mb-5">
          <PremiumFeatureNotice
            title="Free remembers what you tell it. Premium remembers for you."
            description="Manual reminders, medication-dose reminders and safety alerts stay available on Free. Premium adds automatic refill follow-ups, scheduled campaign automation and loyalty-driven follow-up."
            benefits={["Automatic refill nudges", "Campaign scheduling", "Loyalty follow-up"]}
          />
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-stat min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide admin-muted sm:text-xs">Scheduled</p>
              <p className="mt-1 text-2xl font-bold admin-text">{stats.scheduled}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <CalendarClock className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
        <div className="admin-stat min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide admin-muted sm:text-xs">Sent</p>
              <p className="mt-1 text-2xl font-bold admin-text">{stats.sent}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Mail className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
        <div className="admin-stat col-span-2 min-w-0 p-4 sm:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide admin-muted sm:text-xs">Failed</p>
              <p className="mt-1 text-2xl font-bold admin-text">{stats.failed}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Bell className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
      </div>

      <AdminPanel
        title="Automation coverage"
        description="What runs automatically and what still needs an intentional schedule."
        className="mb-6"
        action={
          <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <Zap className="h-3 w-3" /> Live
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
            <CalendarClock className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Due scheduled reminders</p>
            <p className="mt-1 text-xs admin-soft">Sends due reminders to patients who have agreed to receive them.</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
            <Sparkles className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Scheduled campaigns</p>
            <p className="mt-1 text-xs admin-soft">Starts campaigns when due while respecting patient marketing preferences.</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              premiumActive
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-[var(--admin-accent-soft)] admin-accent-text"
            }`}>
              {premiumActive ? "Active" : "Premium"}
            </span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
            <Mail className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Scheduled staff messages</p>
            <p className="mt-1 text-xs admin-soft">Sends staff messages at their scheduled time.</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
            <HeartPulse className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Low adherence alerts</p>
            <p className="mt-1 text-xs admin-soft">Alerts staff when adherence falls below 70% over 14 days, no more than once a week per prescription.</p>
            <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
          </div>
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
            <Cake className="h-4 w-4 admin-accent-text" />
            <p className="mt-2 text-sm font-semibold admin-text">Birthday greeting + points</p>
            <p className="mt-1 text-xs admin-soft">Birthday messages and rewards are managed automatically by the loyalty programme on Premium.</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              premiumActive
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-[var(--admin-accent-soft)] admin-accent-text"
            }`}>
              {premiumActive ? "Active" : "Premium"}
            </span>
          </div>
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 opacity-80">
            <Pill className="h-4 w-4 admin-soft" />
            <p className="mt-2 text-sm font-semibold admin-text">Refill follow-up</p>
            <p className="mt-1 text-xs admin-soft">
              Manual scheduling stays Free. Premium can automatically queue refill reminders before the patient runs out.
            </p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              premiumActive
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-slate-500/10 admin-muted"
            }`}>
              {premiumActive ? "Auto + manual" : "Manual on Free"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs admin-soft">
          Scheduled reminders are processed every five minutes. Use <strong>Process due now</strong> when you need the same jobs handled immediately.
        </p>
      </AdminPanel>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminPanel title="Schedule or send" description="Patient, message, channel, and timing in one flow">
          <ReminderForm action={adminCreateReminderAction} />
        </AdminPanel>

        <AdminPanel title="Delivery timeline" description={`${reminders.length} recent reminders`}>
          {reminders.length === 0 ? (
            <AdminEmptyState
              icon={CalendarClock}
              title="No reminders yet"
              description="Schedule your first reminder using the form."
            />
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => {
                const TypeIcon = TYPE_ICON[r.type] || Type;
                const ChannelIcon = CHANNEL_ICON[r.channel] || Bell;
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition-colors hover:border-[var(--admin-border-2)]"
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] admin-accent-text">
                          <TypeIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold admin-text">{r.title}</p>
                          <p className="truncate text-xs admin-muted">{r.customer.fullName}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs admin-soft">
                            <span className="inline-flex items-center gap-1 capitalize">
                              <ChannelIcon className="h-3 w-3" /> {r.channel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{r.type.replace("_", " ")}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatDateTime(r.scheduledFor)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLOR[r.status]}`}>
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
