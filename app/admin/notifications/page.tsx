import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PushSettingsPanel } from "@/app/components/admin/PushSettingsPanel";
import { PushEnablePanel } from "@/app/components/PushNotificationCenter";
import {
  Bell,
  Mail,
  Phone,
  MessageCircle,
  Megaphone,
  Pill,
  CalendarClock,
  Sparkles,
  MessageSquare,
} from "lucide-react";

export const metadata = { title: "Notifications" };

const channelIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  in_app: Bell,
  push: Bell,
  portal: MessageSquare,
};

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  refill: Pill,
  message: MessageSquare,
  reminder: CalendarClock,
  campaign: Megaphone,
  loyalty: Sparkles,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  sent: "bg-blue-500/15 text-blue-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  failed: "bg-rose-500/15 text-rose-600",
  opened: "bg-cyan-500/15 text-cyan-700",
  clicked: "bg-violet-500/15 text-violet-700",
};

export default async function AdminNotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [notifications, counts, pushDevices] = await Promise.all([
    prisma.notification.findMany({
      include: { customer: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.pushDevice.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  return (
    <AdminShell
      user={user}
      title="Notification center"
      subtitle="Outbound log + Firebase Cloud Messaging setup"
    >
      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        {counts.map((c) => (
          <div key={c.status} className="admin-stat px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[c.status] || "bg-slate-500/15 text-slate-600"}`}>
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold admin-text">{c._count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Outbound log */}
        <AdminPanel
          title="Outbound log"
          description={`${notifications.length} most recent notifications`}
          className="lg:col-span-2"
        >
          {notifications.length === 0 ? (
            <AdminEmptyState icon={Bell} title="No notifications sent yet" />
          ) : (
            <div className="overflow-x-auto scroll-admin">
              <table className="table-admin">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Channel</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => {
                    const ChannelIcon = channelIcon[n.channel] || Bell;
                    const TypeIcon = typeIcon[n.type] || Bell;
                    return (
                      <tr key={n.id}>
                        <td>
                          <p className="font-medium admin-text">{n.customer?.fullName || "—"}</p>
                          <p className="text-[10px] capitalize admin-soft">{n.type}</p>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] font-medium capitalize admin-muted">
                            <ChannelIcon className="h-2.5 w-2.5" /> {n.channel}
                          </span>
                        </td>
                        <td>
                          <p className="flex items-center gap-1.5 text-sm admin-text">
                            <TypeIcon className="h-3 w-3 admin-accent-text" />
                            <span className="truncate">{n.title}</span>
                          </p>
                          <p className="truncate text-xs admin-muted">{n.body}</p>
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[n.status] || "bg-slate-500/15 text-slate-600"}`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="text-xs admin-muted">
                          {new Date(n.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>

        {/* Push settings — explicit staff registration hotspot */}
        <div className="space-y-4">
          <PushEnablePanel audience="admin" />
          <PushSettingsPanel devices={pushDevices} />
        </div>
      </div>
    </AdminShell>
  );
}
