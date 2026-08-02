import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateReminderAction, adminProcessRemindersAction } from "@/app/actions/admin";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
import ReminderForm from "@/app/components/admin/ReminderForm";
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
  scheduled: "bg-amber-500/15 text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-300",
  failed: "bg-rose-500/15 text-rose-300",
};

export default async function AdminRemindersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [reminders, customers] = await Promise.all([
    prisma.reminder.findMany({
      include: { customer: { select: { fullName: true } } },
      orderBy: { scheduledFor: "desc" },
      take: 50,
    }),
    prisma.customerProfile.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

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
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-sm font-semibold text-[#422006] transition hover:brightness-110"
          >
            <Zap className="h-4 w-4" /> Process due now
          </button>
        </form>
      }
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{stats.scheduled}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Sent</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.sent}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ecfdf5]/55">Failed</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{stats.failed}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Schedule reminder" description="Send a reminder to a customer at a specific time">
          <ReminderForm action={adminCreateReminderAction} customers={customers} />
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
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition hover:border-white/[0.12]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2dd4bf]/15 text-[#2dd4bf]">
                          <TypeIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{r.title}</p>
                          <p className="text-xs text-[#ecfdf5]/55">{r.customer.fullName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#ecfdf5]/45">
                            <span className="inline-flex items-center gap-0.5 capitalize">
                              <ChannelIcon className="h-2.5 w-2.5" /> {r.channel}
                            </span>
                            <span>·</span>
                            <span className="capitalize">{r.type.replace("_", " ")}</span>
                            <span>·</span>
                            <span>{new Date(r.scheduledFor).toLocaleString()}</span>
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
