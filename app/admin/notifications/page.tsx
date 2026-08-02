import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PushSettingsPanel } from "@/app/components/admin/PushSettingsPanel";
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
  pending: "bg-amber-500/15 text-amber-300",
  sent: "bg-blue-500/15 text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-rose-500/15 text-rose-300",
  opened: "bg-cyan-500/15 text-cyan-300",
  clicked: "bg-violet-500/15 text-violet-300",
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
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLOR[c.status] || "bg-slate-500/15 text-slate-300"}`}>
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white">{c._count}</p>
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
            <div className="overflow-x-auto scroll-thin-dark">
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
                          <p className="font-medium text-white">{n.customer?.fullName || "—"}</p>
                          <p className="text-[10px] capitalize text-[#ecfdf5]/45">{n.type}</p>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium capitalize text-[#ecfdf5]/70">
                            <ChannelIcon className="h-2.5 w-2.5" /> {n.channel}
                          </span>
                        </td>
                        <td>
                          <p className="flex items-center gap-1.5 text-sm text-white">
                            <TypeIcon className="h-3 w-3 text-[#2dd4bf]" />
                            <span className="truncate">{n.title}</span>
                          </p>
                          <p className="truncate text-xs text-[#ecfdf5]/55">{n.body}</p>
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[n.status] || "bg-slate-500/15 text-slate-300"}`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="text-xs text-[#ecfdf5]/55">
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

        {/* Push settings */}
        <PushSettingsPanel devices={pushDevices} />
      </div>
    </AdminShell>
  );
}
